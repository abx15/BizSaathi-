import { IncomingMessage } from '../../webhook/types';
import { BotSession, sessionService } from '../session.service';
import { MetaClient } from '../meta-client';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

/**
 * Sign a JWT token using HS256 to authenticate with the AI service.
 */
function signJwt(payload: any, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const base64UrlHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64UrlPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${base64UrlHeader}.${base64UrlPayload}`)
    .digest('base64url');
    
  return `${base64UrlHeader}.${base64UrlPayload}.${signature}`;
}

export class ReportCommand {
  async execute(message: IncomingMessage, session: BotSession): Promise<void> {
    const tenantId = session.tenantId;
    if (!tenantId) {
      await MetaClient.sendText(message.from, '❌ Aapka phone number active tenant se linked nahi hai.');
      return;
    }

    if (session.role === 'customer') {
      await MetaClient.sendText(
        message.from,
        '❌ Sorry, reports sirf business owner ya admin hi check kar sakte hain.',
      );
      return;
    }

    // If waiting for button selection and user clicked one
    if (session.state === 'waiting_report_period' && message.interactive?.id?.startsWith('rep:')) {
      const periodId = message.interactive.id.replace('rep:', '');
      await this.generateAndSendReport(message.from, periodId, session);
      return;
    }

    // Default: Present interactive buttons to select report period
    try {
      await MetaClient.sendButtons({
        to: message.from,
        bodyText: '📊 Kaunsa business report summary dekhna chahenge?',
        buttons: [
          { id: 'rep:today', title: 'Aaj' },
          { id: 'rep:this_month', title: 'Is Mahine' },
          { id: 'rep:last_month', title: 'Pichla Mahine' },
        ],
      });

      // Update session state
      session.state = 'waiting_report_period';
      await sessionService.setSession(message.from, session);

    } catch (err) {
      logger.error('Error sending report period buttons', err);
      await MetaClient.sendText(message.from, '❌ Report details fetch karne mein constraint aayi.');
    }
  }

  private async generateAndSendReport(to: string, period: string, session: BotSession): Promise<void> {
    const tenantId = session.tenantId!;
    await MetaClient.sendText(to, '⏳ AI reports compile kiye jaa rahe hain, kripya thoda wait karein...');

    try {
      // 1. Generate HS256 JWT token for calling the AI service
      // Read secret from environment variable (falls back to placeholder)
      const jwtSecret = process.env.JWT_ACCESS_SECRET || 'change_me_access_secret_min_32_chars';
      const token = signJwt(
        {
          sub: 'bot-service-system',
          tenantId,
          role: 'OWNER',
          phone: session.phone,
          exp: Math.floor(Date.now() / 1000) + 300, // 5 min expiry
        },
        jwtSecret,
      );

      // 2. Fetch Dashboard Summary (AI header)
      const summaryUrl = `${config.AI_SERVICE_URL}/v1/ai/dashboard-summary`;
      let summaryText = 'AI is preparing your report...';
      let moodEmoji = '📊';

      try {
        const sumRes = await fetch(summaryUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        });

        if (sumRes.ok) {
          const sumData = (await sumRes.json()) as any;
          if (sumData.success && sumData.data) {
            summaryText = sumData.data.summary;
            const mood = sumData.data.mood;
            if (mood === 'positive') moodEmoji = '📈';
            else if (mood === 'warning') moodEmoji = '📉';
          }
        }
      } catch (sumErr) {
        logger.error('Error fetching dashboard summary from AI service', sumErr);
      }

      // 3. Fetch specific business insights
      const insightsUrl = `${config.AI_SERVICE_URL}/v1/ai/insights?period=${period}`;
      let insightsText = '';

      try {
        const insRes = await fetch(insightsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        });

        if (insRes.ok) {
          const insData = (await insRes.json()) as any;
          if (insData.success && insData.data && insData.data.insights) {
            const list = insData.data.insights;
            if (list.length > 0) {
              insightsText = '\n💡 *AI Key Insights:*\n';
              list.forEach((ins: any) => {
                const icon = ins.type === 'warning' ? '⚠️' : ins.type === 'positive' ? '✅' : 'ℹ️';
                insightsText += `\n${icon} *${ins.title}*\n${ins.body}\n`;
              });
            }
          }
        }
      } catch (insErr) {
        logger.error('Error fetching insights from AI service', insErr);
      }

      const periodLabel = period === 'today' ? 'Aaj' : period === 'this_month' ? 'Is Mahine' : 'Pichle Mahine';

      const responseText = `${moodEmoji} *BizSaathi Business AI Report (${periodLabel})*

📝 *AI Summary:*
${summaryText}
${insightsText}
💵 *BizSaathi Report end.*`;

      await MetaClient.sendText(to, responseText);

      // Reset state to idle
      session.state = 'idle';
      await sessionService.setSession(to, session);

    } catch (err) {
      logger.error('Error calling AI Reports Service', err);
      await MetaClient.sendText(to, '❌ AI reports generate karne mein constraints aayi. Kripya baad mein try karein.');
    }
  }
}

export const reportCommand = new ReportCommand();
