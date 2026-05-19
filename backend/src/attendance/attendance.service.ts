import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import Decimal from 'decimal.js';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  private readonly WORK_HOURS = 8;

  constructor(private readonly prisma: DatabaseService) {}

  async mark(tenantId: string, userId: string, dto: MarkAttendanceDto) {
    const attendanceDate = new Date(dto.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (attendanceDate > today) {
      throw new BadRequestException('Cannot mark attendance for future dates');
    }

    // Verify staff belongs to tenant
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, tenantId },
    });
    if (!staff) {
      throw new BadRequestException('Staff member not found');
    }

    let hoursWorked: Decimal | null = null;
    let overtime: Decimal | null = null;

    if (dto.checkIn && dto.checkOut) {
      const [inH, inM] = dto.checkIn.split(':').map(Number);
      const [outH, outM] = dto.checkOut.split(':').map(Number);
      const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      hoursWorked = new Decimal(totalMinutes).div(60).toDecimalPlaces(2);
      const ot = hoursWorked.minus(this.WORK_HOURS);
      overtime = ot.greaterThan(0) ? ot.toDecimalPlaces(2) : new Decimal(0);
    }

    // Parse date for check-in/check-out DateTime
    const dateStr = dto.date.split('T')[0];
    const checkInDt = dto.checkIn
      ? new Date(`${dateStr}T${dto.checkIn}:00`)
      : null;
    const checkOutDt = dto.checkOut
      ? new Date(`${dateStr}T${dto.checkOut}:00`)
      : null;

    const attendance = await this.prisma.attendance.upsert({
      where: {
        staffId_date: {
          staffId: dto.staffId,
          date: new Date(dateStr),
        },
      },
      update: {
        status: dto.status,
        checkIn: checkInDt,
        checkOut: checkOutDt,
        hoursWorked: hoursWorked?.toNumber() ?? null,
        overtime: overtime?.toNumber() ?? null,
        note: dto.note,
        markedBy: userId,
      },
      create: {
        tenantId,
        staffId: dto.staffId,
        date: new Date(dateStr),
        status: dto.status,
        checkIn: checkInDt,
        checkOut: checkOutDt,
        hoursWorked: hoursWorked?.toNumber() ?? null,
        overtime: overtime?.toNumber() ?? null,
        note: dto.note,
        markedBy: userId,
      },
    });

    return attendance;
  }

  async bulkMark(tenantId: string, userId: string, dto: BulkAttendanceDto) {
    const attendanceDate = new Date(dto.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (attendanceDate > today) {
      throw new BadRequestException('Cannot mark attendance for future dates');
    }

    const dateStr = dto.date.split('T')[0];
    let marked = 0;
    let failed = 0;
    const errors: string[] = [];

    // Use transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      for (const record of dto.records) {
        try {
          // Verify staff belongs to tenant
          const staff = await tx.staff.findFirst({
            where: { id: record.staffId, tenantId },
          });
          if (!staff) {
            errors.push(`Staff ${record.staffId} not found`);
            failed++;
            continue;
          }

          let hoursWorked: number | null = null;
          let overtime: number | null = null;
          let checkInDt: Date | null = null;
          let checkOutDt: Date | null = null;

          if (record.checkIn && record.checkOut) {
            const [inH, inM] = record.checkIn.split(':').map(Number);
            const [outH, outM] = record.checkOut.split(':').map(Number);
            const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
            const hw = new Decimal(totalMinutes).div(60).toDecimalPlaces(2);
            hoursWorked = hw.toNumber();
            const ot = hw.minus(this.WORK_HOURS);
            overtime = ot.greaterThan(0) ? ot.toDecimalPlaces(2).toNumber() : 0;
            checkInDt = new Date(`${dateStr}T${record.checkIn}:00`);
            checkOutDt = new Date(`${dateStr}T${record.checkOut}:00`);
          }

          await tx.attendance.upsert({
            where: {
              staffId_date: {
                staffId: record.staffId,
                date: new Date(dateStr),
              },
            },
            update: {
              status: record.status,
              checkIn: checkInDt,
              checkOut: checkOutDt,
              hoursWorked,
              overtime,
              note: record.note,
              markedBy: userId,
            },
            create: {
              tenantId,
              staffId: record.staffId,
              date: new Date(dateStr),
              status: record.status,
              checkIn: checkInDt,
              checkOut: checkOutDt,
              hoursWorked,
              overtime,
              note: record.note,
              markedBy: userId,
            },
          });

          marked++;
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Staff ${record.staffId}: ${errMsg}`);
          failed++;
        }
      }
    });

    return { marked, failed, errors };
  }

  async findAll(tenantId: string, filter: AttendanceFilterDto) {
    const where: Record<string, unknown> = { tenantId };

    if (filter.staffId) {
      where.staffId = filter.staffId;
    }

    if (filter.date) {
      where.date = new Date(filter.date);
    } else if (filter.month) {
      const [year, month] = filter.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.date = { gte: startDate, lte: endDate };
    }

    const records = await this.prisma.attendance.findMany({
      where: where as any,
      include: {
        staff: {
          select: { name: true, employeeCode: true, department: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    return records;
  }

  async getSummary(tenantId: string, month: string) {
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

    const activeStaff = await this.prisma.staff.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'ON_LEAVE'] } },
      select: { id: true, name: true, employeeCode: true, department: true },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const staffSummaries = activeStaff.map((s) => {
      const records = attendances.filter((a) => a.staffId === s.id);
      const present = records.filter((a) => a.status === 'PRESENT').length;
      const absent = records.filter((a) => a.status === 'ABSENT').length;
      const halfDay = records.filter((a) => a.status === 'HALF_DAY').length;
      const onLeave = records.filter((a) => a.status === 'ON_LEAVE').length;
      const totalOvertime = records.reduce(
        (sum, a) => sum + Number(a.overtime || 0),
        0,
      );
      const effectiveDays = present + halfDay * 0.5;
      const attendancePercentage =
        workingDays > 0
          ? parseFloat(((effectiveDays / workingDays) * 100).toFixed(1))
          : 0;

      return {
        staffId: s.id,
        name: s.name,
        employeeCode: s.employeeCode,
        department: s.department,
        present,
        absent,
        halfDay,
        onLeave,
        overtime: parseFloat(totalOvertime.toFixed(2)),
        attendancePercentage,
      };
    });

    return {
      month,
      workingDays,
      staff: staffSummaries,
    };
  }

  async getToday(tenantId: string) {
    const today = new Date();
    const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const activeStaff = await this.prisma.staff.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, name: true, employeeCode: true, department: true },
    });

    const todayAttendance = await this.prisma.attendance.findMany({
      where: { tenantId, date: dateOnly },
    });

    const markedIds = new Set(todayAttendance.map((a) => a.staffId));

    return {
      date: dateOnly.toISOString().split('T')[0],
      totalStaff: activeStaff.length,
      marked: todayAttendance.length,
      notMarked: activeStaff.length - todayAttendance.length,
      staff: activeStaff.map((s) => {
        const record = todayAttendance.find((a) => a.staffId === s.id);
        return {
          ...s,
          isMarked: markedIds.has(s.id),
          status: record?.status || 'NOT_MARKED',
          checkIn: record?.checkIn || null,
          checkOut: record?.checkOut || null,
        };
      }),
    };
  }
}
