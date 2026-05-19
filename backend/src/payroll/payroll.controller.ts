import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { ProcessPayrollDto } from './dto/process-payroll.dto';
import { PayrollFilterDto } from './dto/payroll-filter.dto';
import { PaySalaryDto } from './dto/pay-salary.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('process')
  @ApiOperation({ summary: 'Process payroll for a month' })
  process(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ProcessPayrollDto,
  ) {
    return this.payrollService.process(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payroll records with filters' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filter: PayrollFilterDto,
  ) {
    return this.payrollService.findAll(tenantId, filter);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get payroll summary for a month' })
  @ApiQuery({ name: 'month', required: true, example: '2025-01' })
  getSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query('month') month: string,
  ) {
    return this.payrollService.getSummary(tenantId, month);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit DRAFT payroll (bonus, deductions, note)' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() data: { bonus?: number; otherDeductions?: number; note?: string },
  ) {
    return this.payrollService.updateOne(tenantId, id, data);
  }

  @Post('pay-all')
  @ApiOperation({ summary: 'Mark all DRAFT payrolls for a month as PAID' })
  payAll(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: PaySalaryDto,
  ) {
    return this.payrollService.payAll(tenantId, dto);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Mark a single payroll as PAID' })
  paySingle(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.paySingle(tenantId, id);
  }

  @Get(':id/slip')
  @ApiOperation({ summary: 'Generate or retrieve salary slip PDF' })
  getSlip(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.getSlip(tenantId, id);
  }
}
