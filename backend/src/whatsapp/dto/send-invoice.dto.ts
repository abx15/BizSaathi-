import { IsUUID, IsString, IsOptional, IsBoolean } from 'class-validator';

export class SendInvoiceDto {
  @IsUUID()
  invoiceId!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  includesPdf?: boolean;
}
