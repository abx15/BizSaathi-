import { Worker } from 'bullmq';
import { redisConnection } from '../redis';
import { logger } from '../logger';
import { config } from '../config';
import { processInvoiceJob } from '../processors/invoice.processor';
import { metrics } from '../utils/metrics';

export function startInvoiceWorker() {
  const worker = new Worker('invoice', processInvoiceJob, {
    connection: redisConnection,
    concurrency: config.concurrency.invoice,
  });

  worker.on('active', (job) => {
    metrics.jobStarted('invoice', job.id || 'unknown');
  });

  worker.on('completed', (job) => {
    metrics.jobCompleted('invoice', job.id || 'unknown');
  });

  worker.on('failed', (job, err) => {
    metrics.jobFailed('invoice', job?.id || 'unknown', err);
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker general error occurred on Invoice queue');
  });

  logger.info({ concurrency: config.concurrency.invoice }, 'Invoice Worker started successfully');
  return worker;
}
