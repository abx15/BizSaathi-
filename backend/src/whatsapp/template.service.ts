import { Injectable } from '@nestjs/common';
import { TemplateComponent } from './meta-api.service';

export interface TemplateComponents {
  name: string;
  language: string;
  components: TemplateComponent[];
}

@Injectable()
export class TemplateService {
  
  // Template 1: invoice_sent
  // Meta template name: "bizsaathi_invoice_sent"
  // Variables: {{1}}=customerName, {{2}}=invoiceNumber, {{3}}=amount, {{4}}=dueDate
  buildInvoiceSentTemplate(params: {
    customerName: string;
    invoiceNumber: string;
    amount: string;          // "₹15,000"
    dueDate: string;         // "15 Feb 2025"
    pdfUrl: string;          // document URL
  }): TemplateComponents {
    return {
      name: 'bizsaathi_invoice_sent',
      language: 'en',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                link: params.pdfUrl,
                filename: `${params.invoiceNumber}.pdf`,
              },
            },
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customerName },
            { type: 'text', text: params.invoiceNumber },
            { type: 'text', text: params.amount },
            { type: 'text', text: params.dueDate },
          ],
        },
      ],
    };
  }

  // Template 2: payment_reminder
  // "bizsaathi_payment_reminder"
  // Variables: customerName, invoiceNumber, amount, daysPending
  buildPaymentReminderTemplate(params: {
    customerName: string;
    invoiceNumber: string;
    amount: string;
    daysPending: number;
  }): TemplateComponents {
    return {
      name: 'bizsaathi_payment_reminder',
      language: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customerName },
            { type: 'text', text: params.invoiceNumber },
            { type: 'text', text: params.amount },
            { type: 'text', text: String(params.daysPending) },
          ],
        },
      ],
    };
  }

  // Template 3: payment_received
  // "bizsaathi_payment_received"
  // Variables: customerName, invoiceNumber, amount, remainingBalance
  buildPaymentReceivedTemplate(params: {
    customerName: string;
    invoiceNumber: string;
    amount: string;
    remainingBalance: string;
  }): TemplateComponents {
    return {
      name: 'bizsaathi_payment_received',
      language: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customerName },
            { type: 'text', text: params.invoiceNumber },
            { type: 'text', text: params.amount },
            { type: 'text', text: params.remainingBalance },
          ],
        },
      ],
    };
  }

  // Template 4: otp_verification
  // "bizsaathi_otp"
  // Variables: otp, expiryMinutes
  buildOTPTemplate(params: {
    otp: string;
    expiryMinutes: number;
  }): TemplateComponents {
    return {
      name: 'bizsaathi_otp',
      language: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.otp },
            { type: 'text', text: String(params.expiryMinutes) },
          ],
        },
        {
          type: 'button',
          // Meta expects "button" component for copy_code with parameter type "text"
          index: 0,
          parameters: [
            {
              type: 'text',
              text: params.otp,
            },
          ],
        } as any,
      ],
    };
  }

  // Template 5: salary_slip_sent
  // "bizsaathi_salary_slip"
  // Variables: staffName, month, netSalary
  buildSalarySlipTemplate(params: {
    staffName: string;
    month: string;
    netSalary: string;
    pdfUrl: string;
  }): TemplateComponents {
    return {
      name: 'bizsaathi_salary_slip',
      language: 'en',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                link: params.pdfUrl,
                filename: `SalarySlip_${params.month.replace('-', '_')}.pdf`,
              },
            },
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.staffName },
            { type: 'text', text: params.month },
            { type: 'text', text: params.netSalary },
          ],
        },
      ],
    };
  }

  // Template 6: followup_reminder (sent to business owner)
  // "bizsaathi_followup_reminder"
  // Variables: leadTitle, contactName, dueTime
  buildFollowupReminderTemplate(params: {
    leadTitle: string;
    contactName: string;
    dueTime: string;
  }): TemplateComponents {
    return {
      name: 'bizsaathi_followup_reminder',
      language: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.leadTitle },
            { type: 'text', text: params.contactName },
            { type: 'text', text: params.dueTime },
          ],
        },
      ],
    };
  }
}
