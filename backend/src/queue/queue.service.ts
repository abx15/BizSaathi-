import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS } from './queue.constants';
import * as payloads from './dto/job-payload.types';

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number | { count: number; age?: number };
  removeOnFail?: boolean | number | { count: number; age?: number };
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUES.PDF)          private readonly pdfQueue: Queue,
    @InjectQueue(QUEUES.EMAIL)        private readonly emailQueue: Queue,
    @InjectQueue(QUEUES.WHATSAPP)     private readonly whatsappQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATION) private readonly notificationQueue: Queue,
    @InjectQueue(QUEUES.INVOICE)      private readonly invoiceQueue: Queue,
    @InjectQueue(QUEUES.PAYROLL)      private readonly payrollQueue: Queue,
    @InjectQueue(QUEUES.AI)           private readonly aiQueue: Queue,
    @InjectQueue(QUEUES.CLEANUP)      private readonly cleanupQueue: Queue,
  ) {}

  // ==========================================
  // PDF Queue Jobs
  // ==========================================
  async generateInvoicePdf(payload: payloads.PdfInvoicePayload, opts?: JobOptions) {
    return this.pdfQueue.add(JOBS.PDF_INVOICE, payload, {
      ...this.withRetry(3),
      ...opts,
    });
  }

  async generateSalarySlip(payload: payloads.PdfSalarySlipPayload, opts?: JobOptions) {
    return this.pdfQueue.add(JOBS.PDF_SALARY_SLIP, payload, {
      ...this.withRetry(3),
      ...opts,
    });
  }

  // ==========================================
  // Email Queue Jobs
  // ==========================================
  async sendInvoiceEmail(payload: payloads.EmailInvoicePayload, opts?: JobOptions) {
    return this.emailQueue.add(JOBS.EMAIL_INVOICE, payload, {
      ...this.withRetry(3),
      ...opts,
    });
  }

  async sendOTPEmail(payload: payloads.EmailOTPPayload, opts?: JobOptions) {
    return this.emailQueue.add(JOBS.EMAIL_OTP, payload, {
      ...this.urgent(),
      ...opts,
    });
  }

  async sendWelcomeEmail(payload: payloads.EmailWelcomePayload, opts?: JobOptions) {
    return this.emailQueue.add(JOBS.EMAIL_WELCOME, payload, {
      ...this.lowPriority(),
      ...opts,
    });
  }

  async sendPayslipEmail(payload: payloads.EmailInvoicePayload, opts?: JobOptions) {
    return this.emailQueue.add(JOBS.EMAIL_PAYSLIP, payload, {
      ...this.withRetry(3),
      ...opts,
    });
  }

  // ==========================================
  // WhatsApp Queue Jobs
  // ==========================================
  async sendInvoiceWhatsApp(payload: payloads.WhatsAppInvoicePayload, opts?: JobOptions) {
    return this.whatsappQueue.add(JOBS.WA_INVOICE, payload, {
      ...this.withRetry(3),
      ...opts,
    });
  }

  async sendReminderWhatsApp(payload: payloads.WhatsAppReminderPayload, opts?: JobOptions) {
    return this.whatsappQueue.add(JOBS.WA_REMINDER, payload, {
      ...this.withRetry(3),
      ...opts,
    });
  }

  async sendOTPWhatsApp(payload: payloads.WhatsAppOTPPayload, opts?: JobOptions) {
    return this.whatsappQueue.add(JOBS.WA_OTP, payload, {
      ...this.urgent(),
      ...opts,
    });
  }

  async sendBulkReminders(payload: payloads.WhatsAppBulkReminderPayload, opts?: JobOptions) {
    return this.whatsappQueue.add(JOBS.WA_BULK_REMINDER, payload, {
      ...this.lowPriority(),
      ...opts,
    });
  }

  // ==========================================
  // Notification Queue Jobs
  // ==========================================
  async pushRealtimeEvent(payload: payloads.NotifyRealtimePayload, opts?: JobOptions) {
    return this.notificationQueue.add(JOBS.NOTIFY_REALTIME, payload, {
      ...this.urgent(),
      ...opts,
    });
  }

  // ==========================================
  // AI Queue Jobs
  // ==========================================
  async indexEntity(payload: payloads.AIIndexEntityPayload, opts?: JobOptions) {
    return this.aiQueue.add(JOBS.AI_INDEX_ENTITY, payload, {
      ...this.withRetry(5),
      ...opts,
    });
  }

  async indexTenantFull(payload: payloads.AIIndexTenantPayload, opts?: JobOptions) {
    return this.aiQueue.add(JOBS.AI_INDEX_TENANT, payload, {
      ...this.lowPriority(),
      ...opts,
    });
  }

  async generateInsights(payload: payloads.AIInsightPayload, opts?: JobOptions) {
    return this.aiQueue.add(JOBS.AI_INSIGHT_GEN, payload, {
      ...this.lowPriority(),
      ...opts,
    });
  }

  // ==========================================
  // Priorities and Options Helpers
  // ==========================================
  private withRetry(attempts = 3): JobOptions {
    return {
      attempts,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    };
  }

  private urgent(): JobOptions {
    return { priority: 1, ...this.withRetry(5) };
  }

  private lowPriority(): JobOptions {
    return { priority: 10, ...this.withRetry(2) };
  }
}
