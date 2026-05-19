import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async create(tenantId: string, createCustomerDto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        tenantId,
      },
    });
    
    // Invalidate cache
    const keys = await this.redis.getClient().keys(`customers:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.getClient().del(...keys);
    }
    return customer;
  }

  async findAll(tenantId: string, search?: string, page = 1, limit = 20) {
    const cacheKey = `customers:${tenantId}:search:${search || ''}:page:${page}:limit:${limit}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const where: any = {
      tenantId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { gstin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const result = {
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache for 5 minutes
    await this.redis.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Calculate total billed amount for this customer
    const invoices = await this.prisma.invoice.aggregate({
      where: { tenantId, customerId: id, status: { not: 'CANCELLED' } },
      _sum: {
        totalAmount: true,
      },
    });

    return {
      ...customer,
      totalBilled: invoices._sum.totalAmount || 0,
    };
  }

  async update(tenantId: string, id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, isActive: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });

    const keys = await this.redis.getClient().keys(`customers:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.getClient().del(...keys);
    }
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, isActive: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if pending invoices exist
    const pendingInvoices = await this.prisma.invoice.count({
      where: {
        tenantId,
        customerId: id,
        status: { in: ['DRAFT', 'SENT', 'PARTIAL', 'OVERDUE'] },
      },
    });

    if (pendingInvoices > 0) {
      throw new BadRequestException('Cannot delete customer with pending invoices');
    }

    await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    const keys = await this.redis.getClient().keys(`customers:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.getClient().del(...keys);
    }
    return { success: true };
  }
}
