import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { MetaWebhookPayload, IncomingMessage } from './types';
import { pool } from '../db/db';
import { botService } from '../bot/bot.service';

/**
 * Validates Meta X-Hub-Signature-256 HMAC header
 */
export function verifySignature(rawBody: string | Buffer, signature: string, appSecret: string): boolean {
  if (!signature) return false;
  try {
    const expected = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    const received = signature.replace('sha256=', '');
    
    // Convert both to buffers of the same size to prevent timing attacks
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    
    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    logger.error('Signature verification error', error);
    return false;
  }
}

export const postWebhookHandler = async (
  req: FastifyRequest<{ Body: MetaWebhookPayload }>,
  reply: FastifyReply,
) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = (req as any).rawBody;

  // 1. Signature Verification
  if (!signature || !rawBody) {
    logger.warn('Webhook POST rejected: Missing X-Hub-Signature-256 or rawBody');
    return reply.status(403).send('Forbidden: Signature missing');
  }

  const isVerified = verifySignature(rawBody, signature, config.WHATSAPP_APP_SECRET);
  if (!isVerified) {
    logger.warn('Webhook POST rejected: Invalid X-Hub-Signature-256');
    return reply.status(403).send('Forbidden: Invalid signature');
  }

  const payload = req.body;

  // 2. Always return 200 immediately to respect Meta's <20s rule
  reply.status(200).send('OK');

  // 3. Process the payload asynchronously
  // We wrap it in a try-catch to prevent unhandled promise rejections crashing the node server
  Promise.resolve().then(async () => {
    try {
      if (!payload.entry || payload.entry.length === 0) return;

      for (const entry of payload.entry) {
        if (!entry.changes || entry.changes.length === 0) continue;

        for (const change of entry.changes) {
          const value = change.value;
          if (!value || value.messaging_product !== 'whatsapp') continue;

          // Process statuses (delivery / read receipts)
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              await handleStatusUpdate(status);
            }
          }

          // Process messages
          if (value.messages && value.messages.length > 0) {
            const contactName = value.contacts?.[0]?.profile?.name || 'Customer';
            for (const msg of value.messages) {
              const parsedMessage: IncomingMessage = {
                id: msg.id,
                from: msg.from,
                senderName: contactName,
                timestamp: msg.timestamp,
                type: msg.type,
                businessPhoneNumberId: value.metadata.phone_number_id,
              };

              if (msg.type === 'text' && msg.text) {
                parsedMessage.text = msg.text.body;
              } else if (msg.type === 'interactive' && msg.interactive) {
                parsedMessage.interactive = {
                  type: msg.interactive.type,
                  id: msg.interactive.button_reply?.id || msg.interactive.list_reply?.id || '',
                  title: msg.interactive.button_reply?.title || msg.interactive.list_reply?.title || '',
                };
              }

              // Route parsed message to bot engine
              await botService.handleIncomingMessage(parsedMessage);
            }
          }
        }
      }
    } catch (err: any) {
      logger.error('Error processing WhatsApp webhook event asynchronously', err);
    }
  });
};

/**
 * Handle delivery receipt status updates (sent, delivered, read, failed)
 */
async function handleStatusUpdate(status: {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string }[];
}) {
  const metaMsgId = status.id;
  const statusUpper = status.status.toUpperCase();
  const timestampDate = new Date(parseInt(status.timestamp, 10) * 1000);

  logger.info(`Status update received for message: ${metaMsgId} -> ${statusUpper}`, {
    recipient: status.recipient_id,
  });

  try {
    let query = '';
    let params: any[] = [];

    if (statusUpper === 'SENT') {
      query = `UPDATE "WhatsAppMessage" SET status = $1, "sentAt" = $2 WHERE "messageId" = $3`;
      params = [statusUpper, timestampDate, metaMsgId];
    } else if (statusUpper === 'DELIVERED') {
      query = `UPDATE "WhatsAppMessage" SET status = $1, "deliveredAt" = $2 WHERE "messageId" = $3`;
      params = [statusUpper, timestampDate, metaMsgId];
    } else if (statusUpper === 'READ') {
      query = `UPDATE "WhatsAppMessage" SET status = $1, "readAt" = $2 WHERE "messageId" = $3`;
      params = [statusUpper, timestampDate, metaMsgId];
    } else if (statusUpper === 'FAILED') {
      const errorCode = status.errors?.[0]?.code?.toString() || 'FAILED';
      const errorMsg = status.errors?.[0]?.title || 'Unknown Meta delivery failure';
      query = `UPDATE "WhatsAppMessage" SET status = $1, "errorCode" = $2, "errorMessage" = $3 WHERE "messageId" = $4`;
      params = [statusUpper, errorCode, errorMsg, metaMsgId];
    }

    if (query) {
      const res = await pool.query(query, params);
      if (res.rowCount === 0) {
        logger.warn(`WhatsAppMessage not found in database for incoming status update: ${metaMsgId}`);
      }
    }
  } catch (err) {
    logger.error(`Database error updating status for messageId ${metaMsgId}`, err);
  }
}
