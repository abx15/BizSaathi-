import { Job } from 'bullmq';
import { logger } from '../logger';
import { config } from '../config';
import { withRetry } from '../utils/retry';

export async function processEmailJob(job: Job): Promise<any> {
  const { name, data } = job;
  logger.info({ jobId: job.id, name, data }, 'Processing Email job');

  switch (name) {
    case 'email:otp:send': {
      const { email, otp, expiryMinutes } = data;
      logger.info({ email, otp }, 'Sending OTP email');
      
      await withRetry(async () => {
        // Send email via Resend API or mock in development
        if (config.resend.apiKey === 're_mock_key') {
          logger.info(`[MOCK EMAIL] OTP of ${otp} sent to ${email}. Expires in ${expiryMinutes} minutes.`);
        } else {
          // Perform real fetch/request to Resend API
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.resend.apiKey}`,
            },
            body: JSON.stringify({
              from: config.resend.from,
              to: email,
              subject: 'Your BizSaathi OTP Verification Code',
              html: `<p>Your verification code is <strong>${otp}</strong>. It expires in ${expiryMinutes} minutes.</p>`,
            }),
          });
          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Resend email sending failed: ${response.statusText} - ${errBody}`);
          }
        }
      });
      return { sent: true };
    }

    case 'email:invoice:send': {
      const { recipientEmail, invoiceId, pdfUrl } = data;
      logger.info({ recipientEmail, invoiceId, pdfUrl }, 'Sending Invoice email');

      await withRetry(async () => {
        if (config.resend.apiKey === 're_mock_key') {
          logger.info(`[MOCK EMAIL] Invoice ${invoiceId} sent to ${recipientEmail}. PDF: ${pdfUrl}`);
        } else {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.resend.apiKey}`,
            },
            body: JSON.stringify({
              from: config.resend.from,
              to: recipientEmail,
              subject: `Your Invoice #${invoiceId} from BizSaathi`,
              html: `<p>Hello,</p><p>Please find your invoice #${invoiceId} details below.</p><p><a href="${pdfUrl}">Click here to view/download your invoice PDF</a></p>`,
            }),
          });
          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Resend invoice email failed: ${response.statusText} - ${errBody}`);
          }
        }
      });
      return { sent: true };
    }

    case 'email:payslip:send': {
      const { recipientEmail, payrollId, pdfUrl } = data;
      logger.info({ recipientEmail, payrollId, pdfUrl }, 'Sending Payslip email');

      await withRetry(async () => {
        if (config.resend.apiKey === 're_mock_key') {
          logger.info(`[MOCK EMAIL] Payslip for payroll ${payrollId} sent to ${recipientEmail}. Slip PDF: ${pdfUrl}`);
        } else {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.resend.apiKey}`,
            },
            body: JSON.stringify({
              from: config.resend.from,
              to: recipientEmail,
              subject: `Your Salary Payslip from BizSaathi`,
              html: `<p>Hello,</p><p>Your salary slip has been generated.</p><p><a href="${pdfUrl}">Click here to download your salary slip PDF</a></p>`,
            }),
          });
          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Resend payslip email failed: ${response.statusText} - ${errBody}`);
          }
        }
      });
      return { sent: true };
    }

    case 'email:welcome:send': {
      const { email, businessName } = data;
      logger.info({ email, businessName }, 'Sending Welcome email');

      await withRetry(async () => {
        if (config.resend.apiKey === 're_mock_key') {
          logger.info(`[MOCK EMAIL] Welcome email sent to ${email} for business ${businessName}.`);
        } else {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.resend.apiKey}`,
            },
            body: JSON.stringify({
              from: config.resend.from,
              to: email,
              subject: 'Welcome to BizSaathi!',
              html: `<h1>Welcome to BizSaathi!</h1><p>We are excited to help you manage your business, ${businessName}.</p>`,
            }),
          });
          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Resend welcome email failed: ${response.statusText} - ${errBody}`);
          }
        }
      });
      return { sent: true };
    }

    default:
      throw new Error(`Unknown job name in Email queue: ${name}`);
  }
}
