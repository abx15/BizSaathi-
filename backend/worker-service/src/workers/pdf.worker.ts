import { Worker } from 'bullmq';
import { redisConnection } from '../redis';
import { logger } from '../logger';
import { config } from '../config';
import { processPdfJob } from '../processors/pdf.processor';
import { metrics } from '../utils/metrics';

export function startPdfWorker() {
  const worker = new Worker('pdf', processPdfJob, {
    connection: redisConnection,
    concurrency: config.concurrency.pdf,
  });

  worker.on('active', (job) => {
    metrics.jobStarted('pdf', job.id || 'unknown');
  });

  worker.on('completed', (job) => {
    metrics.jobCompleted('pdf', job.id || 'unknown');
  });

  worker.on('failed', (job, err) => {
    metrics.jobFailed('pdf', job?.id || 'unknown', err);
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker general error occurred on PDF queue');
  });

  logger.info({ concurrency: config.concurrency.pdf }, 'PDF Worker started successfully');
  return worker;
}
