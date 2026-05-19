import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseAnalyticsService } from './expense-analytics.service';
import { DatabaseService } from '../database/database.service';
import { Decimal } from 'decimal.js';

describe('ExpenseAnalyticsService', () => {
  let service: ExpenseAnalyticsService;
  let prisma: DatabaseService;

  const mockPrisma = {
    invoice: {
      aggregate: jest.fn(),
    },
    expense: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseAnalyticsService,
        {
          provide: DatabaseService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ExpenseAnalyticsService>(ExpenseAnalyticsService);
    prisma = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfitLoss', () => {
    it('should correctly calculate profit and loss', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: {
          paidAmount: new Decimal(10000),
          totalAmount: new Decimal(15000),
        },
      });

      mockPrisma.expense.aggregate.mockResolvedValue({
        _sum: {
          totalAmount: new Decimal(4000),
        },
      });

      const result = await service.getProfitLoss('tenant-1');

      expect(result.totalRevenueCollected).toBe(10000);
      expect(result.totalRevenueBilled).toBe(15000);
      expect(result.totalExpenses).toBe(4000);
      expect(result.netProfit).toBe(6000); // 10000 - 4000
      expect(result.profitMargin).toBe(60); // (6000 / 10000) * 100
    });

    it('should handle zero revenue correctly', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: {
          paidAmount: null,
          totalAmount: null,
        },
      });

      mockPrisma.expense.aggregate.mockResolvedValue({
        _sum: {
          totalAmount: new Decimal(4000),
        },
      });

      const result = await service.getProfitLoss('tenant-1');

      expect(result.totalRevenueCollected).toBe(0);
      expect(result.totalRevenueBilled).toBe(0);
      expect(result.totalExpenses).toBe(4000);
      expect(result.netProfit).toBe(-4000);
      expect(result.profitMargin).toBe(0);
    });
  });

  describe('getExpensesByCategory', () => {
    it('should aggregate expenses by category correctly', async () => {
      const expenses = [
        {
          categoryId: 'cat-1',
          totalAmount: new Decimal(100),
          category: { name: 'Food', color: '#123' },
        },
        {
          categoryId: 'cat-1',
          totalAmount: new Decimal(200),
          category: { name: 'Food', color: '#123' },
        },
        {
          categoryId: 'cat-2',
          totalAmount: new Decimal(50),
          category: { name: 'Travel', color: '#456' },
        },
      ];

      mockPrisma.expense.findMany.mockResolvedValue(expenses);

      const result = await service.getExpensesByCategory('tenant-1');

      expect(result).toHaveLength(2);
      expect(result[0].categoryName).toBe('Food');
      expect(result[0].total).toBe(300);
      expect(result[1].categoryName).toBe('Travel');
      expect(result[1].total).toBe(50);
    });
  });
});
