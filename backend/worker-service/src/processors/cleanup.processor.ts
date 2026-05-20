import { Job } from 'bullmq';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db';
import { logger } from '../logger';
import { config } from '../config';
import { withRetry } from '../utils/retry';

// Initialize S3 Client or local fallback
let s3Client: S3Client | null = null;
const isLocalFallback = config.r2.accessKeyId === 'mock_r2_access_key' || !config.r2.accessKeyId;

if (!isLocalFallback) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
  });
}

export async function processCleanupJob(job: Job): Promise<any> {
  const { name, data } = job;
  logger.info({ jobId: job.id, name, data }, 'Processing Cleanup queue job');

  switch (name) {
    case 'cleanup:files:temporary': {
      logger.info('Starting physical and database sweep for expired temporary files');
      
      let deletedFilesCount = 0;
      await withRetry(async () => {
        // 1. Fetch expired temporary file uploads
        const result = await db.query(
          `SELECT id, key FROM "FileUpload" WHERE "isTemporary" = true AND "expiresAt" < NOW()`
        );

        for (const file of result.rows) {
          try {
            // Delete physical file
            if (!isLocalFallback && s3Client) {
              await s3Client.send(
                new DeleteObjectCommand({
                  Bucket: config.r2.bucketName,
                  Key: file.key,
                })
              );
              logger.debug({ key: file.key }, 'Deleted temporary file from R2 bucket');
            } else {
              const localUploadPath = path.resolve(__dirname, '../../../uploads');
              const fullPath = path.join(localUploadPath, file.key);
              if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                logger.debug({ path: fullPath }, 'Deleted temporary file from local storage');
              }
            }

            // Delete database log record
            await db.query('DELETE FROM "FileUpload" WHERE id = $1', [file.id]);
            deletedFilesCount++;
          } catch (fileErr: any) {
            logger.error({ key: file.key, err: fileErr.message }, 'Failed to delete physical temporary file');
          }
        }
      });

      logger.info({ deletedFilesCount }, 'Successfully swept expired temporary files');
      return { deletedFilesCount };
    }

    case 'cleanup:otp:expired': {
      logger.info('Pruning OTP verifications older than 1 day and expired ones');
      
      let deletedOtpsCount = 0;
      await withRetry(async () => {
        const result = await db.query(
          `DELETE FROM "OtpVerification" WHERE "createdAt" < NOW() - INTERVAL '1 day' OR "expiresAt" < NOW()`
        );
        deletedOtpsCount = result.rowCount || 0;
      });

      logger.info({ deletedOtpsCount }, 'Successfully pruned old OTP verifications');
      return { deletedOtpsCount };
    }

    case 'cleanup:logs:old':
    case 'cleanup:whatsapp:old-messages': {
      logger.info('Pruning and rotating WhatsAppMessage logs older than 90 days');
      
      let deletedCount = 0;
      await withRetry(async () => {
        const result = await db.query(
          `DELETE FROM "WhatsAppMessage" WHERE "createdAt" < NOW() - INTERVAL '90 days'`
        );
        deletedCount = result.rowCount || 0;
      });

      logger.info({ deletedCount }, 'Successfully rotated WhatsApp messages logs');
      return { deletedCount };
    }

    default:
      throw new Error(`Unknown job name in Cleanup queue: ${name}`);
  }
}
