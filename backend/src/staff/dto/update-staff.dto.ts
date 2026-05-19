import { PartialType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { StaffStatus } from '@prisma/client';

export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;
}
