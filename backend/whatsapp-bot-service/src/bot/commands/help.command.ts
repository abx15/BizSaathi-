import { IncomingMessage } from '../../webhook/types';
import { BotSession } from '../session.service';
import { MetaClient } from '../meta-client';

export class HelpCommand {
  async execute(message: IncomingMessage, session: BotSession): Promise<void> {
    if (session.role === 'customer') {
      const responseText = `🙏 Namaste *${message.senderName}*! Main BizSaathi digital assistant hoon.

Aap mujhse apne billing ki details check kar sakte hain:

📄 *invoice* — Apne recent invoices dekhein aur download karein
📞 *support* — Hamare support team se baat karein

Koi bhi query ho toh niche message type karein!`;
      await MetaClient.sendText(message.from, responseText);
      return;
    }

    // Role is user (owner/admin) or unknown
    const responseText = `🙏 Namaste *${message.senderName}*! Main BizSaathi AI hoon.

Aap mujhse ye commands pooch sakte hain:

📄 *invoice* — Recent invoices dekhein aur download karein
💰 *balance* — Pending payments aur balance check karein
📊 *report* — Business insights aur summaries paayein
👥 *staff* — Staff payroll status check karein
💸 *kharcha* — Expense report check karein

Seedha bhi pooch sakte hain jaise:
'invoice check'
'balance check'
'summary do'

Type your choice or command!`;
    await MetaClient.sendText(message.from, responseText);
  }
}

export const helpCommand = new HelpCommand();
