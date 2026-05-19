import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private isLocalFallback: boolean = false;
  private localUploadPath: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'bizsaathi-files';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';
    this.localUploadPath = this.configService.get<string>('UPLOAD_LOCAL_PATH') || './uploads';

    if (accountId && accessKeyId && secretAccessKey && accountId !== 'your_account_id') {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('Cloudflare R2 storage initialized');
    } else {
      this.isLocalFallback = true;
      this.logger.warn('Cloudflare R2 credentials missing. Using LOCAL FALLBACK storage.');
      if (!fs.existsSync(this.localUploadPath)) {
        fs.mkdirSync(this.localUploadPath, { recursive: true });
      }
    }
  }

  async uploadFile(params: {
    key: string;
    buffer: Buffer;
    mimeType: string;
    isPublic?: boolean;
  }): Promise<{ key: string; url: string }> {
    if (this.isLocalFallback) {
      const fullPath = path.join(this.localUploadPath, params.key);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, params.buffer);
      
      const port = this.configService.get<number>('PORT') || 3001;
      const url = `http://localhost:${port}/uploads/${params.key}`;
      return { key: params.key, url };
    }

    if (!this.s3Client) throw new Error('S3 Client not initialized');

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: params.key,
        Body: params.buffer,
        ContentType: params.mimeType,
      }),
    );

    let url = '';
    if (params.isPublic && this.publicUrl) {
      url = `${this.publicUrl}/${params.key}`;
    } else {
      url = await this.getSignedUrl(params.key, 86400);
    }

    return { key: params.key, url };
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (this.isLocalFallback) {
      const port = this.configService.get<number>('PORT') || 3001;
      return `http://localhost:${port}/uploads/${key}`;
    }

    if (!this.s3Client) throw new Error('S3 Client not initialized');

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    if (this.isLocalFallback) {
      const fullPath = path.join(this.localUploadPath, key);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return;
    }

    if (!this.s3Client) throw new Error('S3 Client not initialized');

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  async fileExists(key: string): Promise<boolean> {
    if (this.isLocalFallback) {
      return fs.existsSync(path.join(this.localUploadPath, key));
    }

    if (!this.s3Client) throw new Error('S3 Client not initialized');

    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') return false;
      throw error;
    }
  }

  async getFileMetadata(key: string): Promise<{ size: number; lastModified: Date; contentType: string }> {
    if (this.isLocalFallback) {
      const fullPath = path.join(this.localUploadPath, key);
      if (!fs.existsSync(fullPath)) throw new Error('File not found');
      const stats = fs.statSync(fullPath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
        contentType: 'application/octet-stream',
      };
    }

    if (!this.s3Client) throw new Error('S3 Client not initialized');

    const result = await this.s3Client.send(
      new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    return {
      size: result.ContentLength || 0,
      lastModified: result.LastModified || new Date(),
      contentType: result.ContentType || 'application/octet-stream',
    };
  }
}
