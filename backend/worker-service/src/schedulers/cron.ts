import { Queue } from 'bullmq';
import { redisConnection } from '../redis';
import { logger } from '../logger';

export async function setupRepeatableJobs() {
  logger.info('Setting up periodic repeatable cron jobs...');

  const invoiceQueue = new Queue('invoice', { connection: redisConnection });
  const cleanupQueue = new Queue('cleanup', { connection: redisConnection });

  try {
    // 1. Prune existing repeatable jobs to prevent duplicates/leaks
    const oldInvoiceRepeatable = await invoiceQueue.getRepeatableJobs();
    for (const job of oldInvoiceRepeatable) {
      await invoiceQueue.removeRepeatableByKey(job.key);
    }
    const oldCleanupRepeatable = await cleanupQueue.getRepeatableJobs();
    for (const job of oldCleanupRepeatable) {
      await cleanupQueue.removeRepeatableByKey(job.key);
    }

    logger.debug('Old repeatable jobs pruned successfully.');

    // 2. Add Invoice Overdue Check - Runs daily at 2:00 AM
    await invoiceQueue.add(
      'invoice:overdue:check',
      {},
      {
        jobId: 'cron:invoice:overdue:check',
        repeat: { pattern: '0 2 * * *' }, // Daily at 2 AM
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    logger.info('Scheduled repeatable job: Overdue Invoice Check (Daily at 02:00)');

    // 3. Add Auto-send Payment Reminders - Runs daily at 9:00 AM IST / 3:30 AM UTC
    await invoiceQueue.add(
      'invoice:reminder:auto-send',
      {},
      {
        jobId: 'cron:invoice:reminder:auto-send',
        repeat: { pattern: '30 3 * * *' }, // Daily at 3:30 AM UTC
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    logger.info('Scheduled repeatable job: Auto-send Payment Reminders (Daily at 03:30 UTC / 09:00 IST)');

    // 4. Add Check Recurring Invoices - Runs daily at 1:00 AM
    await invoiceQueue.add(
      'invoice:recurring:generate',
      {},
      {
        jobId: 'cron:invoice:recurring:generate',
        repeat: { pattern: '0 1 * * *' }, // Daily at 1 AM
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    logger.info('Scheduled repeatable job: Recurring Invoices Generator (Daily at 01:00)');

    // 5. Add Expired OTP Cleanup - Runs every hour
    await cleanupQueue.add(
      'cleanup:otp:expired',
      {},
      {
        jobId: 'cron:cleanup:otp:expired',
        repeat: { pattern: '0 * * * *' }, // Hourly
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    logger.info('Scheduled repeatable job: Expired OTP Cleanup (Hourly)');

    // 6. Add Expired Temporary Files Cleanup - Runs every 6 hours
    await cleanupQueue.add(
      'cleanup:files:temporary',
      { olderThanHours: 24 },
      {
        jobId: 'cron:cleanup:files:temporary',
        repeat: { pattern: '0 */6 * * *' }, // Every 6 hours
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    logger.info('Scheduled repeatable job: Temporary Files Cleanup (Every 6 hours)');

    // 7. Add Old Message Cleanup - Runs Sunday at 2:00 AM
    await cleanupQueue.add(
      'cleanup:logs:old',
      { olderThanDays: 90 },
      {
        jobId: 'cron:cleanup:logs:old',
        repeat: { pattern: '0 2 * * 0' }, // Sunday at 2 AM
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    logger.info('Scheduled repeatable job: Old Message Logs Cleanup (Sunday at 02:00)');

  } catch (err) {
    logger.error({ err }, 'Failed to schedule repeatable cron jobs');
  } finally {
    // Gracefully close Queue instances so they don't leak connections
    await invoiceQueue.close();
    await cleanupQueue.close();
  }
}

