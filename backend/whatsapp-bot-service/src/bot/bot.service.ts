import { IncomingMessage } from '../webhook/types';
import { sessionService, BotSession } from './session.service';
import { MetaClient } from './meta-client';
import { helpCommand } from './commands/help.command';
import { invoiceCommand } from './commands/invoice.command';
import { balanceCommand } from './commands/balance.command';
import { reportCommand } from './commands/report.command';
import { pool } from '../db/db';
import { logger } from '../utils/logger';

export type Intent =
  | 'HELP'
  | 'INVOICE_LIST'
  | 'BALANCE_CHECK'
  | 'REPORT'
  | 'STAFF_SUMMARY'
  | 'EXPENSE_SUMMARY'
  | 'INTERACTIVE_REPLY'
  | 'UNKNOWN';

class BotService {
  /**
   * Main bot engine message ingress
   */
  async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    const phone = message.from;
    
    // 1. Mark incoming message as read
    await MetaClient.markRead(message.id);

    // 2. Get or create session (determines user role and tenantId)
    const session = await sessionService.getSession(phone, message.businessPhoneNumberId);

    // Log the incoming message in database
    await this.logInboundMessage(session, message);

    if (!session.tenantId) {
      await MetaClient.sendText(phone, '🙏 Namaste! Hamare records ke hisaab se aapka number registered nahi hai. Customer support se contact karein.');
      return;
    }

    // 3. Resolve intent
    const intent = this.parseIntent(message, session);

    logger.info(`Routing message from ${phone} to intent: ${intent} (Role: ${session.role}, State: ${session.state})`);

