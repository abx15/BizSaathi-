import { IsArray, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class BulkReminderDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  invoiceIds?: string[];

  @IsNumber()
  @IsOptional()
  daysOverdue?: number;
}
