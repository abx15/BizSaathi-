import { Worker } from 'bullmq';
import { redisConnection } from '../redis';
import { logger } from '../logger';
import { config } from '../config';
import { processCleanupJob } from '../processors/cleanup.processor';
import { metrics } from '../utils/metrics';

export function startCleanupWorker() {
  const worker = new Worker('cleanup', processCleanupJob, {
    connection: redisConnection,
    concurrency: config.concurrency.cleanup,
  });

  worker.on('active', (job) => {
    metrics.jobStarted('cleanup', job.id || 'unknown');
  });

  worker.on('completed', (job) => {
    metrics.jobCompleted('cleanup', job.id || 'unknown');
  });

  worker.on('failed', (job, err) => {
    metrics.jobFailed('cleanup', job?.id || 'unknown', err);
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker general error occurred on Cleanup queue');
  });

  logger.info({ concurrency: config.concurrency.cleanup }, 'Cleanup Worker started successfully');
  return worker;
}
