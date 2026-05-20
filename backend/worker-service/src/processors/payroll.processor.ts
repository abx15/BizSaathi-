import { Job, Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { logger } from '../logger';
import { redisConnection } from '../redis';
import { withRetry } from '../utils/retry';

function calculatePayroll(params: {
  basicSalary: number;
  hra: number;
  allowances: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  overtimeHours: number;
  pfEnabled: boolean;
  esicEnabled: boolean;
  tdsEnabled: boolean;
  bonus?: number;
  otherDeductions?: number;
}) {
  const basic = params.basicSalary;
  const hra = params.hra;
  const allowances = params.allowances;
  const workingDays = params.workingDays;
  const presentDays = params.presentDays;
  const leaveDays = params.leaveDays;
  const overtimeHours = params.overtimeHours;
  const bonus = params.bonus || 0;
  const otherDed = params.otherDeductions || 0;

  // 1. Payable days = present + approved leaves
  const payableDays = presentDays + leaveDays;
  const absentDays = Math.max(workingDays - payableDays, 0);

  // 2. Proportional calculations ratio
  const ratio = workingDays > 0 ? payableDays / workingDays : 0;

  const proportionalBasic = +(basic * ratio).toFixed(2);
  const proportionalHra = +(hra * ratio).toFixed(2);
  const proportionalAllowances = +(allowances * ratio).toFixed(2);

  // 3. Overtime pay = (basicSalary / 26 / 8) * overtimeHours * multiplier
  const perDaySalary = basic / 26;
  const perHourSalary = perDaySalary / 8; // working hours per day = 8
  const overtimePay = +(perHourSalary * overtimeHours * 2).toFixed(2); // double rate for overtime

  // 4. Gross salary
  const grossSalary = +(proportionalBasic + proportionalHra + proportionalAllowances + overtimePay + bonus).toFixed(2);

  // 5. PF calculation (if enabled)
  let pfEmployee = 0;
  let pfEmployer = 0;
  if (params.pfEnabled) {
    const pfWage = Math.min(basic, 15000); // PF wage ceiling
    pfEmployee = +(pfWage * 0.12).toFixed(2); // 12% employee
    pfEmployer = +(pfWage * 0.13).toFixed(2); // 12% + 1% admin employer
  }

  // 6. ESIC calculation (if enabled and gross <= ceiling)
  let esicEmployee = 0;
  let esicEmployer = 0;
  if (params.esicEnabled && grossSalary <= 21000) { // ESIC wage ceiling
    esicEmployee = +(grossSalary * 0.0075).toFixed(2); // 0.75%
    esicEmployer = +(grossSalary * 0.0325).toFixed(2); // 3.25%
  }

  // 7. TDS calculation (if enabled) - New Tax Regime slabs
  let tds = 0;
  if (params.tdsEnabled) {
    const annualTaxable = grossSalary * 12;
    // FY 2025-26 New Regime slabs: 0-3L: 0%, 3-7L: 5%, 7-10L: 10%, 10-12L: 15%, 12-15L: 20%, >15L: 30%
    let remaining = annualTaxable;
    let tax = 0;
    const slabs = [
      { limit: 300000, rate: 0 },
      { limit: 400000, rate: 0.05 }, // 3L to 7L
      { limit: 300000, rate: 0.10 }, // 7L to 10L
      { limit: 200000, rate: 0.15 }, // 10L to 12L
      { limit: 300000, rate: 0.20 }, // 12L to 15L
    ];
    for (const slab of slabs) {
      if (remaining <= 0) break;
      const taxable = Math.min(remaining, slab.limit);
      tax += taxable * slab.rate;
      remaining -= taxable;
    }
    if (remaining > 0) {
      tax += remaining * 0.30;
    }
    tds = +(tax / 12).toFixed(2);
  }

  // 8. Total deductions & net salary
  const totalDeductions = +(pfEmployee + esicEmployee + tds + otherDed).toFixed(2);
  const netSalary = +(grossSalary - totalDeductions).toFixed(2);

  return {
    payableDays,
    absentDays,
    proportionalBasic,
    proportionalHra,
    proportionalAllowances,
    overtimePay,
    grossSalary,
    pfEmployee,
    pfEmployer,
    esicEmployee,
    esicEmployer,
    tds,
    totalDeductions,
    netSalary,
  };
}

export async function processPayrollJob(job: Job): Promise<any> {
  const { name, data } = job;
  logger.info({ jobId: job.id, name, data }, 'Processing Payroll queue job');

  switch (name) {
    case 'payroll:process': {
      const { tenantId, month, staffIds } = data;
      logger.info({ tenantId, month }, 'Processing background payroll calculations');
      
      // 1. Select active staff members
      let query = `SELECT * FROM "Staff" WHERE "tenantId" = $1 AND "status" = 'ACTIVE'`;
      const params: any[] = [tenantId];
      
      if (staffIds && staffIds.length > 0) {
        query += ` AND id = ANY($2)`;
        params.push(staffIds);
      }

      const staffResult = await db.query(query, params);
      const staffList = staffResult.rows;
      logger.info({ count: staffList.length }, 'Found active staff members for background payroll processing');
      
      // Parse month
      const [year, mon] = month.split('-').map(Number);
      const startDate = new Date(year, mon - 1, 1);
      const endDate = new Date(year, mon, 0);

      // Exclude Sundays
      let workingDays = 0;
      const current = new Date(startDate);
      while (current <= endDate) {
        if (current.getDay() !== 0) workingDays++;
        current.setDate(current.getDate() + 1);
      }

      let calculatedCount = 0;

      for (const staff of staffList) {
        // Exclude duplicates
        const existingRes = await db.query(
          `SELECT id FROM "Payroll" WHERE "tenantId" = $1 AND "staffId" = $2 AND "month" = $3`,
          [tenantId, staff.id, month]
        );
        if (existingRes.rows.length > 0) {
          logger.warn(`Payroll already exists for ${staff.name} (${month}), skipping calculation`);
          continue;
        }

        // Fetch attendance
        const attendanceRes = await db.query(
          `SELECT * FROM "Attendance" WHERE "staffId" = $1 AND "date" >= $2 AND "date" <= $3`,
          [staff.id, startDate, endDate]
        );
        const attendances = attendanceRes.rows;

        const presentFull = attendances.filter((a: any) => a.status === 'PRESENT').length;
        const halfDayCount = attendances.filter((a: any) => a.status === 'HALF_DAY').length;
        const presentDays = presentFull + halfDayCount * 0.5;
        const onLeaveCount = attendances.filter((a: any) => a.status === 'ON_LEAVE').length;
        const absentCount = attendances.filter((a: any) => a.status === 'ABSENT').length;
        
        const totalOvertimeHours = attendances.reduce(
          (sum: number, a: any) => sum + Number(a.overtime || 0),
          0
        );

        // Run calculations
        const bonus = 0;
        const otherDed = 0;
        const calc = calculatePayroll({
          basicSalary: Number(staff.basicSalary),
          hra: Number(staff.hra),
          allowances: Number(staff.allowances),
          workingDays,
          presentDays,
          leaveDays: onLeaveCount,
          overtimeHours: totalOvertimeHours,
          pfEnabled: staff.pfEnabled,
          esicEnabled: staff.esicEnabled,
          tdsEnabled: staff.tdsEnabled,
          bonus,
          otherDeductions: otherDed,
        });

        // Insert new Payroll DRAFT record
        const payrollId = randomUUID();
        await db.query(
          `INSERT INTO "Payroll" (
            "id", "tenantId", "staffId", "month", "workingDays", "presentDays", "absentDays", "leaveDays",
            "overtimeHours", "basicSalary", "hra", "allowances", "overtimePay", "bonus", "grossSalary",
            "pfEmployee", "pfEmployer", "esicEmployee", "esicEmployer", "tds", "otherDeductions", "totalDeductions",
            "netSalary", "status", "paymentMethod", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 'DRAFT', 'BANK_TRANSFER', NOW(), NOW())`,
          [
            payrollId,
            tenantId,
            staff.id,
            month,
            workingDays,
            Math.floor(presentDays),
            absentCount,
            onLeaveCount,
            totalOvertimeHours,
            calc.proportionalBasic,
            calc.proportionalHra,
            calc.proportionalAllowances,
            calc.overtimePay,
            bonus,
            calc.grossSalary,
            calc.pfEmployee,
            calc.pfEmployer,
            calc.esicEmployee,
            calc.esicEmployer,
            calc.tds,
            otherDed,
            calc.totalDeductions,
            calc.netSalary,
          ]
        );

        calculatedCount++;
      }

      // Enqueue bulk slip generation job
      const payrollQueue = new Queue('payroll', { connection: redisConnection });
      await payrollQueue.add('payroll:slip:bulk-generate', {
        tenantId,
        month,
        staffIds: staffList.map((s: any) => s.id),
      });

      return { calculatedCount, queuedBulk: true };
    }

    case 'payroll:slip:bulk-generate': {
      const { tenantId, month, staffIds } = data;
      logger.info({ tenantId, month, staffCount: staffIds.length }, 'Processing bulk salary slip generation');

      const pdfQueue = new Queue('pdf', { connection: redisConnection });
      const queuedJobs: string[] = [];

      await withRetry(async () => {
        // Find payroll entries matching tenant and month
        const result = await db.query(
          `SELECT id, "staffId" FROM "Payroll" WHERE "tenantId" = $1 AND "month" = $2`,
          [tenantId, month]
        );

        for (const payroll of result.rows) {
          const pdfJob = await pdfQueue.add('pdf:salary-slip:generate', {
            payrollId: payroll.id,
            tenantId,
            staffId: payroll.staffId,
            month,
          });
          queuedJobs.push(pdfJob.id || '');
        }
      });

      logger.info({ count: queuedJobs.length }, 'Bulk queued salary slip PDF generations');
      return { queuedCount: queuedJobs.length, jobIds: queuedJobs };
    }

    default:
      throw new Error(`Unknown job name in Payroll queue: ${name}`);
  }
}
