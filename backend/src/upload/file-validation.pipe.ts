import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly configService: ConfigService) {}

  transform(value: any) {
    if (!value) {
      throw new BadRequestException('No file provided');
    }

    const maxSizeMb = this.configService.get<number>('MAX_FILE_SIZE_MB') || 10;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    
    const allowedMimeTypesStr = this.configService.get<string>('ALLOWED_MIME_TYPES') || 'image/jpeg,image/png,image/webp,application/pdf';
    const allowedMimeTypes = allowedMimeTypesStr.split(',').map(m => m.trim());

    if (value.size > maxSizeBytes) {
      throw new BadRequestException(`File size exceeds limit of ${maxSizeMb}MB`);
    }

    if (!allowedMimeTypes.includes(value.mimetype)) {
      throw new BadRequestException(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }

    const originalName = value.originalname;
    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      throw new BadRequestException('Invalid filename');
    }

    return value;
  }
}
