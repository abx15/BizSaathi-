import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { EmployeeCodeService } from './employee-code.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffFilterDto } from './dto/staff-filter.dto';
import { Prisma, StaffStatus } from '@prisma/client';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly employeeCodeService: EmployeeCodeService,
  ) {}

  async create(tenantId: string, dto: CreateStaffDto) {
    const employeeCode = await this.employeeCodeService.generateCode(tenantId);

    const staff = await this.prisma.staff.create({
      data: {
        tenantId,
        employeeCode,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        role: dto.role,
        department: dto.department,
        joiningDate: new Date(dto.joiningDate),
        employmentType: dto.employmentType,
        salaryType: dto.salaryType,
        basicSalary: dto.basicSalary,
        hra: dto.hra || 0,
        allowances: dto.allowances || 0,
        pfEnabled: dto.pfEnabled,
        esicEnabled: dto.esicEnabled,
        tdsEnabled: dto.tdsEnabled || false,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        ifscCode: dto.ifscCode,
        upiId: dto.upiId,
        emergencyContact: dto.emergencyContact,
        emergencyPhone: dto.emergencyPhone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
      },
    });

    await this.invalidateCache(tenantId);
    return staff;
  }

  async findAll(tenantId: string, filter: StaffFilterDto) {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const cacheKey = `staff:${tenantId}:${JSON.stringify(filter)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where: Prisma.StaffWhereInput = { tenantId };

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.department) {
      where.department = { contains: filter.department, mode: 'insensitive' };
    }
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { phone: { contains: filter.search, mode: 'insensitive' } },
        { employeeCode: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Current month range for attendance summary
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [staffList, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          attendances: {
            where: {
              date: { gte: monthStart, lte: monthEnd },
            },
            select: { status: true },
          },
        },
      }),
      this.prisma.staff.count({ where }),
    ]);

    const data = staffList.map((s) => {
      const present = s.attendances.filter((a) => a.status === 'PRESENT').length;
      const absent = s.attendances.filter((a) => a.status === 'ABSENT').length;
      const halfDay = s.attendances.filter((a) => a.status === 'HALF_DAY').length;
      const { attendances, ...rest } = s;
      return {
        ...rest,
        currentMonthAttendance: { present, absent, halfDay },
      };
    });

    const result = {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 120); // 2 min cache
    return result;
  }

  async findOne(tenantId: string, id: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const staff = await this.prisma.staff.findFirst({
      where: { id, tenantId },
      include: {
        attendances: {
          where: { date: { gte: monthStart, lte: monthEnd } },
          orderBy: { date: 'asc' },
        },
        payrolls: {
          where: { month: monthStr },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        leaves: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const present = staff.attendances.filter((a) => a.status === 'PRESENT').length;
    const absent = staff.attendances.filter((a) => a.status === 'ABSENT').length;
    const halfDay = staff.attendances.filter((a) => a.status === 'HALF_DAY').length;

    return {
      ...staff,
      currentMonthSummary: { present, absent, halfDay },
      lastPayroll: staff.payrolls[0] || null,
      pendingLeaves: staff.leaves,
    };
  }

  async update(tenantId: string, id: string, dto: UpdateStaffDto) {
    const existing = await this.prisma.staff.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Staff member not found');
    }

    // Salary change audit log
    const salaryFields = ['basicSalary', 'hra', 'allowances'] as const;
    const salaryChanged = salaryFields.some(
      (f) => dto[f] !== undefined && Number(dto[f]) !== Number(existing[f]),
    );

    if (salaryChanged) {
      this.logger.log(
        `[SALARY_AUDIT] Staff ${id} | Old: basic=${existing.basicSalary}, hra=${existing.hra}, allow=${existing.allowances} | ` +
          `New: basic=${dto.basicSalary ?? existing.basicSalary}, hra=${dto.hra ?? existing.hra}, allow=${dto.allowances ?? existing.allowances} | Date: ${new Date().toISOString()}`,
      );
    }

    const updated = await this.prisma.staff.update({
      where: { id },
      data: {
        ...dto,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      },
    });

    await this.invalidateCache(tenantId);
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, tenantId },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Check for unpaid payrolls
    const unpaidPayrolls = await this.prisma.payroll.count({
      where: { staffId: id, tenantId, status: { in: ['DRAFT', 'PROCESSED'] } },
    });

    if (unpaidPayrolls > 0) {
      throw new ForbiddenException('Cannot terminate staff with unpaid payrolls');
    }

    const terminated = await this.prisma.staff.update({
      where: { id },
      data: {
        status: StaffStatus.TERMINATED,
        leavingDate: new Date(),
      },
    });

    await this.invalidateCache(tenantId);
    return terminated;
  }

  async uploadDocument(
    tenantId: string,
    staffId: string,
    file: Express.Multer.File,
    docType: string,
    title: string,
  ) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, tenantId },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const key = `staff/${tenantId}/${staffId}/${docType}_${Date.now()}.${file.originalname.split('.').pop()}`;
    const { url } = await this.storage.uploadFile({
      key,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const doc = await this.prisma.staffDocument.create({
      data: {
        tenantId,
        staffId,
        docType: docType as any,
        title,
        fileUrl: url,
        fileKey: key,
      },
    });

    return doc;
  }

  private async invalidateCache(tenantId: string) {
    const keys = await this.redis.getClient().keys(`staff:${tenantId}:*`);
    if (keys.length > 0) {
      await this.redis.getClient().del(...keys);
    }
  }
}
