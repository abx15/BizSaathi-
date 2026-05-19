import { Controller, Post, Get, Delete, Param, Body, UseInterceptors, UploadedFile, UseGuards, Headers, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FileValidationPipe } from './file-validation.pipe';
import { FilePurpose } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Uploads')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('file')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: { type: 'string' },
        entityId: { type: 'string' },
        entityType: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Body('purpose') purpose: FilePurpose,
    @Body('entityId') entityId?: string,
    @Body('entityType') entityType?: string,
  ) {
    return this.uploadService.uploadFile(tenantId, userId, file, purpose || FilePurpose.OTHER, entityId, entityType);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Body('purpose') purpose: FilePurpose,
    @Body('entityId') entityId?: string,
    @Body('entityType') entityType?: string,
  ) {
    return this.uploadService.uploadImageOptimized(tenantId, userId, file, purpose || FilePurpose.OTHER, entityId, entityType);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':fileId/url')
  async getUrl(
    @CurrentUser('tenantId') tenantId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.uploadService.getSignedUrlForFile(tenantId, fileId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':fileId')
  async deleteFile(
    @CurrentUser('tenantId') tenantId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.uploadService.deleteFile(tenantId, fileId);
  }

  @Post('cleanup')
  async cleanup(@Headers('x-cron-secret') secret: string) {
    if (secret !== process.env.JWT_ACCESS_SECRET) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    return this.uploadService.cleanupTemporaryFiles();
  }
}
