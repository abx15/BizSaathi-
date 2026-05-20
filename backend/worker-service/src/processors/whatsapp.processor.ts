import { Job, Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { logger } from '../logger';
import { config } from '../config';
import { redisConnection } from '../redis';
import { withRetry } from '../utils/retry';

// Helper to save outbound message details in the PostgreSQL database
async function saveMessage(params: {
  tenantId: string;
  phone: string;
  type: string;
  content: any;
  templateName?: string;
  entityType?: string;
  entityId?: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: Date;
}) {
  try {
    const id = randomUUID();
    await db.query(
      `INSERT INTO "WhatsAppMessage" (
        "id", "tenantId", "direction", "phone", "messageId", "type", "content", 
        "templateName", "entityType", "entityId", "status", "errorCode", "errorMessage", "sentAt", "createdAt"
      ) VALUES ($1, $2, 'OUTBOUND', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
      [
        id,
        params.tenantId,
        params.phone,
        params.messageId || null,
        params.type,
        JSON.stringify(params.content),
        params.templateName || null,
        params.entityType || null,
        params.entityId || null,
        params.status,
        params.errorCode || null,
        params.errorMessage || null,
        params.sentAt || null,
      ]
    );
    logger.debug({ id, phone: params.phone, status: params.status }, 'Saved WhatsAppMessage log to database');
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to save WhatsAppMessage log to database');
  }
}

export async function processWhatsappJob(job: Job): Promise<any> {
  const { name, data } = job;
  logger.info({ jobId: job.id, name, data }, 'Processing WhatsApp job');

  const tenantId = data.tenantId || 'global';
  const phone = data.phone;
  const entityType = data.invoiceId ? 'invoice' : (data.otp ? 'otp' : undefined);
  const entityId = data.invoiceId || data.otpId || undefined;

  if (!phone) {
    logger.error({ data }, 'Recipient phone number is missing in job data');
    throw new Error('Phone number is required for WhatsApp message');
  }

  // 1. Redis-backed daily rate limit check (per phone)
  const today = new Date().toISOString().split('T')[0];
  const rateLimitKey = `wa:rate:${tenantId}:${phone}:daily`;
  
  const currentCount = await redisConnection.incr(rateLimitKey);
  if (currentCount === 1) {
    await redisConnection.expire(rateLimitKey, 86400); // 24 hours TTL
  }

  const dailyLimit = 250;
  if (currentCount > dailyLimit) {
    logger.warn(
      { tenantId, phone, currentCount, dailyLimit },
      'WhatsApp daily rate limit exceeded for this tenant phone'
    );
    await saveMessage({
      tenantId,
      phone,
      type: 'template',
      content: { error: 'Rate limit exceeded' },
      templateName: name.split(':')[1],
      entityType,
      entityId,
      status: 'FAILED',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      errorMessage: `WhatsApp daily rate limit of ${dailyLimit} exceeded for phone ${phone}`,
    });
    throw new Error(`WhatsApp daily rate limit of ${dailyLimit} exceeded for phone ${phone}`);
  }

  // 2. Perform message dispatch based on template types
  switch (name) {
    case 'whatsapp:otp:send': {
      const { otp, expiryMinutes } = data;
      const template = {
        name: 'otp_verification',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: otp },
              { type: 'text', text: String(expiryMinutes) },
            ],
          },
        ],
      };

      if (config.whatsapp.accessToken === 'mock_token') {
        const mockMsgId = `wamid.mock_${randomUUID().replace(/-/g, '')}`;
        logger.info(`[MOCK WHATSAPP] OTP of ${otp} sent to ${phone}. Expires in ${expiryMinutes}m.`);
        await saveMessage({
          tenantId,
          phone,
          type: 'template',
          content: template,
          templateName: template.name,
          entityType,
          entityId,
          status: 'SENT',
          messageId: mockMsgId,
          sentAt: new Date(),
        });
        return { sent: true, messageId: mockMsgId };
      }

      await withRetry(async () => {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.whatsapp.accessToken}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'template',
              template,
            }),
          }
        );

        const resBody: any = await response.json();
        if (!response.ok || resBody.error) {
          const err = resBody.error || {};
          const code = err.code;
          const message = err.message || response.statusText;

          // Graceful handling of opt-out (131026) and 24-hour window errors (131047)
          if (code === 131026 || code === 131047) {
            logger.warn({ code, message, phone }, 'Meta Cloud API gracefully handled error, marking job complete');
            await saveMessage({
              tenantId,
              phone,
              type: 'template',
              content: resBody,
              templateName: template.name,
              entityType,
              entityId,
              status: 'FAILED',
              errorCode: String(code),
              errorMessage: message,
            });
            return { sent: false, errorCode: code, errorMessage: message };
          }
          throw new Error(`Meta Cloud API WhatsApp OTP failed: [code ${code}]: ${message}`);
        }

        const messageId = resBody.messages?.[0]?.id;
        await saveMessage({
          tenantId,
          phone,
          type: 'template',
          content: resBody,
          templateName: template.name,
          entityType,
          entityId,
          status: 'SENT',
          messageId,
          sentAt: new Date(),
        });
      });
      return { sent: true };
    }

    case 'whatsapp:invoice:send': {
      const { invoiceId, pdfUrl } = data;
      const template = {
        name: 'invoice_notification',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: invoiceId },
              { type: 'text', text: pdfUrl || 'https://bizsaathi.in' },
            ],
          },
        ],
      };

      if (config.whatsapp.accessToken === 'mock_token') {
        const mockMsgId = `wamid.mock_${randomUUID().replace(/-/g, '')}`;
        logger.info(`[MOCK WHATSAPP] Invoice ${invoiceId} sent to ${phone}. PDF URL: ${pdfUrl}`);
        await saveMessage({
          tenantId,
          phone,
          type: 'template',
          content: template,
          templateName: template.name,
          entityType: 'invoice',
          entityId: invoiceId,
          status: 'SENT',
          messageId: mockMsgId,
          sentAt: new Date(),
        });
        return { sent: true, messageId: mockMsgId };
      }

      await withRetry(async () => {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.whatsapp.accessToken}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'template',
              template,
            }),
          }
        );

        const resBody: any = await response.json();
        if (!response.ok || resBody.error) {
          const err = resBody.error || {};
          const code = err.code;
          const message = err.message || response.statusText;

          if (code === 131026 || code === 131047) {
            logger.warn({ code, message, phone }, 'Meta Cloud API gracefully handled error, marking job complete');
            await saveMessage({
              tenantId,
              phone,
              type: 'template',
              content: resBody,
              templateName: template.name,
              entityType: 'invoice',
              entityId: invoiceId,
              status: 'FAILED',
              errorCode: String(code),
              errorMessage: message,
            });
            return { sent: false, errorCode: code, errorMessage: message };
          }
          throw new Error(`Meta Cloud API WhatsApp Invoice failed: [code ${code}]: ${message}`);
        }

        const messageId = resBody.messages?.[0]?.id;
        await saveMessage({
          tenantId,
          phone,
          type: 'template',
          content: resBody,
          templateName: template.name,
          entityType: 'invoice',
          entityId: invoiceId,
          status: 'SENT',
          messageId,
          sentAt: new Date(),
        });
      });
      return { sent: true };
    }

    case 'whatsapp:reminder:send': {
      const { invoiceId, customerName, amount, daysPending } = data;
      const template = {
        name: 'invoice_reminder',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: customerName },
              { type: 'text', text: invoiceId },
              { type: 'text', text: amount },
              { type: 'text', text: String(daysPending) },
            ],
          },
        ],
      };

      if (config.whatsapp.accessToken === 'mock_token') {
        const mockMsgId = `wamid.mock_${randomUUID().replace(/-/g, '')}`;
        logger.info(
          `[MOCK WHATSAPP] Overdue reminder sent to ${customerName} (${phone}) for Invoice ${invoiceId}. Pending amount: ${amount}, Overdue: ${daysPending} days.`
        );
        await saveMessage({
          tenantId,
          phone,
          type: 'template',
          content: template,
          templateName: template.name,
          entityType: 'invoice',
          entityId: invoiceId,
          status: 'SENT',
          messageId: mockMsgId,
          sentAt: new Date(),
        });
        return { sent: true, messageId: mockMsgId };
      }

      await withRetry(async () => {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.whatsapp.accessToken}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'template',
              template,
            }),
          }
        );

        const resBody: any = await response.json();
        if (!response.ok || resBody.error) {
          const err = resBody.error || {};
          const code = err.code;
          const message = err.message || response.statusText;

          if (code === 131026 || code === 131047) {
            logger.warn({ code, message, phone }, 'Meta Cloud API gracefully handled error, marking job complete');
            await saveMessage({
              tenantId,
              phone,
              type: 'template',
              content: resBody,
              templateName: template.name,
              entityType: 'invoice',
              entityId: invoiceId,
              status: 'FAILED',
              errorCode: String(code),
              errorMessage: message,
            });
            return { sent: false, errorCode: code, errorMessage: message };
          }
          throw new Error(`Meta Cloud API WhatsApp Reminder failed: [code ${code}]: ${message}`);
        }

        const messageId = resBody.messages?.[0]?.id;
        await saveMessage({
          tenantId,
          phone,
          type: 'template',
          content: resBody,
          templateName: template.name,
          entityType: 'invoice',
          entityId: invoiceId,
          status: 'SENT',
          messageId,
          sentAt: new Date(),
        });
      });
      return { sent: true };
    }

    case 'whatsapp:bulk:reminder': {
      const { invoiceIds, daysOverdue } = data;
      logger.info({ tenantId, invoiceIds, daysOverdue }, 'Processing bulk WhatsApp overdue reminders');

      // For bulk event processing, we read invoices and queue individual reminders
      const invoicesResult = await db.query(
        `SELECT i.id, i."totalAmount", c.name as "customerName", c.phone as "customerPhone"
         FROM "Invoice" i
         JOIN "Customer" c ON i."customerId" = c.id
         WHERE i.id = ANY($1) AND c.phone IS NOT NULL`,
        [invoiceIds]
      );

      const whatsappQueue = new Queue('whatsapp', { connection: redisConnection });
      let queuedCount = 0;

      for (const inv of invoicesResult.rows) {
        await whatsappQueue.add('whatsapp:reminder:send', {
          invoiceId: inv.id,
          tenantId,
          phone: inv.customerPhone,
          customerName: inv.customerName,
          amount: String(inv.totalAmount),
          daysPending: daysOverdue,
        });
        queuedCount++;
      }

      logger.info({ queuedCount }, 'Successfully queued bulk individual WhatsApp reminders');
      return { processed: queuedCount };
    }

    default:
      throw new Error(`Unknown job name in WhatsApp queue: ${name}`);
  }
}
