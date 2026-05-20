// Every job payload must be typed

export interface PdfInvoicePayload {
  invoiceId: string;
  tenantId: string;
  regenerate?: boolean;    // force regenerate even if cached
}

export interface PdfSalarySlipPayload {
  payrollId: string;
  tenantId: string;
  staffId: string;
  month: string;
}

export interface EmailInvoicePayload {
  invoiceId: string;
  tenantId: string;
  recipientEmail: string;
  pdfUrl?: string;         // if already generated
}

export interface EmailOTPPayload {
  phone: string;
  email?: string;
  otp: string;
  expiryMinutes: number;
}

export interface EmailWelcomePayload {
  userId: string;
  tenantId: string;
  businessName: string;
  email: string;
}

export interface WhatsAppInvoicePayload {
  invoiceId: string;
  tenantId: string;
  phone: string;
  pdfUrl?: string;
}

export interface WhatsAppReminderPayload {
  invoiceId: string;
  tenantId: string;
  phone: string;
  customerName: string;
  amount: string;
  daysPending: number;
}

export interface WhatsAppOTPPayload {
  phone: string;
  otp: string;
  expiryMinutes: number;
}

export interface WhatsAppBulkReminderPayload {
  tenantId: string;
  invoiceIds: string[];
  daysOverdue: number;
}

export interface NotifyRealtimePayload {
  tenantId: string;
  userId?: string;
  eventType: string;
  eventPayload: Record<string, unknown>;
}

export interface InvoiceOverdueCheckPayload {
  tenantId?: string;   // undefined = check all tenants
  daysOverdue: number;
}

export interface PayrollProcessPayload {
  tenantId: string;
  month: string;
  staffIds?: string[];
}

export interface AIIndexEntityPayload {
  tenantId: string;
  entityType: 'invoice' | 'expense' | 'customer' | 'lead' | 'staff';
  entityId: string;
  operation: 'upsert' | 'delete';
}

export interface AIIndexTenantPayload {
  tenantId: string;
  fullReindex: boolean;
}

export interface AIInsightPayload {
  tenantId: string;
  period: string;
  forceRegenerate?: boolean;
}

export interface CleanupTempFilesPayload {
  olderThanHours: number;
}
