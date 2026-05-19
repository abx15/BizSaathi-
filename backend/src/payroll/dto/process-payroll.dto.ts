import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class ProcessPayrollDto {
  @IsString()
  month!: string; // "2025-01"

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  staffIds?: string[];

  @IsOptional()
  @IsNumber()
  bonus?: number;

  @IsOptional()
  @IsNumber()
  otherDeductions?: number;
}
