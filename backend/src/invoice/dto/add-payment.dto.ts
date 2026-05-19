import { IsString, IsOptional, IsNotEmpty, IsNumber, Min, IsIn, IsDateString } from 'class-validator';

export class AddPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsIn(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'OTHER'])
  method?: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'OTHER';

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
