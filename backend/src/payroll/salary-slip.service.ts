import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { StorageService } from '../storage/storage.service';
import { amountToWords } from '../common/utils/amount-to-words.util';

interface SlipData {
  // Business
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;

  // Employee
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  joiningDate: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;

  // Period
  month: string;

  // Attendance
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;

  // Earnings
  basicSalary: number;
  hra: number;
  allowances: number;
  overtimePay: number;
  bonus: number;
  grossSalary: number;

  // Deductions
  pfEmployee: number;
  esicEmployee: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;

  // Net
  netSalary: number;
}

@Injectable()
export class SalarySlipService {
  private readonly logger = new Logger(SalarySlipService.name);

  constructor(private readonly storage: StorageService) {}

  async generate(
    tenantId: string,
    payrollId: string,
    data: SlipData,
  ): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const lineColor = rgb(0.8, 0.8, 0.8);

    const draw = (
      text: string,
      x: number,
      y: number,
      f = font,
      size = 10,
      color = black,
    ) => {
      page.drawText(text, { x, y, font: f, size, color });
    };

    const drawLine = (y: number) => {
      page.drawLine({
        start: { x: 40, y },
        end: { x: width - 40, y },
        thickness: 0.5,
        color: lineColor,
      });
    };

    // Mask account number
    const maskedAccount = data.accountNumber
      ? 'XXXX' + data.accountNumber.slice(-4)
      : 'N/A';

    // === Header ===
    let y = height - 50;
    draw(data.businessName, 40, y, bold, 16);
    draw('SALARY SLIP', width - 180, y, bold, 14);
    y -= 15;
    if (data.businessAddress) draw(data.businessAddress, 40, y, font, 9, gray);
    draw(`Month: ${data.month}`, width - 180, y, font, 10, gray);
    y -= 12;
    if (data.businessPhone) draw(`Phone: ${data.businessPhone}`, 40, y, font, 9, gray);

    // === Separator ===
    y -= 15;
    drawLine(y);

    // === Employee Details ===
    y -= 20;
    draw(`Employee: ${data.employeeName}`, 40, y, bold, 10);
    draw(`Code: ${data.employeeCode}`, 300, y, font, 10);
    y -= 15;
    draw(`Designation: ${data.designation}`, 40, y, font, 10);
    draw(`Dept: ${data.department || 'N/A'}`, 300, y, font, 10);
    y -= 15;
    draw(`Joining: ${data.joiningDate}`, 40, y, font, 10);
    draw(`Bank: ${data.bankName || 'N/A'}`, 300, y, font, 10);
    y -= 15;
    draw(`Account: ${maskedAccount}`, 40, y, font, 10);
    draw(`IFSC: ${data.ifscCode || 'N/A'}`, 300, y, font, 10);

    y -= 15;
    drawLine(y);

    // === Earnings & Deductions Table ===
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
      ['Basic Salary', data.basicSalary],
      ['HRA', data.hra],
      ['Allowances', data.allowances],
      ['Overtime Pay', data.overtimePay],
      ['Bonus', data.bonus],
    ] as const;

    const deductionRows = [
      ['PF (Employee)', data.pfEmployee],
      ['ESIC', data.esicEmployee],
      ['TDS', data.tds],
      ['Other Deductions', data.otherDeductions],
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

    // === Totals ===
    y -= 10;
    drawLine(y);
    y -= 18;
    draw('Gross Salary', leftCol, y, bold, 10);
    draw(
      `₹ ${data.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      leftVal,
      y,
      bold,
      10,
    );
    draw('Total Deductions', rightCol, y, bold, 10);
    draw(
      `₹ ${data.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      rightVal,
      y,
      bold,
      10,
    );

    // === Net Salary Banner ===
    y -= 15;
    drawLine(y);
    y -= 25;
    const netText = `NET SALARY: ₹ ${data.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    draw(netText, width / 2 - 100, y, bold, 14);
    y -= 16;
    const words = amountToWords(data.netSalary);
    draw(words, width / 2 - 150, y, font, 9, gray);

    // === Attendance Summary Footer ===
    y -= 25;
    drawLine(y);
    y -= 18;
    draw(
      `Attendance: Present ${data.presentDays} | Absent ${data.absentDays} | Leave ${data.leaveDays} | Working Days: ${data.workingDays}`,
      40,
      y,
      font,
      9,
      gray,
    );
    y -= 12;
    draw('This is a system generated document.', 40, y, font, 8, gray);

    // === Save and Upload ===
    const pdfBytes = await pdfDoc.save();
    const key = `payroll/${tenantId}/${data.month}/${data.employeeCode}_slip.pdf`;

    const { url } = await this.storage.uploadFile({
      key,
      buffer: Buffer.from(pdfBytes),
      mimeType: 'application/pdf',
    });

    this.logger.log(`Salary slip generated: ${key}`);
    return url;
  }
}
