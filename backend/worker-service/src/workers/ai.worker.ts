import { Worker } from 'bullmq';
import { redisConnection } from '../redis';
import { logger } from '../logger';
import { config } from '../config';
import { processAiJob } from '../processors/ai.processor';
import { metrics } from '../utils/metrics';

export function startAIWorker() {
  const worker = new Worker('ai', processAiJob, {
    connection: redisConnection,
    concurrency: config.concurrency.ai,
  });

  worker.on('active', (job) => {
    metrics.jobStarted('ai', job.id || 'unknown');
  });

  worker.on('completed', (job) => {
    metrics.jobCompleted('ai', job.id || 'unknown');
  });

  worker.on('failed', (job, err) => {
    metrics.jobFailed('ai', job?.id || 'unknown', err);
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker general error occurred on AI queue');
  });

  logger.info({ concurrency: config.concurrency.ai }, 'AI Worker started successfully');
  return worker;
}
