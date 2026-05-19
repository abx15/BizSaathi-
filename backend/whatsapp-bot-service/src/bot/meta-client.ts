import { config } from '../config';
import { logger } from '../utils/logger';

export class MetaClient {
  private static readonly baseUrl = 'https://graph.facebook.com/v21.0';

  private static getHeaders() {
    return {
      'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  private static async makeRequest(payload: any): Promise<void> {
    const url = `${this.baseUrl}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json() as any;
        logger.error(`Meta API request failed: ${JSON.stringify(errData)}`);
      }
    } catch (err: any) {
      logger.error(`Meta API HTTP communication failed: ${err.message}`);
    }
  }

  static async sendText(to: string, text: string): Promise<void> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    };
    await this.makeRequest(payload);
  }

  static async sendDocument(to: string, documentUrl: string, filename: string, caption?: string): Promise<void> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'document',
      document: {
        link: documentUrl,
        filename,
        caption,
      },
    };
    await this.makeRequest(payload);
  }

  static async sendList(params: {
    to: string;
    headerText: string;
    bodyText: string;
    buttonText: string;
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[];
  }): Promise<void> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: params.headerText,
        },
        body: {
          text: params.bodyText,
        },
        action: {
          button: params.buttonText,
          sections: params.sections,
        },
      },
    };
    await this.makeRequest(payload);
  }

  static async sendButtons(params: {
    to: string;
    bodyText: string;
    buttons: { id: string; title: string }[];
  }): Promise<void> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: params.bodyText,
        },
        action: {
          buttons: params.buttons.map(b => ({
            type: 'reply',
            reply: {
              id: b.id,
              title: b.title,
            },
          })),
        },
      },
    };
    await this.makeRequest(payload);
  }

  static async markRead(messageId: string): Promise<void> {
    const url = `${this.baseUrl}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };
    try {
      await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      logger.error(`Meta API failed to mark read: ${err.message}`);
    }
  }
}
