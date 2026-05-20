import { Worker } from 'bullmq';
import { logger } from '../logger';

// Import start functions
import { startPdfWorker } from './pdf.worker';
import { startEmailWorker } from './email.worker';
import { startWhatsAppWorker } from './whatsapp.worker';
import { startNotificationWorker } from './notification.worker';
import { startInvoiceWorker } from './invoice.worker';
import { startPayrollWorker } from './payroll.worker';
import { startAIWorker } from './ai.worker';
import { startCleanupWorker } from './cleanup.worker';

const activeWorkers: Worker[] = [];

export function startWorkers() {
  logger.info('Initializing all 8 background workers from separate domain modules...');

  activeWorkers.push(
    startPdfWorker(),
    startEmailWorker(),
    startWhatsAppWorker(),
    startNotificationWorker(),
    startInvoiceWorker(),
    startPayrollWorker(),
    startAIWorker(),
    startCleanupWorker()
  );

  logger.info('All 8 domain-specific workers successfully started and listening!');
}

export async function stopWorkers() {
  logger.info('Gracefully shutting down all background workers...');
  await Promise.all(activeWorkers.map((w) => w.close()));
  logger.info('All background workers closed successfully.');
}
