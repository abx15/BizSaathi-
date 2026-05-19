import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseAnalyticsService } from './expense-analytics.service';
import { ExpenseController } from './expense.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ExpenseController],
  providers: [ExpenseService, ExpenseAnalyticsService],
  exports: [ExpenseService, ExpenseAnalyticsService],
})
export class ExpenseModule {}
