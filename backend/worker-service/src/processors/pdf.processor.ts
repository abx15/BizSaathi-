import { Job, Queue } from 'bullmq';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db';
import { logger } from '../logger';
import { config } from '../config';
import { redisConnection } from '../redis';
import { withRetry } from '../utils/retry';
import { amountToWords } from '../utils/amount-to-words';

// Initialize R2 Storage Client or local fallback
let s3Client: S3Client | null = null;
const isLocalFallback = config.r2.accessKeyId === 'mock_r2_access_key' || !config.r2.accessKeyId;

if (!isLocalFallback) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  });
  logger.info('Cloudflare R2 Client initialized in PDF Processor');
} else {
  logger.warn('Cloudflare R2 credentials missing. PDF Processor using LOCAL FALLBACK storage.');
}

async function uploadPdfFile(key: string, buffer: Buffer, mimeType = 'application/pdf'): Promise<string> {
  if (isLocalFallback) {
    const localUploadPath = path.resolve(__dirname, '../../../uploads');
    const fullPath = path.join(localUploadPath, key);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
    return `http://localhost:3001/uploads/${key}`;
  }

  if (!s3Client) throw new Error('S3 Client not initialized');

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  if (config.r2.publicUrl) {
    return `${config.r2.publicUrl}/${key}`;
  } else {
    const command = new GetObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn: 86400 }); // 24h presigned
  }
}

