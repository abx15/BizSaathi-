import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean, IsNumber, Matches } from 'class-validator';
import { EmploymentType, SalaryType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateStaffDto {
  @IsString()
  name!: string;

  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be 10 digits' })
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  role!: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsString()
  joiningDate!: string;

  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;

  @IsEnum(SalaryType)
  salaryType!: SalaryType;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  basicSalary!: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  hra?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  allowances?: number;

  @IsBoolean()
  pfEnabled!: boolean;

  @IsBoolean()
  esicEnabled!: boolean;

  @IsOptional()
  @IsBoolean()
  tdsEnabled?: boolean;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  ifscCode?: string;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
