import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollCalculatorService } from './payroll-calculator.service';
import { SalarySlipService } from './salary-slip.service';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, PayrollCalculatorService, SalarySlipService],
  exports: [PayrollService, PayrollCalculatorService],
})
export class PayrollModule {}
