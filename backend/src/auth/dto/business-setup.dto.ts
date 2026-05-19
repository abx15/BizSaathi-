import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BusinessSetupDto {
  @IsNotEmpty()
  @IsString()
  businessName!: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsNotEmpty()
  @IsString()
  address!: string;

  @IsNotEmpty()
  @IsString()
  city!: string;

  @IsNotEmpty()
  @IsString()
  state!: string;
}
