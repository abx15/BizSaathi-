import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ExpenseFilterDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  vendor?: string;
}
