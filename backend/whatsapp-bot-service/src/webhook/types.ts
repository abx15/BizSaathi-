export interface MetaWebhookPayload {
  object: 'whatsapp_business_account';
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          phone_number_id: string;
          display_phone_number: string;
        };
        contacts?: {
          profile: { name: string };
          wa_id: string;
        }[];
        messages?: {
          id: string;
          from: string; // sender phone
          timestamp: string;
          type: 'text' | 'interactive' | 'image' | 'document' | 'audio';
          text?: { body: string };
          interactive?: {
            type: 'button_reply' | 'list_reply';
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string };
          };
          image?: { id: string; mime_type: string; sha256: string };
          document?: { id: string; filename: string; mime_type: string };
        }[];
        statuses?: {
          id: string; // message ID
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: { code: number; title: string }[];
        }[];
      };
      field: 'messages';
    }[];
  }[];
}

export interface IncomingMessage {
  id: string;
  from: string;
  senderName: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'image' | 'document' | 'audio';
  text?: string;
  interactive?: {
    type: 'button_reply' | 'list_reply';
    id: string;
    title: string;
  };
  businessPhoneNumberId: string;
}
