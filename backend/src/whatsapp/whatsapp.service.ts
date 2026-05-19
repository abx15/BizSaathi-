import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { MetaApiService } from './meta-api.service';
import { TemplateService } from './template.service';
import { PdfService } from '../invoice/pdf.service';
import { MsgDirection, MsgStatus } from '@prisma/client';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly metaApi: MetaApiService,
    private readonly templateService: TemplateService,
    private readonly pdfService: PdfService,
  ) {}

  /**
   * Enforces global and phone-specific rate limits for outbound messages.
   */
  private async checkRateLimits(tenantId: string, phone: string, isMarketingOrReminder = false): Promise<void> {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Tenant-level global limit (1000 messages per day)
    const tenantKey = `wa:rate:${tenantId}:total:${todayStr}`;
    const currentTenantCount = await this.redis.get(tenantKey);
    if (currentTenantCount && parseInt(currentTenantCount, 10) >= 1000) {
      throw new HttpException(
        'Tenant daily WhatsApp message limit (1000) exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Phone-level limit for marketing/reminder messages (1 message per phone per 24 hours)
    if (isMarketingOrReminder) {
      const phoneKey = `wa:rate:${tenantId}:${phone}:daily`;
      const currentPhoneCount = await this.redis.get(phoneKey);
      if (currentPhoneCount && parseInt(currentPhoneCount, 10) >= 1) {
        throw new BadRequestException({
          message: 'Rate limit exceeded: Only 1 reminder/marketing message allowed per recipient in 24 hours',
          code: 'RATE_LIMIT_EXCEEDED',
        });
      }
    }
  }

  /**
   * Increments rate limit counters upon successful sending.
   */
  private async incrementRateLimits(tenantId: string, phone: string, isMarketingOrReminder = false): Promise<void> {
    const todayStr = new Date().toISOString().split('T')[0];
    const tenantKey = `wa:rate:${tenantId}:total:${todayStr}`;
    
    // Increment global count
    await this.redis.incr(tenantKey);
    await this.redis.expire(tenantKey, 86400 * 2); // expire in 2 days

    // If marketing/reminder, increment phone-level count
    if (isMarketingOrReminder) {
      const phoneKey = `wa:rate:${tenantId}:${phone}:daily`;
      await this.redis.set(phoneKey, '1', 86400); // 24 hours TTL
    }
  }

  /**
   * Format phone number strictly to E.164 (without '+' or leading '0', starting with country code e.g. "91")
   */
  private formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `91${cleaned}`; // Fallback to Indian country code if 10 digits
    }
    return cleaned; // Assumes country code is already prepended
  }

  /**
   * Sends an invoice PDF to the customer via WhatsApp using the bizsaathi_invoice_sent template.
   */
  async sendInvoice(
    tenantId: string,
    invoiceId: string,
    phoneOverride?: string,
    includesPdf = true,
  ): Promise<{ messageId: string; status: MsgStatus }> {
    // 1. Fetch invoice, tenant, and customer details
    const invoice = await this.db.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { items: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found or unauthorized');
    }

    const customer = await this.db.customer.findUnique({
      where: { id: invoice.customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const tenant = await this.db.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const phone = this.formatPhone(phoneOverride || customer.phone || '');
    if (!phone) {
      throw new BadRequestException('Recipient phone number is missing');
    }

    // 2. Perform rate limits check (invoice sending is utility category, but let's check global limit)
    await this.checkRateLimits(tenantId, phone, false);

    // 3. Generate PDF if required and doesn't exist (or regenerate for freshness)
    let pdfUrl = invoice.pdfUrl;
    if (includesPdf && (!pdfUrl || pdfUrl.startsWith('file://'))) {
      try {
        pdfUrl = await this.pdfService.generateInvoicePdf(invoice, tenant, customer);
        await this.db.invoice.update({
          where: { id: invoiceId },
          data: { pdfUrl },
        });
      } catch (err: any) {
        this.logger.error(`PDF generation failed: ${err.message}`, err.stack);
        // If R2 credentials are missing, we use a placeholder online PDF for Meta compatibility
        pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      }
    }

    const formattedAmount = `₹${parseFloat(invoice.totalAmount.toString()).toLocaleString('en-IN')}`;
    const formattedDueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A';

    // 4. Construct template payload
    const templatePayload = this.templateService.buildInvoiceSentTemplate({
      customerName: customer.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: formattedAmount,
      dueDate: formattedDueDate,
      pdfUrl: pdfUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    });

    // 5. Send message
    const { messageId } = await this.metaApi.sendTemplate({
      to: phone,
      templateName: templatePayload.name,
      languageCode: templatePayload.language,
      components: templatePayload.components,
    });

    // 6. Write message log to database
    await this.db.whatsAppMessage.create({
      data: {
        tenantId,
        direction: MsgDirection.OUTBOUND,
        phone,
        messageId,
        type: 'template',
        content: JSON.parse(JSON.stringify(templatePayload)),
        templateName: templatePayload.name,
        entityType: 'invoice',
        entityId: invoiceId,
        status: MsgStatus.SENT,
        sentAt: new Date(),
      },
    });

    // 7. Increment rate limit counters
    await this.incrementRateLimits(tenantId, phone, false);

    return { messageId, status: MsgStatus.SENT };
  }

  /**
   * Sends an overdue payment reminder template or a custom plain text message.
   */
  async sendReminder(
    tenantId: string,
    invoiceId: string,
    customMessage?: string,
  ): Promise<{ messageId: string; status: MsgStatus }> {
    const invoice = await this.db.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found or unauthorized');
    }

    const customer = await this.db.customer.findUnique({
      where: { id: invoice.customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const phone = this.formatPhone(customer.phone || '');
    if (!phone) {
      throw new BadRequestException('Customer phone number is missing');
    }

    // This is a payment reminder (marketing/reminder category), so apply recipient rate limit of 1 per 24h
    await this.checkRateLimits(tenantId, phone, true);

    let messageId = '';
    let messageType = 'template';
    let content: any = {};

    if (customMessage) {
      // Send direct text override
      const result = await this.metaApi.sendText({
        to: phone,
        text: customMessage,
      });
      messageId = result.messageId;
      messageType = 'text';
      content = { text: customMessage };
    } else {
      // Calculate days pending/overdue
      let daysPending = 0;
      if (invoice.dueDate) {
        const diffTime = Date.now() - new Date(invoice.dueDate).getTime();
        daysPending = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      const formattedAmount = `₹${parseFloat(invoice.totalAmount.toString()).toLocaleString('en-IN')}`;
      const templatePayload = this.templateService.buildPaymentReminderTemplate({
        customerName: customer.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: formattedAmount,
        daysPending,
      });

      const result = await this.metaApi.sendTemplate({
        to: phone,
        templateName: templatePayload.name,
        languageCode: templatePayload.language,
        components: templatePayload.components,
      });
      messageId = result.messageId;
      content = JSON.parse(JSON.stringify(templatePayload));
    }

    // Log the message to DB
    await this.db.whatsAppMessage.create({
      data: {
        tenantId,
        direction: MsgDirection.OUTBOUND,
        phone,
        messageId,
        type: messageType,
        content,
        templateName: messageType === 'template' ? 'bizsaathi_payment_reminder' : null,
        entityType: 'reminder',
        entityId: invoiceId,
        status: MsgStatus.SENT,
        sentAt: new Date(),
      },
    });

    await this.incrementRateLimits(tenantId, phone, true);

    return { messageId, status: MsgStatus.SENT };
  }

  /**
   * Bulk reminders processing. Sends reminders to all overdue invoices or a list of specific invoice IDs.
   */
  async sendBulkReminders(
    tenantId: string,
    invoiceIds?: string[],
    daysOverdue?: number,
  ): Promise<{ sent: number; skipped: number; failed: number; details: any[] }> {
    const today = new Date();
    
    // Define criteria
    const whereClause: any = {
      tenantId,
      status: {
        in: ['SENT', 'PARTIAL', 'OVERDUE'], // pending statuses
      },
    };

    if (invoiceIds && invoiceIds.length > 0) {
      whereClause.id = { in: invoiceIds };
    } else if (daysOverdue && daysOverdue > 0) {
      const overdueDate = new Date(today.getTime() - daysOverdue * 24 * 60 * 60 * 1000);
      whereClause.dueDate = { lt: overdueDate };
    } else {
      whereClause.dueDate = { lt: today }; // general overdue
    }

    const invoices = await this.db.invoice.findMany({
      where: whereClause,
    });

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: any[] = [];

    for (const invoice of invoices) {
      try {
        const customer = await this.db.customer.findUnique({
          where: { id: invoice.customerId },
        });

        if (!customer || !customer.phone) {
          skippedCount++;
          details.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: 'SKIPPED',
            reason: 'Customer phone number missing',
          });
          continue;
        }

        const phone = this.formatPhone(customer.phone);
        
        // Quick phone rate limit check before trying to send
        const phoneKey = `wa:rate:${tenantId}:${phone}:daily`;
        const phoneSentToday = await this.redis.get(phoneKey);
        if (phoneSentToday) {
          skippedCount++;
          details.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: 'SKIPPED',
            reason: 'Rate limit: Already sent a reminder to this phone within last 24h',
          });
          continue;
        }

        // Send reminder
        const res = await this.sendReminder(tenantId, invoice.id);
        sentCount++;
        details.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: 'SENT',
          messageId: res.messageId,
        });

        // Add 500ms delay between consecutive bulk sends to respect API pacing
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err: any) {
        failedCount++;
        details.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: 'FAILED',
          reason: err.message,
        });
      }
    }

    return {
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount,
      details,
    };
  }

  /**
   * Sends a staff salary slip PDF via WhatsApp using the bizsaathi_salary_slip template.
   */
  async sendSalarySlip(tenantId: string, payrollId: string): Promise<{ messageId: string; status: MsgStatus }> {
    const payroll = await this.db.payroll.findFirst({
      where: { id: payrollId, tenantId },
      include: { staff: true },
    });

    if (!payroll) {
      throw new BadRequestException('Payroll record not found or unauthorized');
    }

    const staff = payroll.staff;
    const phone = this.formatPhone(staff.phone);
    if (!phone) {
      throw new BadRequestException('Staff phone number is missing');
    }

    await this.checkRateLimits(tenantId, phone, false);

    const pdfUrl = payroll.slipUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    const formattedSalary = `₹${parseFloat(payroll.netSalary.toString()).toLocaleString('en-IN')}`;

    const templatePayload = this.templateService.buildSalarySlipTemplate({
      staffName: staff.name,
      month: payroll.month,
      netSalary: formattedSalary,
      pdfUrl,
    });

    const { messageId } = await this.metaApi.sendTemplate({
      to: phone,
      templateName: templatePayload.name,
      languageCode: templatePayload.language,
      components: templatePayload.components,
    });

    await this.db.whatsAppMessage.create({
      data: {
        tenantId,
        direction: MsgDirection.OUTBOUND,
        phone,
        messageId,
        type: 'template',
        content: JSON.parse(JSON.stringify(templatePayload)),
        templateName: templatePayload.name,
        entityType: 'report',
        entityId: payrollId,
        status: MsgStatus.SENT,
        sentAt: new Date(),
      },
    });

    await this.incrementRateLimits(tenantId, phone, false);

    return { messageId, status: MsgStatus.SENT };
  }

  /**
   * Direct plain text sending endpoint for opted-in numbers.
   */
  async sendDirectText(tenantId: string, phoneStr: string, message: string): Promise<{ messageId: string; status: MsgStatus }> {
    const phone = this.formatPhone(phoneStr);
    
    await this.checkRateLimits(tenantId, phone, false);

    const { messageId } = await this.metaApi.sendText({
      to: phone,
      text: message,
    });

    await this.db.whatsAppMessage.create({
      data: {
        tenantId,
        direction: MsgDirection.OUTBOUND,
        phone,
        messageId,
        type: 'text',
        content: { text: message },
        status: MsgStatus.SENT,
        sentAt: new Date(),
      },
    });

    await this.incrementRateLimits(tenantId, phone, false);

    return { messageId, status: MsgStatus.SENT };
  }

  /**
   * Retrieves log history of WhatsApp messages for a tenant.
   */
  async getMessages(
    tenantId: string,
    phone?: string,
    entityId?: string,
    status?: MsgStatus,
    page = 1,
    limit = 20,
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const whereClause: any = { tenantId };

    if (phone) {
      whereClause.phone = this.formatPhone(phone);
    }
    if (entityId) {
      whereClause.entityId = entityId;
    }
    if (status) {
      whereClause.status = status;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.whatsAppMessage.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.whatsAppMessage.count({ where: whereClause }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Aggregates analytics/statistics on WhatsApp message deliveries for a tenant.
   */
  async getMessageStats(tenantId: string): Promise<any> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const messages = await this.db.whatsAppMessage.findMany({
      where: {
        tenantId,
        direction: MsgDirection.OUTBOUND,
        createdAt: { gte: startOfMonth },
      },
    });

    const sent = messages.filter(m => m.status === 'SENT' || m.status === 'DELIVERED' || m.status === 'READ').length;
    const delivered = messages.filter(m => m.status === 'DELIVERED' || m.status === 'READ').length;
    const read = messages.filter(m => m.status === 'READ').length;
    const failed = messages.filter(m => m.status === 'FAILED').length;
    const total = messages.length;

    const deliveryRate = total > 0 ? parseFloat(((delivered / total) * 100).toFixed(1)) : 100.0;
    const readRate = delivered > 0 ? parseFloat(((read / delivered) * 100).toFixed(1)) : 0.0;

    return {
      thisMonth: {
        sent,
        delivered,
        read,
        failed,
        deliveryRate,
        readRate,
      },
    };
  }
}
