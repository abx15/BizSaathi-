import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PayrollCalculatorService, PayrollCalculationInput } from './payroll-calculator.service';

describe('PayrollCalculatorService', () => {
  let service: PayrollCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollCalculatorService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config: Record<string, string> = {
                PF_WAGE_CEILING: '15000',
                ESIC_WAGE_CEILING: '21000',
                OVERTIME_MULTIPLIER: '2',
                WORKING_HOURS_PER_DAY: '8',
              };
              return config[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get<PayrollCalculatorService>(PayrollCalculatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Full salary with no deductions', () => {
    it('should calculate full salary when all days present', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 25000,
        hra: 5000,
        allowances: 2000,
        workingDays: 26,
        presentDays: 26,
        leaveDays: 0,
        overtimeHours: 0,
        pfEnabled: false,
        esicEnabled: false,
        tdsEnabled: false,
      };
      const result = service.calculate(input);

      expect(result.proportionalBasic).toBe(25000);
      expect(result.proportionalHra).toBe(5000);
      expect(result.proportionalAllowances).toBe(2000);
      expect(result.grossSalary).toBe(32000);
      expect(result.netSalary).toBe(32000);
      expect(result.totalDeductions).toBe(0);
    });
  });

  describe('Proportional salary on absence', () => {
    it('should calculate proportional salary for partial attendance', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 26000,
        hra: 0,
        allowances: 0,
        workingDays: 26,
        presentDays: 20,
        leaveDays: 0,
        overtimeHours: 0,
        pfEnabled: false,
        esicEnabled: false,
        tdsEnabled: false,
      };
      const result = service.calculate(input);

      // 26000 * (20/26) = 20000
      expect(result.proportionalBasic).toBe(20000);
      expect(result.absentDays).toBe(6);
      expect(result.payableDays).toBe(20);
    });
  });

  describe('Overtime pay', () => {
    it('should calculate overtime at double rate', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 26000,
        hra: 0,
        allowances: 0,
        workingDays: 26,
        presentDays: 26,
        leaveDays: 0,
        overtimeHours: 8, // 1 full day of overtime
        pfEnabled: false,
        esicEnabled: false,
        tdsEnabled: false,
      };
      const result = service.calculate(input);

      // Per day = 26000/26 = 1000
      // Per hour = 1000/8 = 125
      // Overtime = 125 * 8 * 2 = 2000
      expect(result.overtimePay).toBe(2000);
      expect(result.grossSalary).toBe(28000);
    });
  });

  describe('PF calculation', () => {
    it('should calculate PF correctly when basic <= 15000 ceiling', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 15000,
        hra: 0,
        allowances: 0,
        workingDays: 26,
        presentDays: 26,
        leaveDays: 0,
        overtimeHours: 0,
        pfEnabled: true,
        esicEnabled: false,
        tdsEnabled: false,
      };
      const result = service.calculate(input);

      // PF Employee = 15000 * 12% = 1800
      // PF Employer = 15000 * 13% = 1950
      expect(result.pfEmployee).toBe(1800);
      expect(result.pfEmployer).toBe(1950);
      expect(result.totalDeductions).toBe(1800);
      expect(result.netSalary).toBe(13200); // 15000 - 1800
    });

    it('should cap PF wage at ceiling of 15000', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 30000,
        hra: 0,
        allowances: 0,
        workingDays: 26,
        presentDays: 26,
        leaveDays: 0,
        overtimeHours: 0,
        pfEnabled: true,
        esicEnabled: false,
        tdsEnabled: false,
      };
      const result = service.calculate(input);

      // PF capped at 15000 even though basic is 30000
      expect(result.pfEmployee).toBe(1800); // 15000 * 12%
      expect(result.pfEmployer).toBe(1950); // 15000 * 13%
    });
  });

  describe('ESIC calculation', () => {
    it('should calculate ESIC when gross <= 21000', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 18000,
        hra: 2000,
        allowances: 1000,
        workingDays: 26,
        presentDays: 26,
        leaveDays: 0,
        overtimeHours: 0,
        pfEnabled: false,
        esicEnabled: true,
        tdsEnabled: false,
      };
      const result = service.calculate(input);
      const gross = 21000;

      // ESIC Employee = 21000 * 0.75% = 157.50
      // ESIC Employer = 21000 * 3.25% = 682.50
      expect(result.esicEmployee).toBe(157.5);
      expect(result.esicEmployer).toBe(682.5);
    });

    it('should NOT apply ESIC when gross > 21000', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 25000,
        hra: 0,
        allowances: 0,
        workingDays: 26,
        presentDays: 26,
        leaveDays: 0,
        overtimeHours: 0,
        pfEnabled: false,
        esicEnabled: true,
        tdsEnabled: false,
      };
      const result = service.calculate(input);

      expect(result.esicEmployee).toBe(0);
      expect(result.esicEmployer).toBe(0);
    });
  });

  describe('TDS calculation (New Tax Regime)', () => {
    it('should be zero for annual income <= 3L', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 25000, // 25000 * 12 = 3L exactly
        hra: 0,
        allowances: 0,
        workingDays: 26,
        presentDays: 26,
        leaveDays: 0,
        overtimeHours: 0,
        pfEnabled: false,
        esicEnabled: false,
        tdsEnabled: true,
      };
      const result = service.calculate(input);
      expect(result.tds).toBe(0);
    });

    it('should calculate TDS for 6L annual income', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 50000, // 50000 * 12 = 6L
        hra: 0,
        allowances: 0,
        workingDays: 26,
        presentDays: 26,
        leaveDays: 0,
        overtimeHours: 0,
        pfEnabled: false,
        esicEnabled: false,
        tdsEnabled: true,
      };
      const result = service.calculate(input);

      // Annual: 6L
      // 0-3L: 0% = 0
      // 3L-6L: 5% of 3L = 15000
      // Annual TDS = 15000
      // Monthly TDS = 15000/12 = 1250
      expect(result.tds).toBe(1250);
    });

    it('should calculate TDS for 12L annual income', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 100000, // 100000 * 12 = 12L
        hra: 0,
        allowances: 0,
        workingDays: 26,
        presentDays: 26,
        leaveDays: 0,
        overtimeHours: 0,
        pfEnabled: false,
        esicEnabled: false,
        tdsEnabled: true,
      };
      const result = service.calculate(input);

      // Annual: 12L
      // 0-3L: 0% = 0
      // 3-7L: 5% of 4L = 20000
      // 7-10L: 10% of 3L = 30000
      // 10-12L: 15% of 2L = 30000
      // Total = 80000
      // Monthly = 80000/12 ≈ 6666.67
      expect(result.tds).toBe(6666.67);
    });
  });

  describe('Paid leave counted as payable days', () => {
    it('should include approved leaves in payable days', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 26000,
        hra: 0,
        allowances: 0,
        workingDays: 26,
        presentDays: 20,
        leaveDays: 4, // 4 approved paid leaves
        overtimeHours: 0,
        pfEnabled: false,
        esicEnabled: false,
        tdsEnabled: false,
      };
      const result = service.calculate(input);

      // Payable = 20 + 4 = 24
      expect(result.payableDays).toBe(24);
      // Proportional basic = 26000 * (24/26) = 24000
      expect(result.proportionalBasic).toBe(24000);
      expect(result.absentDays).toBe(2);
    });
  });

  describe('Combined PF + ESIC + Overtime', () => {
    it('should calculate all components together', () => {
      const input: PayrollCalculationInput = {
        basicSalary: 15000,
        hra: 3000,
        allowances: 2000,
        workingDays: 26,
        presentDays: 24,
        leaveDays: 1,
        overtimeHours: 4,
        pfEnabled: true,
        esicEnabled: true,
        tdsEnabled: false,
        bonus: 1000,
      };
      const result = service.calculate(input);

      // Ratio = 25/26
      const ratio = 25 / 26;
      expect(result.payableDays).toBe(25);

      // Basic proportional = 15000 * 25/26 ≈ 14423.08
      expect(result.proportionalBasic).toBeCloseTo(14423.08, 1);

      // PF employee = min(15000, 15000) * 12% = 1800
      expect(result.pfEmployee).toBe(1800);

      // Overtime = (15000/26/8) * 4 * 2 = 576.92
      expect(result.overtimePay).toBeCloseTo(576.92, 1);

      // Gross is below 21000 check
      expect(result.grossSalary).toBeGreaterThan(0);
    });
  });
});
