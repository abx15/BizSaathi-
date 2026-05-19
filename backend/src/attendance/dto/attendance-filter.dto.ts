import { IsOptional, IsString, IsDateString } from 'class-validator';

export class AttendanceFilterDto {
  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  month?: string; // "2025-01"

  @IsOptional()
  @IsDateString()
  date?: string;
}
