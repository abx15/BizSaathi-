import { IsUUID, IsNotEmpty } from 'class-validator';

export class SendSalarySlipDto {
  @IsUUID()
  @IsNotEmpty()
  payrollId!: string;
}
