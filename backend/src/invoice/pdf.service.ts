import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'bizsaathi-files';

    if (accountId && accessKeyId && secretAccessKey && accountId !== 'your_account_id') {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('Cloudflare R2 client initialized');
    } else {
      this.logger.warn('Cloudflare R2 credentials not found or default. Using local /tmp storage.');
    }
  }

  async generateInvoicePdf(invoice: any, tenant: any, customer: any): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const drawText = (text: string, x: number, y: number, font = helvetica, size = 12) => {
      page.drawText(text, { x, y, font, size, color: rgb(0, 0, 0) });
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
    for (const item of invoice.items) {
      drawText(item.name, 50, currentY, helvetica, 10);
      drawText(`${item.quantity} ${item.unit}`, 250, currentY, helvetica, 10);
      drawText(item.rate.toString(), 300, currentY, helvetica, 10);
      drawText(`${item.gstRate}%`, 380, currentY, helvetica, 10);
      drawText(item.amount.toString(), 450, currentY, helvetica, 10);
      currentY -= 20;
    }

    const totalsY = currentY - 50;
    drawText(`Subtotal: Rs ${invoice.subtotal.toString()}`, 350, totalsY, helvetica, 12);
    drawText(`CGST: Rs ${invoice.totalCgst.toString()}`, 350, totalsY - 15, helvetica, 12);
    drawText(`SGST: Rs ${invoice.totalSgst.toString()}`, 350, totalsY - 30, helvetica, 12);
    drawText(`IGST: Rs ${invoice.totalIgst.toString()}`, 350, totalsY - 45, helvetica, 12);
    drawText(`Total: Rs ${invoice.totalAmount.toString()}`, 350, totalsY - 65, helveticaBold, 14);

    const pdfBytes = await pdfDoc.save();
    const fileName = `invoices/${tenant.id}/${invoice.invoiceNumber}.pdf`;

    if (this.s3Client) {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: pdfBytes,
        ContentType: 'application/pdf',
      }));
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });
      return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    } else {
      const tmpPath = path.join(os.tmpdir(), `${invoice.invoiceNumber}.pdf`);
      fs.writeFileSync(tmpPath, pdfBytes);
      return `file://${tmpPath}`;
    }
  }
}
