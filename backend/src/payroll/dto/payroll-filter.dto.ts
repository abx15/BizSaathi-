import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PayrollStatus } from '@prisma/client';

export class PayrollFilterDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;

  @IsOptional()
  @IsString()
  staffId?: string;
}
