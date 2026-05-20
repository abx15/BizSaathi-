import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { QueueService } from '../queue/queue.service';
import { PayrollCalculatorService } from './payroll-calculator.service';
import { SalarySlipService } from './salary-slip.service';
import { ProcessPayrollDto } from './dto/process-payroll.dto';
import { PayrollFilterDto } from './dto/payroll-filter.dto';
import { PaySalaryDto } from './dto/pay-salary.dto';
import { PayrollStatus, PaymentMethod, Staff } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly redis: RedisService,
    private readonly calculator: PayrollCalculatorService,
    private readonly salarySlip: SalarySlipService,
    private readonly queue: QueueService,
  ) {}

  async process(tenantId: string, dto: ProcessPayrollDto) {
    const { month, bonus, otherDeductions } = dto;

    // Get staff to process
    const staffWhere: Record<string, unknown> = {
      tenantId,
      status: 'ACTIVE',
    };
    if (dto.staffIds && dto.staffIds.length > 0) {
      staffWhere.id = { in: dto.staffIds };
    }

    const staffList = await this.prisma.staff.findMany({
      where: staffWhere as any,
    });

    if (staffList.length === 0) {
      throw new BadRequestException('No active staff found to process');
    }

    // Parse month
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0);

    // Calculate working days (exclude Sundays)
    let workingDays = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      if (current.getDay() !== 0) workingDays++;
      current.setDate(current.getDate() + 1);
    }

    const results: Array<{ staffId: string; name: string; netSalary: number }> = [];

    for (const staff of staffList) {
      // Check if payroll already exists for this month
      const existing = await this.prisma.payroll.findFirst({
        where: { tenantId, staffId: staff.id, month },
      });
      if (existing) {
        this.logger.warn(`Payroll already exists for ${staff.name} (${month}), skipping`);
        continue;
      }

      // Get attendance summary
      const attendances = await this.prisma.attendance.findMany({
        where: {
          staffId: staff.id,
          date: { gte: startDate, lte: endDate },
        },
      });

      const presentFull = attendances.filter((a) => a.status === 'PRESENT').length;
      const halfDayCount = attendances.filter((a) => a.status === 'HALF_DAY').length;
      const presentDays = presentFull + halfDayCount * 0.5;
      const onLeaveCount = attendances.filter((a) => a.status === 'ON_LEAVE').length;
      const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;
      const totalOvertimeHours = attendances.reduce(
        (sum, a) => sum + Number(a.overtime || 0),
        0,
      );

      // Get approved paid leaves for this month
      const approvedLeaves = await this.prisma.leave.findMany({
        where: {
          staffId: staff.id,
          tenantId,
          status: 'APPROVED',
          leaveType: { notIn: ['UNPAID'] },
          fromDate: { lte: endDate },
          toDate: { gte: startDate },
        },
      });
      const leaveDays = approvedLeaves.reduce((sum, l) => sum + l.days, 0);

      const calcResult = this.calculator.calculate({
        basicSalary: Number(staff.basicSalary),
        hra: Number(staff.hra),
        allowances: Number(staff.allowances),
        workingDays,
        presentDays,
        leaveDays: onLeaveCount, // use attendance-counted leave days
        overtimeHours: totalOvertimeHours,
        pfEnabled: staff.pfEnabled,
        esicEnabled: staff.esicEnabled,
        tdsEnabled: staff.tdsEnabled,
        bonus,
        otherDeductions,
      });

      const createdPayroll = await this.prisma.payroll.create({
        data: {
          tenantId,
          staffId: staff.id,
          month,
          workingDays,
          presentDays: Math.floor(presentDays),
          absentDays: absentCount,
          leaveDays: onLeaveCount,
          overtimeHours: totalOvertimeHours,
          basicSalary: calcResult.proportionalBasic,
          hra: calcResult.proportionalHra,
          allowances: calcResult.proportionalAllowances,
          overtimePay: calcResult.overtimePay,
          bonus: calcResult.bonus,
          grossSalary: calcResult.grossSalary,
          pfEmployee: calcResult.pfEmployee,
          pfEmployer: calcResult.pfEmployer,
          esicEmployee: calcResult.esicEmployee,
          esicEmployer: calcResult.esicEmployer,
          tds: calcResult.tds,
          otherDeductions: calcResult.otherDeductions,
          totalDeductions: calcResult.totalDeductions,
          netSalary: calcResult.netSalary,
          status: PayrollStatus.DRAFT,
        },
      });

      // After payroll processed, queue slips generation and email delivery
      await this.queue.generateSalarySlip({
        payrollId: createdPayroll.id,
        tenantId,
        staffId: staff.id,
        month,
      });

      if (staff.email) {
        await this.queue.sendPayslipEmail({
          invoiceId: createdPayroll.id, // Using payroll ID here as the identifier
          tenantId,
          recipientEmail: staff.email,
        });
      }

      results.push({
        staffId: staff.id,
        name: staff.name,
        netSalary: calcResult.netSalary,
      });
    }

    // Push realtime event
    await this.queue.pushRealtimeEvent({
      tenantId,
      eventType: 'payroll.processed',
      eventPayload: {
        month,
        count: results.length,
      },
    });

    const totalNet = results.reduce((s, r) => s + r.netSalary, 0);
    return {
      processed: results.length,
      totalNetSalary: parseFloat(totalNet.toFixed(2)),
      details: results,
    };
  }

  async findAll(tenantId: string, filter: PayrollFilterDto) {
    const where: Record<string, unknown> = { tenantId };
    if (filter.month) where.month = filter.month;
    if (filter.status) where.status = filter.status;
    if (filter.staffId) where.staffId = filter.staffId;

    return this.prisma.payroll.findMany({
      where: where as any,
      include: {
        staff: {
          select: { name: true, employeeCode: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSummary(tenantId: string, month: string) {
    const payrolls = await this.prisma.payroll.findMany({
      where: { tenantId, month },
    });

    const totalStaff = payrolls.length;
    const totalGross = payrolls.reduce((s, p) => s + Number(p.grossSalary), 0);
    const totalDeductions = payrolls.reduce(
      (s, p) => s + Number(p.totalDeductions),
      0,
    );
    const totalNet = payrolls.reduce((s, p) => s + Number(p.netSalary), 0);
    const totalPfEmployer = payrolls.reduce(
      (s, p) => s + Number(p.pfEmployer),
      0,
    );
    const totalEsicEmployer = payrolls.reduce(
      (s, p) => s + Number(p.esicEmployer),
      0,
    );

    // Overall status: if any DRAFT exists it's DRAFT, else PAID
    const hasDraft = payrolls.some((p) => p.status === 'DRAFT');
    const hasProcessed = payrolls.some((p) => p.status === 'PROCESSED');

    return {
      month,
      totalStaff,
      totalGross: parseFloat(totalGross.toFixed(2)),
      totalDeductions: parseFloat(totalDeductions.toFixed(2)),
      totalNet: parseFloat(totalNet.toFixed(2)),
      totalPfEmployer: parseFloat(totalPfEmployer.toFixed(2)),
      totalEsicEmployer: parseFloat(totalEsicEmployer.toFixed(2)),
      status: hasDraft ? 'DRAFT' : hasProcessed ? 'PROCESSED' : 'PAID',
    };
  }

  async updateOne(tenantId: string, payrollId: string, data: Partial<{ bonus: number; otherDeductions: number; note: string }>) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id: payrollId, tenantId },
      include: { staff: true },
    });

    if (!payroll) throw new NotFoundException('Payroll record not found');
    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new ForbiddenException('Only DRAFT payrolls can be edited');
    }

    // Recalculate if bonus or deductions changed
    const newBonus = data.bonus !== undefined ? data.bonus : Number(payroll.bonus);
    const newOtherDed = data.otherDeductions !== undefined
      ? data.otherDeductions
      : Number(payroll.otherDeductions);

    const calcResult = this.calculator.calculate({
      basicSalary: Number(payroll.staff.basicSalary),
      hra: Number(payroll.staff.hra),
      allowances: Number(payroll.staff.allowances),
      workingDays: payroll.workingDays,
      presentDays: payroll.presentDays,
      leaveDays: payroll.leaveDays,
      overtimeHours: Number(payroll.overtimeHours),
      pfEnabled: payroll.staff.pfEnabled,
      esicEnabled: payroll.staff.esicEnabled,
      tdsEnabled: payroll.staff.tdsEnabled,
      bonus: newBonus,
      otherDeductions: newOtherDed,
    });

    return this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        bonus: calcResult.bonus,
        otherDeductions: calcResult.otherDeductions,
        grossSalary: calcResult.grossSalary,
        totalDeductions: calcResult.totalDeductions,
        netSalary: calcResult.netSalary,
        note: data.note,
      },
    });
  }

  async payAll(tenantId: string, dto: PaySalaryDto) {
    const draftPayrolls = await this.prisma.payroll.findMany({
      where: { tenantId, month: dto.month, status: PayrollStatus.DRAFT },
    });

    if (draftPayrolls.length === 0) {
      throw new BadRequestException('No DRAFT payrolls found for this month');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payroll.updateMany({
        where: { tenantId, month: dto.month, status: PayrollStatus.DRAFT },
        data: {
          status: PayrollStatus.PAID,
          paymentMethod: dto.paymentMethod as PaymentMethod,
          paidAt: new Date(dto.paidAt),
        },
      });
    });

    this.logger.log(
      `[PAYROLL_PAID] ${draftPayrolls.length} payrolls marked PAID for ${dto.month}`,
    );

    // Queue background jobs for salary slip generation
    for (const payroll of draftPayrolls) {
      await this.queue.generateSalarySlip({
        payrollId: payroll.id,
        tenantId,
        staffId: payroll.staffId,
        month: payroll.month,
      });
    }

    // Push real-time event
    await this.queue.pushRealtimeEvent({
      tenantId,
      eventType: 'payroll:paid',
      eventPayload: {
        month: dto.month,
        count: draftPayrolls.length,
      },
    });

    return {
      paid: draftPayrolls.length,
      month: dto.month,
      message: 'Salary slip PDF generation queued',
    };
  }

  async paySingle(tenantId: string, payrollId: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id: payrollId, tenantId },
    });

    if (!payroll) throw new NotFoundException('Payroll record not found');
    if (payroll.status === PayrollStatus.PAID) {
      throw new ForbiddenException('Payroll already paid');
    }

    const updated = await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: PayrollStatus.PAID,
        paidAt: new Date(),
      },
    });

    // Queue salary slip generation
    await this.queue.generateSalarySlip({
      payrollId: updated.id,
      tenantId,
      staffId: updated.staffId,
      month: updated.month,
    });

    // Push real-time event
    await this.queue.pushRealtimeEvent({
      tenantId,
      eventType: 'payroll:paid:single',
      eventPayload: {
        payrollId: updated.id,
        staffId: updated.staffId,
        month: updated.month,
      },
    });

    return updated;
  }

  async getSlip(tenantId: string, payrollId: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id: payrollId, tenantId },
      include: { staff: true },
    });

    if (!payroll) throw new NotFoundException('Payroll record not found');

    // Check Redis cache for slip URL
    const cacheKey = `slip:${payrollId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { url: cached, cached: true };
    }

    // If already generated, return existing URL
    if (payroll.slipUrl) {
      await this.redis.set(cacheKey, payroll.slipUrl, 3600);
      return { url: payroll.slipUrl, cached: false };
    }

    // Generate the PDF
    const url = await this.salarySlip.generate(tenantId, payrollId, {
      businessName: 'BizSaathi Business', // TODO: fetch from tenant profile
      month: payroll.month,
      employeeName: payroll.staff.name,
      employeeCode: payroll.staff.employeeCode,
      designation: payroll.staff.role,
      department: payroll.staff.department || 'N/A',
      joiningDate: payroll.staff.joiningDate.toISOString().split('T')[0],
      bankName: payroll.staff.bankName || '',
      accountNumber: payroll.staff.accountNumber || '',
      ifscCode: payroll.staff.ifscCode || '',
      workingDays: payroll.workingDays,
      presentDays: payroll.presentDays,
      absentDays: payroll.absentDays,
      leaveDays: payroll.leaveDays,
      basicSalary: Number(payroll.basicSalary),
      hra: Number(payroll.hra),
      allowances: Number(payroll.allowances),
      overtimePay: Number(payroll.overtimePay),
      bonus: Number(payroll.bonus),
      grossSalary: Number(payroll.grossSalary),
      pfEmployee: Number(payroll.pfEmployee),
      esicEmployee: Number(payroll.esicEmployee),
      tds: Number(payroll.tds),
      otherDeductions: Number(payroll.otherDeductions),
      totalDeductions: Number(payroll.totalDeductions),
      netSalary: Number(payroll.netSalary),
    });

    // Store URL in payroll record and cache
    await this.prisma.payroll.update({
      where: { id: payrollId },
      data: { slipUrl: url },
    });
    await this.redis.set(cacheKey, url, 3600); // Cache 1 hour

    return { url, cached: false };
  }
}
