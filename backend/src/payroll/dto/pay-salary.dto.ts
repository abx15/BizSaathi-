import { IsString, IsEnum, IsDateString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class PaySalaryDto {
  @IsString()
  month!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsDateString()
  paidAt!: string;
}
