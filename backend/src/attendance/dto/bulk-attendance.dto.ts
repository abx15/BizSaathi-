import { IsDateString, IsArray, ValidateNested, IsString, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class BulkAttendanceRecordDto {
  @IsString()
  staffId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  checkIn?: string;

  @IsOptional()
  @IsString()
  checkOut?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkAttendanceDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceRecordDto)
  records!: BulkAttendanceRecordDto[];
}
