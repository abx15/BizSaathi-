import { IsString } from 'class-validator';

export class UploadResponseDto {
  @IsString()
  fileId!: string;

  @IsString()
  url!: string;

  @IsString()
  key!: string;

  @IsString()
  signedUrl!: string;
}
