import { IncomingMessage } from '../../webhook/types';
import { BotSession, sessionService } from '../session.service';
import { MetaClient } from '../meta-client';
import { pool } from '../../db/db';
import { logger } from '../../utils/logger';

export class InvoiceCommand {
  async execute(message: IncomingMessage, session: BotSession): Promise<void> {
    const tenantId = session.tenantId;
    if (!tenantId) {
      await MetaClient.sendText(message.from, '❌ Aapka phone number kisi active tenant se linked nahi hai.');
      return;
    }

    // Check if we are currently waiting for invoice selection and received an interactive selection
    if (session.state === 'waiting_invoice_selection' && message.interactive?.id?.startsWith('inv:')) {
      const invoiceId = message.interactive.id.replace('inv:', '');
      await this.sendInvoicePdf(message.from, invoiceId, session);
      return;
    }

    // Default: List last 5 invoices
    try {
      let query = '';
      let params: any[] = [];

      if (session.role === 'customer') {
        // Resolve Customer records for this phone
        const custRes = await pool.query(
          `SELECT id FROM "Customer" WHERE phone LIKE $1 AND "tenantId" = $2 LIMIT 1`,
          [`%${message.from.slice(-10)}`, tenantId],
        );
        if (custRes.rows.length === 0) {
          await MetaClient.sendText(message.from, '❌ Aapka record customer database mein nahi mila.');
          return;
        }
        const customerId = custRes.rows[0].id;

        query = `
          SELECT i.id, i."invoiceNumber", i."totalAmount", i.status, c.name as "customerName"
          FROM "Invoice" i
          JOIN "Customer" c ON i."customerId" = c.id
          WHERE i."customerId" = $1
          ORDER BY i."createdAt" DESC
          LIMIT 5
        `;
        params = [customerId];
      } else {
        // User (Owner/Admin) -> Fetch all recent invoices for tenant
        query = `
          SELECT i.id, i."invoiceNumber", i."totalAmount", i.status, c.name as "customerName"
          FROM "Invoice" i
          JOIN "Customer" c ON i."customerId" = c.id
          WHERE i."tenantId" = $1
          ORDER BY i."createdAt" DESC
          LIMIT 5
        `;
        params = [tenantId];
      }

      const res = await pool.query(query, params);
      if (res.rows.length === 0) {
        await MetaClient.sendText(message.from, '📄 Koi invoices nahi mile.');
        return;
      }

      const rows = res.rows.map(inv => {
        const amt = parseFloat(inv.totalAmount).toLocaleString('en-IN');
        const statusEmoji = inv.status === 'PAID' ? '✅' : '⚠️';
        return {
          id: `inv:${inv.id}`,
          title: `${inv.invoiceNumber} | ₹${amt}`,
          description: `${inv.customerName.slice(0, 15)} | ${inv.status} ${statusEmoji}`,
        };
      });

      await MetaClient.sendList({
        to: message.from,
        headerText: 'BizSaathi Bills',
        bodyText: 'Niche diye recent invoices mein se ek select karein download karne ke liye:',
        buttonText: 'Select Invoice',
        sections: [
          {
            title: 'Recent Invoices',
            rows,
          },
        ],
      });

      // Update session state to WAITING_INVOICE_SELECTION
      session.state = 'waiting_invoice_selection';
      session.context = {
        ...session.context,
        availableInvoices: rows.map(r => r.id),
      };
      await sessionService.setSession(message.from, session);

    } catch (err) {
      logger.error('Error in InvoiceCommand listing', err);
      await MetaClient.sendText(message.from, '❌ Invoices load karne mein dikkat aayi. Kripya baad mein try karein.');
    }
  }

  private async sendInvoicePdf(to: string, invoiceId: string, session: BotSession): Promise<void> {
    try {
      const res = await pool.query(
        `SELECT "invoiceNumber", "pdfUrl" FROM "Invoice" WHERE id = $1 LIMIT 1`,
        [invoiceId],
      );

      if (res.rows.length === 0) {
        await MetaClient.sendText(to, '❌ Selected invoice nahi mili.');
        return;
      }

      const invoice = res.rows[0];
      let pdfUrl = invoice.pdfUrl;

      // If PDF url is missing or local file url, use a sample placeholder to avoid Meta API errors
      if (!pdfUrl || pdfUrl.startsWith('file://')) {
        pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      }

      await MetaClient.sendText(to, `⏳ Invoice *${invoice.invoiceNumber}* ka PDF download link niche hai...`);
      
      await MetaClient.sendDocument(
        to,
        pdfUrl,
        `${invoice.invoiceNumber}.pdf`,
        `Tax Invoice: ${invoice.invoiceNumber}`,
      );

      // Reset state to idle
      session.state = 'idle';
      delete session.context.availableInvoices;
      await sessionService.setSession(to, session);

    } catch (err) {
      logger.error('Error sending invoice pdf', err);
      await MetaClient.sendText(to, '❌ PDF link send karne mein error aayi.');
    }
  }
}

export const invoiceCommand = new InvoiceCommand();
