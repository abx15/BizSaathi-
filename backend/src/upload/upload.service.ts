import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';
import { FilePurpose } from '@prisma/client';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async uploadFile(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    purpose: FilePurpose,
    entityId?: string,
    entityType?: string,
  ) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uuid = uuidv4();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const key = `${purpose.toLowerCase()}/${tenantId}/${year}/${month}/${uuid}${ext}`;

    const { url } = await this.storageService.uploadFile({
      key,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const fileRecord = await this.prisma.fileUpload.create({
      data: {
        tenantId,
        uploadedBy: userId,
        key,
        url,
        filename: `${uuid}${ext}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        purpose,
        entityId,
        entityType,
        isTemporary: true,
        expiresAt,
      },
    });

    const signedUrl = await this.storageService.getSignedUrl(key, 3600);

    return {
      fileId: fileRecord.id,
      url,
      key,
      signedUrl,
    };
  }

  async uploadImageOptimized(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    purpose: FilePurpose,
    entityId?: string,
    entityType?: string,
  ) {
    const optimizedBuffer = await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const uuid = uuidv4();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const key = `${purpose.toLowerCase()}/${tenantId}/${year}/${month}/${uuid}.webp`;

    const { url } = await this.storageService.uploadFile({
      key,
      buffer: optimizedBuffer,
      mimeType: 'image/webp',
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const fileRecord = await this.prisma.fileUpload.create({
      data: {
        tenantId,
        uploadedBy: userId,
        key,
        url,
        filename: `${uuid}.webp`,
        originalName: file.originalname,
        mimeType: 'image/webp',
        size: optimizedBuffer.length,
        purpose,
        entityId,
        entityType,
        isTemporary: true,
        expiresAt,
      },
    });

    const signedUrl = await this.storageService.getSignedUrl(key, 3600);

    return {
      fileId: fileRecord.id,
      url,
      key,
      signedUrl,
    };
  }

  async getSignedUrlForFile(tenantId: string, fileId: string) {
    const file = await this.prisma.fileUpload.findFirst({
      where: { id: fileId, tenantId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const signedUrl = await this.storageService.getSignedUrl(file.key, 3600);
    return { signedUrl };
  }

  async deleteFile(tenantId: string, fileId: string) {
    const file = await this.prisma.fileUpload.findFirst({
      where: { id: fileId, tenantId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.storageService.deleteFile(file.key);
    await this.prisma.fileUpload.delete({ where: { id: fileId } });

    return { success: true };
  }

  async cleanupTemporaryFiles() {
    this.logger.log('Running cleanup for temporary files');
    
    const expiredFiles = await this.prisma.fileUpload.findMany({
      where: {
        isTemporary: true,
        expiresAt: { lte: new Date() },
      },
    });

    let deletedCount = 0;
    for (const file of expiredFiles) {
      try {
        await this.storageService.deleteFile(file.key);
        await this.prisma.fileUpload.delete({ where: { id: file.id } });
        deletedCount++;
      } catch (error) {
        this.logger.error(`Failed to delete expired file ${file.key}`, error);
      }
    }

    this.logger.log(`Cleanup complete. Deleted ${deletedCount} files.`);
    return { deletedCount };
  }
}
