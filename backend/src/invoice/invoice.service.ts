import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { GstService } from './gst.service';
import { InvoiceNumberService } from './invoice-number.service';
import { PdfService } from './pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly redis: RedisService,
    private readonly gstService: GstService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly pdfService: PdfService,
  ) {}

  async create(tenantId: string, dto: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId, isActive: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const tenantState = tenant.address || ''; 
    const isInterState = !!dto.placeOfSupply && tenantState !== dto.placeOfSupply;

    const processedItems = dto.items.map(item => {
      const gstDetails = this.gstService.calculateItemGst(
        item.quantity,
        item.rate,
        item.discount || 0,
        item.gstRate || 18,
        isInterState,
      );

      return {
        ...item,
        productId: item.productId || null,
        amount: gstDetails.taxableAmount.toNumber(),
        cgst: gstDetails.cgst.toNumber(),
        sgst: gstDetails.sgst.toNumber(),
        igst: gstDetails.igst.toNumber(),
        gstRate: item.gstRate || 18,
        discount: item.discount || 0,
      };
    });

    const summary = this.gstService.summarizeInvoice(processedItems);
    const invoiceNumber = await this.invoiceNumberService.generateNextInvoiceNumber(tenantId, new Date(dto.invoiceDate));

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        customerId: dto.customerId,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        isGstInvoice: dto.isGstInvoice ?? true,
        placeOfSupply: dto.placeOfSupply,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
        subtotal: summary.subtotal.toNumber(),
        totalCgst: summary.totalCgst.toNumber(),
        totalSgst: summary.totalSgst.toNumber(),
        totalIgst: summary.totalIgst.toNumber(),
        totalAmount: summary.totalAmount.toNumber(),
        status: InvoiceStatus.DRAFT,
        items: {
          create: processedItems.map(item => ({
            productId: item.productId,
            name: item.name,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            unit: item.unit || 'pcs',
            rate: item.rate,
            discount: item.discount,
            gstRate: item.gstRate,
            cgst: item.cgst,
            sgst: item.sgst,
            igst: item.igst,
            amount: item.amount,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    await this.redis.del(`dashboard:${tenantId}`);
    return invoice;
  }

  async findAll(tenantId: string, filter: InvoiceFilterDto) {
    const { status, customerId, from, to, search, page = '1', limit = '20' } = filter;
    
    const where: any = { tenantId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (from && to) {
      where.invoiceDate = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }
    if (search) {
      where.invoiceNumber = { contains: search, mode: 'insensitive' };
    }

    const skip = (+page - 1) * +limit;
    const [invoices, total, summary] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { invoiceDate: 'desc' },
        include: { customer: { select: { name: true } } },
      }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
    ]);

    const statusCounts = summary.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as any);

    return {
      data: invoices,
      summary: {
        total: total,
        paid: statusCounts.PAID || 0,
        pending: (statusCounts.SENT || 0) + (statusCounts.PARTIAL || 0) + (statusCounts.DRAFT || 0),
        overdue: statusCounts.OVERDUE || 0,
      },
      meta: {
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / +limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { items: true, customer: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId }, include: { customer: true } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ForbiddenException('Only DRAFT invoices can be edited');
    }

    const dataToUpdate: any = {
      invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      isGstInvoice: dto.isGstInvoice,
      placeOfSupply: dto.placeOfSupply,
      notes: dto.notes,
      termsConditions: dto.termsConditions,
    };

    if (dto.items && dto.items.length > 0) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      const tenantState = tenant?.address || '';
      const actualInterState = !!(dto.placeOfSupply || invoice.placeOfSupply) && tenantState !== (dto.placeOfSupply || invoice.placeOfSupply);

      const processedItems = dto.items.map(item => {
        const gstDetails = this.gstService.calculateItemGst(
          item.quantity, item.rate, item.discount || 0, item.gstRate || 18, actualInterState
        );
        return {
          ...item,
          productId: item.productId || null,
          amount: gstDetails.taxableAmount.toNumber(),
          cgst: gstDetails.cgst.toNumber(),
          sgst: gstDetails.sgst.toNumber(),
          igst: gstDetails.igst.toNumber(),
          gstRate: item.gstRate || 18,
          discount: item.discount || 0,
        };
      });

      const summary = this.gstService.summarizeInvoice(processedItems);
      
      dataToUpdate.subtotal = summary.subtotal.toNumber();
      dataToUpdate.totalCgst = summary.totalCgst.toNumber();
      dataToUpdate.totalSgst = summary.totalSgst.toNumber();
      dataToUpdate.totalIgst = summary.totalIgst.toNumber();
      dataToUpdate.totalAmount = summary.totalAmount.toNumber();

      await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      dataToUpdate.items = {
        create: processedItems.map(item => ({
          productId: item.productId,
          name: item.name,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          rate: item.rate,
          discount: item.discount,
          gstRate: item.gstRate,
          cgst: item.cgst,
          sgst: item.sgst,
          igst: item.igst,
          amount: item.amount,
        })),
      };
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: dataToUpdate,
      include: { items: true, customer: true },
    });

    await this.redis.del(`dashboard:${tenantId}`);
    return updated;
  }

  async send(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== InvoiceStatus.DRAFT) throw new ForbiddenException('Only DRAFT invoices can be sent');

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.SENT },
    });

    this.logger.log(`[BullMQ Simulation] Queued WhatsApp message for invoice ${invoice.invoiceNumber}`);
    await this.redis.del(`dashboard:${tenantId}`);
    return updated;
  }

  async addPayment(tenantId: string, id: string, dto: AddPaymentDto) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === InvoiceStatus.PAID) throw new ForbiddenException('Invoice is already fully paid');

    const amountNum = Number(dto.amount);
    const newPaidAmount = Number(invoice.paidAmount) + amountNum;
    const totalAmount = Number(invoice.totalAmount);

    if (newPaidAmount > totalAmount) {
      throw new BadRequestException(`Overpayment not allowed. Balance due is ${totalAmount - Number(invoice.paidAmount)}`);
    }

    let newStatus: InvoiceStatus = invoice.status as InvoiceStatus;
    if (newStatus === InvoiceStatus.CANCELLED) {
       // Should never happen based on checks, but just to satisfy typescript
       newStatus = InvoiceStatus.DRAFT;
    }
    
    if (newPaidAmount === totalAmount) {
      newStatus = InvoiceStatus.PAID;
    } else if (newPaidAmount > 0) {
      newStatus = InvoiceStatus.PARTIAL;
    }

    const [payment, updatedInvoice] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          tenantId,
          invoiceId: id,
          amount: amountNum,
          method: dto.method || PaymentMethod.CASH,
          reference: dto.reference,
          note: dto.note,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        },
      }),
      this.prisma.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      })
    ]);

    await this.redis.del(`dashboard:${tenantId}`);
    return { payment, invoice: updatedInvoice };
  }

  async generatePdf(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { items: true, customer: true }
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const cacheKey = `invoice_pdf:${tenantId}:${id}`;
    const cachedUrl = await this.redis.get(cacheKey);
    if (cachedUrl && invoice.status !== InvoiceStatus.DRAFT) {
      return { url: cachedUrl };
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const url = await this.pdfService.generateInvoicePdf(invoice, tenant, invoice.customer);
    
    if (invoice.status !== InvoiceStatus.DRAFT) {
      await this.redis.set(cacheKey, url, 3600);
    }

    await this.prisma.invoice.update({
      where: { id },
      data: { pdfUrl: url.split('?')[0] },
    });

    return { url };
  }

  async remove(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== InvoiceStatus.DRAFT) throw new ForbiddenException('Only DRAFT invoices can be deleted');

    await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });

    await this.redis.del(`dashboard:${tenantId}`);
    return { success: true };
  }

  async getDashboard(tenantId: string) {
    const cacheKey = `dashboard:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const [thisMonthInvoices, overdueInvoices, recentInvoices, topCustomersQuery] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId, invoiceDate: { gte: firstDay }, status: { not: 'CANCELLED' } },
      }),
      this.prisma.invoice.findMany({
        where: { tenantId, status: 'OVERDUE' },
      }),
      this.prisma.invoice.findMany({
        where: { tenantId, status: { not: 'CANCELLED' } },
        orderBy: { invoiceDate: 'desc' },
        take: 5,
        include: { customer: { select: { name: true } } },
      }),
      this.prisma.invoice.groupBy({
        by: ['customerId'],
        where: { tenantId, invoiceDate: { gte: firstDay }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      })
    ]);

    const revenue = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const paidCount = thisMonthInvoices.filter(i => i.status === 'PAID').length;
    const pendingAmount = thisMonthInvoices.filter(i => i.status !== 'PAID').reduce((sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.paidAmount)), 0);

    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.paidAmount)), 0);

    const topCustomers = await Promise.all(topCustomersQuery.map(async (c) => {
      const cust = await this.prisma.customer.findUnique({ where: { id: c.customerId } });
      return {
        customerName: cust?.name,
        revenue: c._sum.totalAmount,
      };
    }));

    const result = {
      thisMonth: {
        revenue,
        invoiceCount: thisMonthInvoices.length,
        paidCount,
        pendingAmount,
      },
      overdue: {
        count: overdueInvoices.length,
        amount: overdueAmount,
      },
      recentInvoices,
      topCustomers,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getGstSummary(tenantId: string, month: string) {
    const from = new Date(`${month}-01`);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 0);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['SENT', 'PARTIAL', 'PAID'] },
        invoiceDate: { gte: from, lte: to },
      },
      include: { items: true },
    });

    let taxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;
    let totalWithTax = 0;

    const byRateMap = new Map<number, any>();

    for (const inv of invoices) {
      taxableAmount += Number(inv.subtotal);
      totalCgst += Number(inv.totalCgst);
      totalSgst += Number(inv.totalSgst);
      totalIgst += Number(inv.totalIgst);
      totalWithTax += Number(inv.totalAmount);

      for (const item of inv.items) {
        const rate = Number(item.gstRate);
        const itemTaxable = Number(item.amount);
        const itemCgst = Number(item.cgst);
        const itemSgst = Number(item.sgst);
        const itemIgst = Number(item.igst);

        if (!byRateMap.has(rate)) {
          byRateMap.set(rate, { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0 });
        }
        const bucket = byRateMap.get(rate);
        bucket.taxable += itemTaxable;
        bucket.cgst += itemCgst;
        bucket.sgst += itemSgst;
        bucket.igst += itemIgst;
      }
    }

    totalTax = totalCgst + totalSgst + totalIgst;

    return {
      period: month,
      taxableAmount,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      totalWithTax,
      byRate: Array.from(byRateMap.values()),
      invoiceCount: invoices.length,
    };
  }

  async getGstr1(tenantId: string, month: string) {
    const from = new Date(`${month}-01`);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 0);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['SENT', 'PARTIAL', 'PAID'] },
        invoiceDate: { gte: from, lte: to },
      },
      include: { customer: true, items: true },
    });

    const b2b: any = {};
    for (const inv of invoices) {
      if (inv.customer.gstin) {
        if (!b2b[inv.customer.gstin]) b2b[inv.customer.gstin] = [];
        b2b[inv.customer.gstin].push(inv);
      }
    }

    return {
      period: month,
      b2b,
    };
  }
}
