import { Worker } from 'bullmq';
import { redisConnection } from '../redis';
import { logger } from '../logger';
import { config } from '../config';
import { processNotificationJob } from '../processors/notification.processor';
import { metrics } from '../utils/metrics';

export function startNotificationWorker() {
  const worker = new Worker('notification', processNotificationJob, {
    connection: redisConnection,
    concurrency: config.concurrency.notification,
  });

  worker.on('active', (job) => {
    metrics.jobStarted('notification', job.id || 'unknown');
  });

  worker.on('completed', (job) => {
    metrics.jobCompleted('notification', job.id || 'unknown');
  });

  worker.on('failed', (job, err) => {
    metrics.jobFailed('notification', job?.id || 'unknown', err);
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker general error occurred on Notification queue');
  });

  logger.info({ concurrency: config.concurrency.notification }, 'Notification Worker started successfully');
  return worker;
}
