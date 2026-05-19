import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

const DEFAULT_CATEGORIES = [
  { name: 'Office Supplies', icon: '📎', color: '#3B82F6' },
  { name: 'Rent', icon: '🏢', color: '#10B981' },
  { name: 'Utilities', icon: '⚡', color: '#F59E0B' },
  { name: 'Travel', icon: '✈️', color: '#6366F1' },
  { name: 'Meals & Entertainment', icon: '🍽️', color: '#EC4899' },
  { name: 'Marketing', icon: '📢', color: '#8B5CF6' },
  { name: 'Software/SaaS', icon: '💻', color: '#14B8A6' },
  { name: 'Legal & Professional Fees', icon: '⚖️', color: '#64748B' },
  { name: 'Repairs & Maintenance', icon: '🔧', color: '#F97316' },
  { name: 'Taxes & Licenses', icon: '📜', color: '#EF4444' },
];

@Injectable()
export class CategorySeeder implements OnModuleInit {
  private readonly logger = new Logger(CategorySeeder.name);

  constructor(private readonly prisma: DatabaseService) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    this.logger.log('Checking default expense categories...');
    for (const cat of DEFAULT_CATEGORIES) {
      const exists = await this.prisma.expenseCategory.findFirst({
        where: { name: cat.name, isDefault: true, tenantId: null },
      });

      if (!exists) {
        await this.prisma.expenseCategory.create({
          data: {
            ...cat,
            isDefault: true,
          },
        });
        this.logger.log(`Created default category: ${cat.name}`);
      }
    }
    this.logger.log('Default categories synced.');
  }
}
