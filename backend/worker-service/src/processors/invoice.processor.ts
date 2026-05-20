import { Job, Queue } from 'bullmq';
import { db } from '../db';
import { logger } from '../logger';
import { redisConnection } from '../redis';
import { withRetry } from '../utils/retry';

export async function processInvoiceJob(job: Job): Promise<any> {
  const { name, data } = job;
  logger.info({ jobId: job.id, name, data }, 'Processing Invoice queue job');

  switch (name) {
    case 'invoice:overdue:check': {
      logger.info('Running background sweep for overdue invoices');
      
      let overdueCount = 0;
      await withRetry(async () => {
        // Query sent or partial invoices that are past their due date
        const result = await db.query(`
          SELECT i.id, i."tenantId", i."customerId", i."dueDate", i."totalAmount", i."status", i."invoiceNumber",
                 c.name as "customerName", c.phone as "customerPhone", c.email as "customerEmail"
          FROM "Invoice" i
          JOIN "Customer" c ON i."customerId" = c.id
          WHERE i."status" IN ('SENT', 'PARTIAL') AND i."dueDate" < NOW()
        `);

        logger.info({ count: result.rows.length }, 'Found potential overdue invoices in sweep');

        const whatsappQueue = new Queue('whatsapp', { connection: redisConnection });
        const notificationQueue = new Queue('notification', { connection: redisConnection });

        for (const invoice of result.rows) {
          // Update status to OVERDUE inside a pool transaction
          await db.transaction(async (client) => {
            await client.query(
              `UPDATE "Invoice" SET "status" = 'OVERDUE', "updatedAt" = NOW() WHERE id = $1`,
              [invoice.id]
            );
          });
          
          overdueCount++;

          // Enqueue WhatsApp reminder if customer phone exists
          if (invoice.customerPhone) {
            await whatsappQueue.add('whatsapp:reminder:send', {
              invoiceId: invoice.id,
              tenantId: invoice.tenantId,
              phone: invoice.customerPhone,
              customerName: invoice.customerName,
              amount: String(invoice.totalAmount),
              daysPending: Math.ceil((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
            });
            logger.debug({ invoiceId: invoice.id, phone: invoice.customerPhone }, 'Queued WhatsApp reminder for overdue invoice');
          }

          // Push realtime notification update
          await notificationQueue.add('notification:realtime:push', {
            tenantId: invoice.tenantId,
            eventType: 'invoice:overdue',
            eventPayload: {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              customerName: invoice.customerName,
              totalAmount: invoice.totalAmount,
            },
          });
        }
      });

      logger.info({ overdueCount }, 'Completed overdue sweep process');
      return { overdueCount };
    }

    case 'invoice:reminder:auto-send': {
      const { invoiceId, tenantId } = data;
      logger.info({ invoiceId, tenantId }, 'Processing manual/auto invoice reminder dispatch');
      
      const invoiceResult = await db.query(`
        SELECT i.id, i."tenantId", i."totalAmount", i."dueDate",
               c.name as "customerName", c.phone as "customerPhone"
        FROM "Invoice" i
        JOIN "Customer" c ON i."customerId" = c.id
        WHERE i.id = $1 AND i."tenantId" = $2
      `, [invoiceId, tenantId]);

      if (invoiceResult.rows.length === 0) {
        logger.warn({ invoiceId }, 'Invoice not found for reminder auto-send');
        return { sent: false, reason: 'Invoice not found' };
      }

      const invoice = invoiceResult.rows[0];
      if (invoice.customerPhone) {
        const whatsappQueue = new Queue('whatsapp', { connection: redisConnection });
        await whatsappQueue.add('whatsapp:reminder:send', {
          invoiceId: invoice.id,
          tenantId: invoice.tenantId,
          phone: invoice.customerPhone,
          customerName: invoice.customerName,
          amount: String(invoice.totalAmount),
          daysPending: invoice.dueDate ? Math.ceil((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        });
        logger.info({ invoiceId, phone: invoice.customerPhone }, 'Dispatched WhatsApp invoice reminder');
        return { sent: true };
      }

      return { sent: false, reason: 'Customer phone number missing' };
    }

    case 'invoice:recurring:generate': {
      logger.info('Recurring invoice sweep called. No recurring invoice schema is registered in the database. Skipping.');
      return { processed: 0, reason: 'No recurring invoice records exist' };
    }

    default:
      throw new Error(`Unknown job name in Invoice queue: ${name}`);
  }
}
