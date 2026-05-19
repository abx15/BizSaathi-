import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ExpenseAnalyticsService {
  constructor(private readonly prisma: DatabaseService) {}

  async getProfitLoss(tenantId: string, startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.gte = new Date(startDate);
      dateFilter.lte = new Date(endDate);
    }

    const revenueQuery: any = { tenantId, status: { in: ['PAID', 'PARTIAL'] } };
    if (startDate && endDate) {
      revenueQuery.invoiceDate = dateFilter;
    }
    
    const revenueAggr = await this.prisma.invoice.aggregate({
      where: revenueQuery,
      _sum: {
        paidAmount: true,
        totalAmount: true,
      },
    });

    const expenseQuery: any = { tenantId };
    if (startDate && endDate) {
      expenseQuery.expenseDate = dateFilter;
    }

    const expenseAggr = await this.prisma.expense.aggregate({
      where: expenseQuery,
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenueCollected = revenueAggr._sum.paidAmount?.toNumber() || 0;
    const totalRevenueBilled = revenueAggr._sum.totalAmount?.toNumber() || 0;
    const totalExpenses = expenseAggr._sum.totalAmount?.toNumber() || 0;
    
    const netProfit = totalRevenueCollected - totalExpenses;
    const profitMargin = totalRevenueCollected > 0 ? (netProfit / totalRevenueCollected) * 100 : 0;

    return {
      totalRevenueCollected,
      totalRevenueBilled,
      totalExpenses,
      netProfit,
      profitMargin: Number(profitMargin.toFixed(2)),
    };
  }

  async getExpensesByCategory(tenantId: string, startDate?: string, endDate?: string) {
    const expenseQuery: any = { tenantId };
    if (startDate && endDate) {
      expenseQuery.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const expenses = await this.prisma.expense.findMany({
      where: expenseQuery,
      include: {
        category: true,
      },
    });

    const categoryMap = new Map<string, { categoryName: string; total: number; color: string }>();

    for (const exp of expenses) {
      const catId = exp.categoryId;
      const catName = exp.category?.name || 'Uncategorized';
      const color = exp.category?.color || '#CBD5E1';
      
      const amount = exp.totalAmount.toNumber();
      
      if (categoryMap.has(catId)) {
        categoryMap.get(catId)!.total += amount;
      } else {
        categoryMap.set(catId, { categoryName: catName, total: amount, color });
      }
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
  }
}
