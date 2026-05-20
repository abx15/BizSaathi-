import { Worker } from 'bullmq';
import { redisConnection } from '../redis';
import { logger } from '../logger';
import { config } from '../config';
import { processEmailJob } from '../processors/email.processor';
import { metrics } from '../utils/metrics';

export function startEmailWorker() {
  const worker = new Worker('email', processEmailJob, {
    connection: redisConnection,
    concurrency: config.concurrency.email,
  });

  worker.on('active', (job) => {
    metrics.jobStarted('email', job.id || 'unknown');
  });

  worker.on('completed', (job) => {
    metrics.jobCompleted('email', job.id || 'unknown');
  });

  worker.on('failed', (job, err) => {
    metrics.jobFailed('email', job?.id || 'unknown', err);
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker general error occurred on Email queue');
  });

  logger.info({ concurrency: config.concurrency.email }, 'Email Worker started successfully');
  return worker;
}
