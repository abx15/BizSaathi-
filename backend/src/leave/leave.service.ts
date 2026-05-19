import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { LeaveStatus } from '@prisma/client';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  // Default annual leave balances
  private readonly LEAVE_BALANCES: Record<string, number> = {
    CASUAL: 12,
    SICK: 12,
    EARNED: 15,
    MATERNITY: 182,
    PATERNITY: 15,
    UNPAID: 365, // effectively unlimited
  };

  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Calculate business days between two dates, excluding Sundays.
   */
  private calculateDaysExcludingSundays(from: Date, to: Date): number {
    let count = 0;
    const current = new Date(from);
    while (current <= to) {
      if (current.getDay() !== 0) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  async apply(tenantId: string, dto: ApplyLeaveDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, tenantId },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);

    if (fromDate > toDate) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    // Check if attendance already marked PRESENT for any date in the range
    const existingPresent = await this.prisma.attendance.findMany({
      where: {
        staffId: dto.staffId,
        date: { gte: fromDate, lte: toDate },
        status: 'PRESENT',
      },
    });

    if (existingPresent.length > 0) {
      throw new BadRequestException(
        'Cannot apply leave for dates where attendance is already marked PRESENT',
      );
    }

    const days = this.calculateDaysExcludingSundays(fromDate, toDate);

    const leave = await this.prisma.leave.create({
      data: {
        tenantId,
        staffId: dto.staffId,
        leaveType: dto.leaveType,
        fromDate,
        toDate,
        days,
        reason: dto.reason,
        status: LeaveStatus.PENDING,
      },
    });

    return leave;
  }

  async findAll(
    tenantId: string,
    staffId?: string,
    status?: string,
    month?: string,
  ) {
    const where: Record<string, unknown> = { tenantId };

    if (staffId) where.staffId = staffId;
    if (status) where.status = status;

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const startDate = new Date(year, mon - 1, 1);
      const endDate = new Date(year, mon, 0);
      where.OR = [
        { fromDate: { gte: startDate, lte: endDate } },
        { toDate: { gte: startDate, lte: endDate } },
      ];
    }

    return this.prisma.leave.findMany({
      where: where as any,
      include: {
        staff: { select: { name: true, employeeCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(tenantId: string, leaveId: string, userId: string) {
    const leave = await this.prisma.leave.findFirst({
      where: { id: leaveId, tenantId, status: LeaveStatus.PENDING },
    });

    if (!leave) {
      throw new NotFoundException('Pending leave request not found');
    }

    // Transactionally approve + mark attendance
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.leave.update({
        where: { id: leaveId },
        data: {
          status: LeaveStatus.APPROVED,
          approvedBy: userId,
        },
      });

      // Auto-mark attendance as ON_LEAVE for each day in the range
      const current = new Date(leave.fromDate);
      const end = new Date(leave.toDate);
      while (current <= end) {
        if (current.getDay() !== 0) {
          // Skip Sundays
          await tx.attendance.upsert({
            where: {
              staffId_date: {
                staffId: leave.staffId,
                date: new Date(current),
              },
            },
            update: {
              status: 'ON_LEAVE',
              markedBy: userId,
            },
            create: {
              tenantId,
              staffId: leave.staffId,
              date: new Date(current),
              status: 'ON_LEAVE',
              markedBy: userId,
            },
          });
        }
        current.setDate(current.getDate() + 1);
      }

      return updated;
    });
  }

  async reject(
    tenantId: string,
    leaveId: string,
    userId: string,
    rejectionNote?: string,
  ) {
    const leave = await this.prisma.leave.findFirst({
      where: { id: leaveId, tenantId, status: LeaveStatus.PENDING },
    });

    if (!leave) {
      throw new NotFoundException('Pending leave request not found');
    }

    return this.prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.REJECTED,
        rejectedBy: userId,
        rejectionNote,
      },
    });
  }

  async getBalance(tenantId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, tenantId },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Get current calendar year range
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    // Get all approved leaves for this year
    const approvedLeaves = await this.prisma.leave.findMany({
      where: {
        staffId,
        tenantId,
        status: LeaveStatus.APPROVED,
        fromDate: { gte: startOfYear, lte: endOfYear },
      },
    });

    const usedByType: Record<string, number> = {};
    for (const leave of approvedLeaves) {
      const type = leave.leaveType;
      usedByType[type] = (usedByType[type] || 0) + leave.days;
    }

    const balance: Record<string, { total: number; used: number; remaining: number }> = {};
    for (const [type, total] of Object.entries(this.LEAVE_BALANCES)) {
      const used = usedByType[type] || 0;
      balance[type.toLowerCase()] = {
        total,
        used,
        remaining: Math.max(0, total - used),
      };
    }

    return balance;
  }
}
