import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { Decimal } from 'decimal.js';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly storageService: StorageService,
    private readonly queue: QueueService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateExpenseDto) {
    const amount = new Decimal(dto.amount);
    const gstAmount = new Decimal(dto.gstAmount || 0);
    const totalAmount = amount.plus(gstAmount);

    const expenseDate = dto.expenseDate ? new Date(dto.expenseDate) : undefined;

    const expense = await this.prisma.expense.create({
      data: {
        ...dto,
        expenseDate,
        tenantId,
        createdBy: userId,
        amount,
        gstAmount,
        totalAmount,
      },
      include: {
        category: true,
      },
    });

    if (dto.receiptKey) {
      await this.prisma.fileUpload.updateMany({
        where: { key: dto.receiptKey, tenantId },
        data: {
          isTemporary: false,
          entityId: expense.id,
          entityType: 'expense',
          expiresAt: null,
        },
      });
    }

    // Queue AI background job to index the new expense
    await this.queue.indexEntity({
      tenantId,
      entityType: 'expense',
      entityId: expense.id,
      operation: 'upsert',
    });

    return expense;
  }

  async findAll(tenantId: string, filter: ExpenseFilterDto) {
    const where: any = { tenantId };

    if (filter.startDate && filter.endDate) {
      where.expenseDate = {
        gte: new Date(filter.startDate),
        lte: new Date(filter.endDate),
      };
    }
    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }
    if (filter.vendor) {
      where.vendor = { contains: filter.vendor, mode: 'insensitive' };
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        category: true,
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
      },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async update(tenantId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(tenantId, id);

    let amount = expense.amount;
    let gstAmount = expense.gstAmount;

    if (dto.amount !== undefined) amount = new Decimal(dto.amount);
    if (dto.gstAmount !== undefined) gstAmount = new Decimal(dto.gstAmount);

    const totalAmount = amount.plus(gstAmount);
    
    const expenseDate = dto.expenseDate ? new Date(dto.expenseDate) : undefined;

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...dto,
        expenseDate,
        amount,
        gstAmount,
        totalAmount,
      },
      include: {
        category: true,
      },
    });

    if (dto.receiptKey && dto.receiptKey !== expense.receiptKey) {
      await this.prisma.fileUpload.updateMany({
        where: { key: dto.receiptKey, tenantId },
        data: {
          isTemporary: false,
          entityId: updated.id,
          entityType: 'expense',
          expiresAt: null,
        },
      });
      if (expense.receiptKey) {
         try {
           await this.storageService.deleteFile(expense.receiptKey);
           await this.prisma.fileUpload.delete({ where: { key: expense.receiptKey } });
         } catch(e) {}
      }
    }

    // Queue AI background job to re-index the updated expense
    await this.queue.indexEntity({
      tenantId,
      entityType: 'expense',
      entityId: updated.id,
      operation: 'upsert',
    });

    return updated;
  }

  async remove(tenantId: string, id: string) {
    const expense = await this.findOne(tenantId, id);
    
    if (expense.receiptKey) {
      try {
        await this.storageService.deleteFile(expense.receiptKey);
        await this.prisma.fileUpload.deleteMany({ where: { key: expense.receiptKey } });
      } catch (e) {}
    }

    const deleted = await this.prisma.expense.delete({
      where: { id },
    });

    // Queue AI background job to delete the expense from the index
    await this.queue.indexEntity({
      tenantId,
      entityType: 'expense',
      entityId: id,
      operation: 'delete',
    });

    return deleted;
  }
}
