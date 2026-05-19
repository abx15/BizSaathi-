import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { EmployeeCodeService } from './employee-code.service';

@Module({
  controllers: [StaffController],
  providers: [StaffService, EmployeeCodeService],
  exports: [StaffService],
})
export class StaffModule {}
