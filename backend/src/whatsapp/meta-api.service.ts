import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: any[];
}

export interface ListSection {
  title: string;
  rows: { id: string; title: string; description?: string }[];
}

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly baseUrl = 'https://graph.facebook.com/v21.0';

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
  }

  private getUrl(): string {
    return `${this.baseUrl}/${this.phoneNumberId}/messages`;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest(payload: any): Promise<{ messageId: string }> {
    const url = this.getUrl();
    try {
      this.logger.log(`Sending WhatsApp request to: ${payload.to}, type: ${payload.type || 'template'}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        this.logger.error(`Meta API error: ${JSON.stringify(data)}`);
        const errorMsg = data?.error?.message || 'Unknown Meta Cloud API error';
        const errorCode = data?.error?.code || 'META_API_ERROR';
        throw new BadRequestException({
          message: errorMsg,
          code: errorCode,
        });
      }

      const messageId = data?.messages?.[0]?.id;
      if (!messageId) {
        throw new BadRequestException('Meta API returned success but no message ID was found');
      }

      return { messageId };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`, error.stack);
      throw new BadRequestException(`Meta API connection failed: ${error.message}`);
    }
  }

  // Send template message
  async sendTemplate(params: {
    to: string;              // phone with country code: "919876543210"
    templateName: string;
    languageCode: string;
    components: TemplateComponent[];
  }): Promise<{ messageId: string }> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: {
          code: params.languageCode,
        },
        components: params.components,
      },
    };
    return this.makeRequest(payload);
  }

  // Send plain text message
  async sendText(params: {
    to: string;
    text: string;
    previewUrl?: boolean;
  }): Promise<{ messageId: string }> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'text',
      text: {
        body: params.text,
        preview_url: params.previewUrl || false,
      },
    };
    return this.makeRequest(payload);
  }

  // Send document (PDF invoice)
  async sendDocument(params: {
    to: string;
    documentUrl: string;    // public URL from R2
    filename: string;
    caption?: string;
  }): Promise<{ messageId: string }> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'document',
      document: {
        link: params.documentUrl,
        filename: params.filename,
        caption: params.caption,
      },
    };
    return this.makeRequest(payload);
  }

  // Send interactive list message
  async sendList(params: {
    to: string;
    headerText: string;
    bodyText: string;
    buttonText: string;
    sections: ListSection[];
  }): Promise<{ messageId: string }> {
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
    return this.makeRequest(payload);
  }

  // Send interactive reply buttons
  async sendButtons(params: {
    to: string;
    bodyText: string;
    buttons: { id: string; title: string }[];
  }): Promise<{ messageId: string }> {
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
    return this.makeRequest(payload);
  }

  // Mark message as read
  async markRead(messageId: string): Promise<void> {
    const url = this.getUrl();
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json() as any;
        this.logger.error(`Meta API markRead error: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to mark message as read: ${error.message}`);
    }
  }
}
