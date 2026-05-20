import { Worker } from 'bullmq';
import { redisConnection } from '../redis';
import { logger } from '../logger';
import { config } from '../config';
import { processWhatsappJob } from '../processors/whatsapp.processor';
import { metrics } from '../utils/metrics';

export function startWhatsAppWorker() {
  const worker = new Worker('whatsapp', processWhatsappJob, {
    connection: redisConnection,
    concurrency: config.concurrency.whatsapp,
    limiter: {
      max: 10,
      duration: 1000, // Limit meta rate requests: max 10 messages/sec
    },
  });

  worker.on('active', (job) => {
    metrics.jobStarted('whatsapp', job.id || 'unknown');
  });

  worker.on('completed', (job) => {
    metrics.jobCompleted('whatsapp', job.id || 'unknown');
  });

  worker.on('failed', (job, err) => {
    metrics.jobFailed('whatsapp', job?.id || 'unknown', err);
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker general error occurred on WhatsApp queue');
  });

  logger.info({ concurrency: config.concurrency.whatsapp }, 'WhatsApp Worker started successfully');
  return worker;
}
