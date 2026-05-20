export enum EventType {
  // Invoice events
  InvoiceCreated = 'invoice.created',
  InvoiceUpdated = 'invoice.updated',
  InvoicePaid = 'invoice.paid',
  InvoiceSent = 'invoice.sent',
  InvoiceOverdue = 'invoice.overdue',

  // Payment events
  PaymentReceived = 'payment.received',

  // Expense events
  ExpenseCreated = 'expense.created',

  // Staff events
  AttendanceMarked = 'attendance.marked',
  PayrollProcessed = 'payroll.processed',
  LeaveApproved = 'leave.approved',
  LeaveRejected = 'leave.rejected',

  // CRM events
  LeadCreated = 'lead.created',
  LeadStageChanged = 'lead.stage_changed',
  LeadWon = 'lead.won',
  LeadLost = 'lead.lost',
  FollowupDue = 'followup.due',

  // WhatsApp events
  WhatsAppDelivered = 'whatsapp.delivered',
  WhatsAppRead = 'whatsapp.read',
  WhatsAppReply = 'whatsapp.reply',

  // AI events
  AIInsightReady = 'ai.insight_ready',
  AIReportReady = 'ai.report_ready',

  // System events
  DashboardRefresh = 'dashboard.refresh',
  Notification = 'notification',
  Alert = 'alert',
}

export interface EventEnvelope<T = Record<string, unknown>> {
  id: string;
  type: EventType;
  tenantId: string;
  userId?: string;
  payload: T;
  timestamp: string;
}