export async function processPdfJob(job: Job): Promise<any> {
  const { name, data } = job;
  logger.info({ jobId: job.id, name, data }, 'Processing PDF generation job');

  switch (name) {
    case 'pdf:invoice:generate': {
      const { invoiceId, tenantId, regenerate } = data;

      // 1. Fetch invoice and related data
      const invoiceRes = await db.query('SELECT * FROM "Invoice" WHERE id = $1 AND "tenantId" = $2', [invoiceId, tenantId]);
      if (invoiceRes.rows.length === 0) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }
      const invoice = invoiceRes.rows[0];

      // If already generated and not forcing regeneration, skip
      if (invoice.pdfUrl && !regenerate) {
        logger.info({ invoiceId }, 'Invoice PDF already generated, skipping new generation');
        return { pdfUrl: invoice.pdfUrl };
      }

      const tenantRes = await db.query('SELECT * FROM "Tenant" WHERE id = $1', [tenantId]);
      if (tenantRes.rows.length === 0) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }
      const tenant = tenantRes.rows[0];

      const customerRes = await db.query('SELECT * FROM "Customer" WHERE id = $1', [invoice.customerId]);
      if (customerRes.rows.length === 0) {
        throw new Error(`Customer not found: ${invoice.customerId}`);
      }
      const customer = customerRes.rows[0];

      const itemsRes = await db.query('SELECT * FROM "InvoiceItem" WHERE "invoiceId" = $1 ORDER BY id ASC', [invoiceId]);
      const items = itemsRes.rows;

      // 2. Generate PDF Document using pdf-lib
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const drawText = (text: string, x: number, y: number, font = helvetica, size = 12) => {
        page.drawText(text || '', { x, y, font, size, color: rgb(0, 0, 0) });
      };

      drawText('TAX INVOICE', width - 150, height - 50, helveticaBold, 18);
      drawText(tenant.name || 'Business Name', 50, height - 50, helveticaBold, 16);
      drawText(`GSTIN: ${tenant.gstNumber || 'N/A'}`, 50, height - 70, helvetica, 10);
      drawText(`Address: ${tenant.address || 'N/A'}`, 50, height - 85, helvetica, 10);

      drawText(`Invoice No: ${invoice.invoiceNumber}`, 50, height - 120, helveticaBold, 12);
      drawText(`Date: ${new Date(invoice.invoiceDate).toISOString().split('T')[0]}`, 50, height - 135, helvetica, 10);

      drawText('Billed To:', width - 250, height - 120, helveticaBold, 12);
      drawText(customer.name, width - 250, height - 135, helvetica, 10);
      drawText(`GSTIN: ${customer.gstin || 'N/A'}`, width - 250, height - 150, helvetica, 10);
      
      const startY = height - 200;
      drawText('Item', 50, startY, helveticaBold, 10);
      drawText('Qty', 250, startY, helveticaBold, 10);
      drawText('Rate', 300, startY, helveticaBold, 10);
      drawText('GST %', 380, startY, helveticaBold, 10);
      drawText('Amount', 450, startY, helveticaBold, 10);

      let currentY = startY - 20;
      for (const item of items) {
        drawText(item.name, 50, currentY, helvetica, 10);
        drawText(`${item.quantity} ${item.unit}`, 250, currentY, helvetica, 10);
        drawText(Number(item.rate).toFixed(2), 300, currentY, helvetica, 10);
        drawText(`${item.gstRate}%`, 380, currentY, helvetica, 10);
        drawText(Number(item.amount).toFixed(2), 450, currentY, helvetica, 10);
        currentY -= 20;
      }

      const totalsY = currentY - 50;
      drawText(`Subtotal: Rs ${Number(invoice.subtotal).toFixed(2)}`, 350, totalsY, helvetica, 12);
      drawText(`CGST: Rs ${Number(invoice.totalCgst).toFixed(2)}`, 350, totalsY - 15, helvetica, 12);
      drawText(`SGST: Rs ${Number(invoice.totalSgst).toFixed(2)}`, 350, totalsY - 30, helvetica, 12);
      drawText(`IGST: Rs ${Number(invoice.totalIgst).toFixed(2)}`, 350, totalsY - 45, helvetica, 12);
      drawText(`Total: Rs ${Number(invoice.totalAmount).toFixed(2)}`, 350, totalsY - 65, helveticaBold, 14);

      const pdfBytes = await pdfDoc.save();
      const fileKey = `invoices/${tenantId}/${invoice.invoiceNumber}.pdf`;

      // 3. Upload file
      const finalPdfUrl = await uploadPdfFile(fileKey, Buffer.from(pdfBytes));

      // 4. Update Database
      await withRetry(async () => {
        await db.query(
          `UPDATE "Invoice" SET "pdfUrl" = $1, "updatedAt" = NOW() WHERE id = $2 AND "tenantId" = $3`,
          [finalPdfUrl, invoiceId, tenantId]
        );
      });

      // 5. Cache in Redis for 24 hours
      await redisConnection.setex(`invoice:pdf:${invoiceId}`, 86400, finalPdfUrl);

      // 6. Chain WhatsApp sending if status is SENT and customer phone is available
      if (invoice.status === 'SENT' && customer.phone) {
        const whatsappQueue = new Queue('whatsapp', { connection: redisConnection });
        await whatsappQueue.add('whatsapp:invoice:send', {
          invoiceId,
          tenantId,
          phone: customer.phone,
          pdfUrl: finalPdfUrl,
        });
        logger.info({ invoiceId, phone: customer.phone }, 'Chained WhatsApp invoice send job');
      }

      // 7. Emit Realtime event
      const notificationQueue = new Queue('notification', { connection: redisConnection });
      await notificationQueue.add('notification:realtime:push', {
        tenantId,
        eventType: 'invoice:pdf:generated',
        eventPayload: {
          invoiceId,
          pdfUrl: finalPdfUrl,
        },
      });

      logger.info({ invoiceId, finalPdfUrl }, 'Invoice PDF generation complete');
      return { pdfUrl: finalPdfUrl };
    }

    case 'pdf:salary-slip:generate': {
      const { payrollId, tenantId, staffId, month } = data;

      // 1. Fetch Payroll and Staff details
      const payrollRes = await db.query('SELECT * FROM "Payroll" WHERE id = $1 AND "tenantId" = $2', [payrollId, tenantId]);
      if (payrollRes.rows.length === 0) {
        throw new Error(`Payroll record not found: ${payrollId}`);
      }
      const payroll = payrollRes.rows[0];

      const staffRes = await db.query('SELECT * FROM "Staff" WHERE id = $1 AND "tenantId" = $2', [staffId, tenantId]);
      if (staffRes.rows.length === 0) {
        throw new Error(`Staff member not found: ${staffId}`);
      }
      const staff = staffRes.rows[0];

      const tenantRes = await db.query('SELECT * FROM "Tenant" WHERE id = $1', [tenantId]);
      if (tenantRes.rows.length === 0) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }
      const tenant = tenantRes.rows[0];

      // 2. Generate PDF Document using pdf-lib
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const black = rgb(0, 0, 0);
      const gray = rgb(0.4, 0.4, 0.4);
      const lineColor = rgb(0.8, 0.8, 0.8);

      const draw = (text: string, x: number, y: number, f = font, size = 10, color = black) => {
        page.drawText(text || '', { x, y, font: f, size, color });
      };

      const drawLine = (y: number) => {
        page.drawLine({
          start: { x: 40, y },
          end: { x: width - 40, y },
          thickness: 0.5,
          color: lineColor,
        });
      };

      const maskedAccount = staff.accountNumber
        ? 'XXXX' + String(staff.accountNumber).slice(-4)
        : 'N/A';

      // Header
      let y = height - 50;
      draw(tenant.name || 'Business Name', 40, y, bold, 16);
      draw('SALARY SLIP', width - 180, y, bold, 14);
      y -= 15;
      if (tenant.address) draw(tenant.address, 40, y, font, 9, gray);
      draw(`Month: ${payroll.month}`, width - 180, y, font, 10, gray);
      y -= 12;
      if (tenant.phone) draw(`Phone: ${tenant.phone}`, 40, y, font, 9, gray);

      y -= 15;
      drawLine(y);

      // Employee Details
      y -= 20;
      draw(`Employee: ${staff.name}`, 40, y, bold, 10);
      draw(`Code: ${staff.employeeCode}`, 300, y, font, 10);
      y -= 15;
      draw(`Designation: ${staff.role}`, 40, y, font, 10);
      draw(`Dept: ${staff.department || 'N/A'}`, 300, y, font, 10);
      y -= 15;
      draw(`Joining: ${staff.joiningDate ? new Date(staff.joiningDate).toISOString().split('T')[0] : 'N/A'}`, 40, y, font, 10);
      draw(`Bank: ${staff.bankName || 'N/A'}`, 300, y, font, 10);
      y -= 15;
      draw(`Account: ${maskedAccount}`, 40, y, font, 10);
      draw(`IFSC: ${staff.ifscCode || 'N/A'}`, 300, y, font, 10);

      y -= 15;
      drawLine(y);

      // Table layout
      y -= 20;
      const leftCol = 60;
      const leftVal = 220;
      const rightCol = 320;
      const rightVal = 480;

      draw('EARNINGS', leftCol, y, bold, 11);
      draw('DEDUCTIONS', rightCol, y, bold, 11);
      y -= 5;
      drawLine(y);

      const earningsRows = [
        ['Basic Salary', Number(payroll.basicSalary)],
        ['HRA', Number(payroll.hra)],
        ['Allowances', Number(payroll.allowances)],
        ['Overtime Pay', Number(payroll.overtimePay)],
        ['Bonus', Number(payroll.bonus)],
      ] as const;

      const deductionRows = [
        ['PF (Employee)', Number(payroll.pfEmployee)],
        ['ESIC', Number(payroll.esicEmployee)],
        ['TDS', Number(payroll.tds)],
        ['Other Deductions', Number(payroll.otherDeductions)],
      ] as const;

      const maxRows = Math.max(earningsRows.length, deductionRows.length);
      for (let i = 0; i < maxRows; i++) {
        y -= 18;
        if (i < earningsRows.length) {
          draw(earningsRows[i][0], leftCol, y, font, 10);
          draw(
            `₹ ${Number(earningsRows[i][1]).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            leftVal,
            y,
            font,
            10,
          );
        }
        if (i < deductionRows.length) {
          draw(deductionRows[i][0], rightCol, y, font, 10);
          draw(
            `₹ ${Number(deductionRows[i][1]).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            rightVal,
            y,
            font,
            10,
          );
        }
      }

      y -= 10;
      drawLine(y);
      y -= 18;
      draw('Gross Salary', leftCol, y, bold, 10);
      draw(
        `₹ ${Number(payroll.grossSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        leftVal,
        y,
        bold,
        10,
      );
      draw('Total Deductions', rightCol, y, bold, 10);
      draw(
        `₹ ${Number(payroll.totalDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        rightVal,
        y,
        bold,
        10,
      );

      y -= 15;
      drawLine(y);
      y -= 25;
      const netSalaryNum = Number(payroll.netSalary);
      const netText = `NET SALARY: ₹ ${netSalaryNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      draw(netText, width / 2 - 100, y, bold, 14);
      y -= 16;
      const words = amountToWords(netSalaryNum);
      draw(words, width / 2 - 150, y, font, 9, gray);

      y -= 25;
      drawLine(y);
      y -= 18;
      draw(
        `Attendance: Present ${payroll.presentDays} | Absent ${payroll.absentDays} | Leave ${payroll.leaveDays} | Working Days: ${payroll.workingDays}`,
        40,
        y,
        font,
        9,
        gray,
      );
      y -= 12;
      draw('This is a system generated document.', 40, y, font, 8, gray);

      const pdfBytes = await pdfDoc.save();
      const fileKey = `payroll/${tenantId}/${payroll.month}/${staff.employeeCode}_slip.pdf`;

      // 3. Upload file
      const finalSlipUrl = await uploadPdfFile(fileKey, Buffer.from(pdfBytes));

      // 4. Update Database
      await withRetry(async () => {
        await db.query(
          `UPDATE "Payroll" SET "slipUrl" = $1, "updatedAt" = NOW() WHERE id = $2 AND "tenantId" = $3`,
          [finalSlipUrl, payrollId, tenantId]
        );
      });

      // 5. Emit Realtime event
      const notificationQueue = new Queue('notification', { connection: redisConnection });
      await notificationQueue.add('notification:realtime:push', {
        tenantId,
        eventType: 'payroll:slip:generated',
        eventPayload: {
          payrollId,
          slipUrl: finalSlipUrl,
        },
      });

      logger.info({ payrollId, finalSlipUrl }, 'Salary slip PDF generation complete');
      return { slipUrl: finalSlipUrl };
    }

    default:
      throw new Error(`Unknown job name in PDF queue: ${name}`);
  }
}
