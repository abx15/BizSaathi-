import { IncomingMessage } from '../../webhook/types';
import { BotSession } from '../session.service';
import { MetaClient } from '../meta-client';
import { pool } from '../../db/db';
import { logger } from '../../utils/logger';

export class BalanceCommand {
  async execute(message: IncomingMessage, session: BotSession): Promise<void> {
    const tenantId = session.tenantId;
    if (!tenantId) {
      await MetaClient.sendText(message.from, '❌ Aapka phone number active tenant se linked nahi hai.');
      return;
    }

    try {
      if (session.role === 'customer') {
        await this.executeCustomerBalance(message, tenantId);
      } else {
        await this.executeOwnerBalance(message, tenantId);
      }
    } catch (err) {
      logger.error('Error in BalanceCommand execution', err);
      await MetaClient.sendText(message.from, '❌ Balance details fetch karne mein error aayi.');
    }
  }

  /**
   * Execute balance command for client (customer)
   */
  private async executeCustomerBalance(message: IncomingMessage, tenantId: string): Promise<void> {
    // Resolve Customer
    const custRes = await pool.query(
      `SELECT id, name FROM "Customer" WHERE phone LIKE $1 AND "tenantId" = $2 LIMIT 1`,
      [`%${message.from.slice(-10)}`, tenantId],
    );
    if (custRes.rows.length === 0) {
      await MetaClient.sendText(message.from, '❌ Aapka customer record database mein nahi mila.');
      return;
    }
    const customer = custRes.rows[0];

    // Fetch outstanding invoices
    const outstandingRes = await pool.query(
      `
      SELECT "invoiceNumber", "totalAmount" - "paidAmount" as pending, "dueDate"
      FROM "Invoice"
      WHERE "customerId" = $1 AND status IN ('SENT', 'PARTIAL', 'OVERDUE')
      ORDER BY "invoiceDate" ASC
      `,
      [customer.id],
    );

    if (outstandingRes.rows.length === 0) {
      await MetaClient.sendText(
        message.from,
        `💰 Namaste *${customer.name}*!\n\nAapka koi bhi payment pending nahi hai. Thank you! 🎉`,
      );
      return;
    }

    let totalPending = 0;
    let detailsList = '';

    outstandingRes.rows.forEach(row => {
      const pendingAmt = parseFloat(row.pending);
      totalPending += pendingAmt;
      const dueStr = row.dueDate
        ? new Date(row.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : 'N/A';
      detailsList += `• *${row.invoiceNumber}*: ₹${pendingAmt.toLocaleString('en-IN')} (Due: ${dueStr})\n`;
    });

    const responseText = `💰 *Pending Balance Report*

Namaste *${customer.name}*, aapke pending dues niche diye gaye hain:

${detailsList}
📥 *Total Outstanding: ₹${totalPending.toLocaleString('en-IN')}*

Payment aap UPI ya net banking ke through kar sakte hain. Thank you!`;

    await MetaClient.sendText(message.from, responseText);
  }

  /**
   * Execute balance command for business owner/admin
   */
  private async executeOwnerBalance(message: IncomingMessage, tenantId: string): Promise<void> {
    // 1. Calculate Total Receivables (Unpaid invoices)
    const recvRes = await pool.query(
      `
      SELECT COALESCE(SUM("totalAmount" - "paidAmount"), 0) as total, COUNT(*)::int as count
      FROM "Invoice"
      WHERE "tenantId" = $1 AND status IN ('SENT', 'PARTIAL', 'OVERDUE')
      `,
      [tenantId],
    );
    const receivables = parseFloat(recvRes.rows[0].total);
    const pendingInvoicesCount = recvRes.rows[0].count;

    // 2. Fetch oldest pending invoice details
    const oldestRes = await pool.query(
      `
      SELECT c.name as "customerName", i."invoiceDate"
      FROM "Invoice" i
      JOIN "Customer" c ON i."customerId" = c.id
      WHERE i."tenantId" = $1 AND i.status IN ('SENT', 'PARTIAL', 'OVERDUE')
      ORDER BY i."invoiceDate" ASC
      LIMIT 1
      `,
      [tenantId],
    );
    
    let oldestInvoiceDetails = 'Koi pending invoices nahi';
    if (oldestRes.rows.length > 0) {
      const oldest = oldestRes.rows[0];
      const diffTime = Date.now() - new Date(oldest.invoiceDate).getTime();
      const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      oldestInvoiceDetails = `${oldest.customerName} (${days} din purana)`;
    }

    // 3. Calculate Total Payables (Expenses for current month)
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const expRes = await pool.query(
      `
      SELECT COALESCE(SUM("totalAmount"), 0) as total
      FROM "Expense"
      WHERE "tenantId" = $1 AND "expenseDate" >= $2
      `,
      [tenantId, startOfMonth],
    );
    const payables = parseFloat(expRes.rows[0].total);

    const net = receivables - payables;

    const responseText = `💰 *BizSaathi Business Balance*

📥 *Total Receivables (Aane Wala): ₹${receivables.toLocaleString('en-IN')}*
  • ${pendingInvoicesCount} invoices pending
  • Sabse purana: ${oldestInvoiceDetails}

📤 *Total Payable (Is Mahine Ke Kharche): ₹${payables.toLocaleString('en-IN')}*

💵 *Net Business Position: ₹${net.toLocaleString('en-IN')}*

Business detail insights ke liye 'report' type karein.`;

    await MetaClient.sendText(message.from, responseText);
  }
}

export const balanceCommand = new BalanceCommand();
