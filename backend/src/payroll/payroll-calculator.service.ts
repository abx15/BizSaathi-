import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';

export interface PayrollCalculationInput {
  basicSalary: number;
  hra: number;
  allowances: number;
  workingDays: number;
  presentDays: number;       // half days count as 0.5
  leaveDays: number;         // approved paid leaves
  overtimeHours: number;
  pfEnabled: boolean;
  esicEnabled: boolean;
  tdsEnabled: boolean;
  bonus?: number;
  otherDeductions?: number;
}

export interface PayrollCalculationResult {
  // Attendance
  payableDays: number;
  absentDays: number;

  // Earnings
  proportionalBasic: number;
  proportionalHra: number;
  proportionalAllowances: number;
  overtimePay: number;
  bonus: number;
  grossSalary: number;

  // Deductions
  pfEmployee: number;
  pfEmployer: number;
  esicEmployee: number;
  esicEmployer: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;

  // Net
  netSalary: number;
}

@Injectable()
export class PayrollCalculatorService {
  private readonly logger = new Logger(PayrollCalculatorService.name);
  private readonly PF_WAGE_CEILING: number;
  private readonly ESIC_WAGE_CEILING: number;
  private readonly OVERTIME_MULTIPLIER: number;
  private readonly WORKING_HOURS_PER_DAY: number;

  constructor(private readonly configService: ConfigService) {
    this.PF_WAGE_CEILING = Number(
      this.configService.get<string>('PF_WAGE_CEILING') || '15000',
    );
    this.ESIC_WAGE_CEILING = Number(
      this.configService.get<string>('ESIC_WAGE_CEILING') || '21000',
    );
    this.OVERTIME_MULTIPLIER = Number(
      this.configService.get<string>('OVERTIME_MULTIPLIER') || '2',
    );
    this.WORKING_HOURS_PER_DAY = Number(
      this.configService.get<string>('WORKING_HOURS_PER_DAY') || '8',
    );
  }

  calculate(input: PayrollCalculationInput): PayrollCalculationResult {
    const basic = new Decimal(input.basicSalary);
    const hra = new Decimal(input.hra);
    const allowances = new Decimal(input.allowances);
    const workingDays = new Decimal(input.workingDays);
    const presentDays = new Decimal(input.presentDays);
    const leaveDays = new Decimal(input.leaveDays);
    const overtimeHours = new Decimal(input.overtimeHours);
    const bonus = new Decimal(input.bonus || 0);
    const otherDed = new Decimal(input.otherDeductions || 0);

    // 1. Payable days = present + approved leaves
    const payableDays = presentDays.plus(leaveDays);
    const absentDays = Decimal.max(workingDays.minus(payableDays), 0);

    // 2. Proportional calculations
    const ratio = workingDays.greaterThan(0)
      ? payableDays.div(workingDays)
      : new Decimal(0);

    const proportionalBasic = basic.mul(ratio).toDecimalPlaces(2);
    const proportionalHra = hra.mul(ratio).toDecimalPlaces(2);
    const proportionalAllowances = allowances.mul(ratio).toDecimalPlaces(2);

    // 3. Overtime pay = (basicSalary / 26 / 8) × overtimeHours × multiplier
    //    (Indian Labour Law: double rate for overtime)
    const perDaySalary = basic.div(26);
    const perHourSalary = perDaySalary.div(this.WORKING_HOURS_PER_DAY);
    const overtimePay = perHourSalary
      .mul(overtimeHours)
      .mul(this.OVERTIME_MULTIPLIER)
      .toDecimalPlaces(2);

    // 4. Gross salary
    const grossSalary = proportionalBasic
      .plus(proportionalHra)
      .plus(proportionalAllowances)
      .plus(overtimePay)
      .plus(bonus)
      .toDecimalPlaces(2);

    // 5. PF calculation (if enabled)
    let pfEmployee = new Decimal(0);
    let pfEmployer = new Decimal(0);
    if (input.pfEnabled) {
      const pfWage = Decimal.min(basic, this.PF_WAGE_CEILING);
      pfEmployee = pfWage.mul(0.12).toDecimalPlaces(2);   // 12%
      pfEmployer = pfWage.mul(0.13).toDecimalPlaces(2);   // 12% PF + 1% admin
    }

    // 6. ESIC calculation (if enabled AND gross <= ceiling)
    let esicEmployee = new Decimal(0);
    let esicEmployer = new Decimal(0);
    if (input.esicEnabled && grossSalary.lte(this.ESIC_WAGE_CEILING)) {
      esicEmployee = grossSalary.mul(0.0075).toDecimalPlaces(2);  // 0.75%
      esicEmployer = grossSalary.mul(0.0325).toDecimalPlaces(2);  // 3.25%
    }

    // 7. TDS calculation (if enabled) — New Tax Regime slabs
    let tds = new Decimal(0);
    if (input.tdsEnabled) {
      const annualTaxable = grossSalary.mul(12);
      const annualTax = this.calculateTDS(annualTaxable);
      tds = annualTax.div(12).toDecimalPlaces(2);
    }

    // 8. Total deductions & net salary
    const totalDeductions = pfEmployee
      .plus(esicEmployee)
      .plus(tds)
      .plus(otherDed)
      .toDecimalPlaces(2);

    const netSalary = grossSalary.minus(totalDeductions).toDecimalPlaces(2);

    return {
      payableDays: payableDays.toNumber(),
      absentDays: absentDays.toNumber(),
      proportionalBasic: proportionalBasic.toNumber(),
      proportionalHra: proportionalHra.toNumber(),
      proportionalAllowances: proportionalAllowances.toNumber(),
      overtimePay: overtimePay.toNumber(),
      bonus: bonus.toNumber(),
      grossSalary: grossSalary.toNumber(),
      pfEmployee: pfEmployee.toNumber(),
      pfEmployer: pfEmployer.toNumber(),
      esicEmployee: esicEmployee.toNumber(),
      esicEmployer: esicEmployer.toNumber(),
      tds: tds.toNumber(),
      otherDeductions: otherDed.toNumber(),
      totalDeductions: totalDeductions.toNumber(),
      netSalary: netSalary.toNumber(),
    };
  }

  /**
   * Calculate annual tax under New Tax Regime (India FY 2025-26)
   * Slabs: 0-3L: 0%, 3-7L: 5%, 7-10L: 10%, 10-12L: 15%, 12-15L: 20%, >15L: 30%
   */
  private calculateTDS(annualIncome: Decimal): Decimal {
    let tax = new Decimal(0);
    let remaining = annualIncome;

    const slabs: { limit: Decimal; rate: number }[] = [
      { limit: new Decimal(300000), rate: 0 },
      { limit: new Decimal(400000), rate: 0.05 },  // 3L to 7L
      { limit: new Decimal(300000), rate: 0.10 },  // 7L to 10L
      { limit: new Decimal(200000), rate: 0.15 },  // 10L to 12L
      { limit: new Decimal(300000), rate: 0.20 },  // 12L to 15L
    ];

    for (const slab of slabs) {
      if (remaining.lte(0)) break;
      const taxable = Decimal.min(remaining, slab.limit);
      tax = tax.plus(taxable.mul(slab.rate));
      remaining = remaining.minus(taxable);
    }

    // Anything above 15L at 30%
    if (remaining.greaterThan(0)) {
      tax = tax.plus(remaining.mul(0.30));
    }

    return tax.toDecimalPlaces(2);
  }
}