    // 4. Route to command handlers
    try {
      switch (intent) {
        case 'HELP':
          await helpCommand.execute(message, session);
          break;
        case 'INVOICE_LIST':
          await invoiceCommand.execute(message, session);
          break;
        case 'BALANCE_CHECK':
          await balanceCommand.execute(message, session);
          break;
        case 'REPORT':
          await reportCommand.execute(message, session);
          break;
        case 'STAFF_SUMMARY':
          await this.handleStaffSummary(message, session);
          break;
        case 'EXPENSE_SUMMARY':
          await this.handleExpenseSummary(message, session);
          break;
        case 'INTERACTIVE_REPLY':
          // Delegate to current state handler
          if (session.state === 'waiting_invoice_selection') {
            await invoiceCommand.execute(message, session);
          } else if (session.state === 'waiting_report_period') {
            await reportCommand.execute(message, session);
          } else {
            await helpCommand.execute(message, session);
          }
          break;
        default:
          await this.handleUnknown(message, session);
          break;
      }
    } catch (err: any) {
      logger.error(`Error processing command for ${phone}`, err);
      await MetaClient.sendText(phone, '❌ Kuch technical issue aayi. Please dobara try karein.');
    }
  }

  /**
   * Inbound intent parser
   */
  private parseIntent(message: IncomingMessage, session: BotSession): Intent {
    if (message.type === 'interactive' && message.interactive) {
      return 'INTERACTIVE_REPLY';
    }

    const text = (message.text || '').toLowerCase().trim();
    if (!text) return 'UNKNOWN';

    // Helper functions for matching
    const matches = (input: string, keywords: string[]): boolean => {
      return keywords.some(kw => {
        if (kw === 'hi') {
          return input === 'hi' || new RegExp('\\bhi\\b').test(input);
        }
        return input.includes(kw);
      });
    };

    if (matches(text, ['help', 'madad', 'commands', 'hi', 'hello', 'namaste', 'menu'])) return 'HELP';
    if (matches(text, ['invoice', 'bill', 'receipt', 'raseed'])) return 'INVOICE_LIST';
    if (matches(text, ['balance', 'pending', 'baaki', 'kitna', 'outstanding'])) return 'BALANCE_CHECK';
    if (matches(text, ['report', 'summary', 'hisaab', 'insights'])) return 'REPORT';
    if (matches(text, ['staff', 'employee', 'kaamgaar', 'payroll'])) return 'STAFF_SUMMARY';
    if (matches(text, ['kharcha', 'expense', 'kharche'])) return 'EXPENSE_SUMMARY';

    // If currently waiting for input in a multi-turn conversation
    if (session.state !== 'idle') {
      return 'INTERACTIVE_REPLY';
    }

    return 'UNKNOWN';
  }

  /**
   * Log inbound message to PostgreSQL WhatsAppMessage table
   */
  private async logInboundMessage(session: BotSession, message: IncomingMessage): Promise<void> {
    try {
      const tenantId = session.tenantId || 'system';
      const content = message.type === 'interactive' ? message.interactive : { text: message.text };
      
      await pool.query(
        `
        INSERT INTO "WhatsAppMessage" (
          id, "tenantId", direction, phone, "messageId", type, content, status, "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `,
        [
          crypto.randomUUID(),
          tenantId,
          'INBOUND',
          message.from,
          message.id,
          message.type,
          JSON.stringify(content),
          'READ', // Incoming is read by default
        ],
      );
    } catch (err) {
      logger.error('Error logging inbound message in DB', err);
    }
  }

  /**
   * Inline handler for STAFF_SUMMARY
   */
  private async handleStaffSummary(message: IncomingMessage, session: BotSession): Promise<void> {
    if (session.role === 'customer') {
      await MetaClient.sendText(message.from, '❌ Sorry, staff summaries dekhne ka rights aapke paas nahi hai.');
      return;
    }

    try {
      const res = await pool.query(
        `
        SELECT COUNT(*)::int as active_count, COALESCE(SUM("basicSalary"), 0) as total_budget
        FROM "Staff"
        WHERE "tenantId" = $1 AND status = 'ACTIVE'
        `,
        [session.tenantId],
      );

      const activeCount = res.rows[0].active_count;
      const budget = parseFloat(res.rows[0].total_budget).toLocaleString('en-IN');

      const responseText = `👥 *BizSaathi Staff Summary*

• *Active Employees:* ${activeCount} active kaamgaar
• *Monthly Payroll Budget:* ₹${budget} Basic Salary

Naya staff register karne ya detailed attendance payroll check karne ke liye web dashboard load karein!`;

      await MetaClient.sendText(message.from, responseText);
    } catch (err) {
      logger.error('Error in handleStaffSummary', err);
      await MetaClient.sendText(message.from, '❌ Staff summary check karne mein error aayi.');
    }
  }

  /**
   * Inline handler for EXPENSE_SUMMARY
   */
  private async handleExpenseSummary(message: IncomingMessage, session: BotSession): Promise<void> {
    if (session.role === 'customer') {
      await MetaClient.sendText(message.from, '❌ Sorry, business expenses aap nahi dekh sakte.');
      return;
    }

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const res = await pool.query(
        `
        SELECT COUNT(*)::int as count, COALESCE(SUM("totalAmount"), 0) as total
        FROM "Expense"
        WHERE "tenantId" = $1 AND "expenseDate" >= $2
        `,
        [session.tenantId, startOfMonth],
      );

      const count = res.rows[0].count;
      const total = parseFloat(res.rows[0].total).toLocaleString('en-IN');

      const responseText = `💸 *BizSaathi Expense Summary (Is Mahine)*

• *Total Transactions:* ${count} bills recorded
• *Total Expenses (Kharche):* ₹${total}

Expense invoices save karne ke liye dashboard upload section ka use karein.`;

      await MetaClient.sendText(message.from, responseText);
    } catch (err) {
      logger.error('Error in handleExpenseSummary', err);
      await MetaClient.sendText(message.from, '❌ Expense summary check karne mein check constraint error aayi.');
    }
  }

  /**
   * Default fallback handler
   */
  private async handleUnknown(message: IncomingMessage, session: BotSession): Promise<void> {
    const responseText = `🤖 Hum aapka message *"${message.text}"* samajh nahi paaye. 

Aap humse ye check kar sakte hain:
📄 *invoice* (recent invoices)
💰 *balance* (payment outstanding)
📊 *report* (dashboard business summary)

Kuch help chahiye toh type karein *help*!`;
    await MetaClient.sendText(message.from, responseText);
  }
}

export const botService = new BotService();
export default botService;
