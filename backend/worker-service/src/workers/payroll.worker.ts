import { Worker } from 'bullmq';
import { redisConnection } from '../redis';
import { logger } from '../logger';
import { config } from '../config';
import { processPayrollJob } from '../processors/payroll.processor';
import { metrics } from '../utils/metrics';

export function startPayrollWorker() {
  const worker = new Worker('payroll', processPayrollJob, {
    connection: redisConnection,
    concurrency: config.concurrency.payroll,
  });

  worker.on('active', (job) => {
    metrics.jobStarted('payroll', job.id || 'unknown');
  });

  worker.on('completed', (job) => {
    metrics.jobCompleted('payroll', job.id || 'unknown');
  });

  worker.on('failed', (job, err) => {
    metrics.jobFailed('payroll', job?.id || 'unknown', err);
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker general error occurred on Payroll queue');
  });

  logger.info({ concurrency: config.concurrency.payroll }, 'Payroll Worker started successfully');
  return worker;
}
