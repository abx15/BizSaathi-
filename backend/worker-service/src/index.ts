import { logger } from './logger';
import { startWorkers, stopWorkers } from './workers';
import { setupRepeatableJobs } from './schedulers/cron';
import { dbPool } from './db';
import { redisConnection } from './redis';

async function bootstrap() {
  logger.info('Starting BizSaathi Background Worker Service bootstrap...');

  // 1. Start all 8 background workers
  startWorkers();

  // 2. Setup periodic repeatable cron jobs
  await setupRepeatableJobs();

  logger.info('BizSaathi Background Worker Service successfully bootstrapped!');
}

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received termination signal, starting graceful shutdown...');
  
  try {
    // 1. Stop workers from taking new jobs
    await stopWorkers();

    // 2. Close Redis client connection
    await redisConnection.quit();
    logger.info('Redis connection closed successfully.');

    // 3. Close database connection pool
    await dbPool.end();
    logger.info('Database pool ended successfully.');

    logger.info('Graceful shutdown completed successfully. Exiting process.');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error occurred during graceful shutdown');
    process.exit(1);
  }
}

// Register process exit listeners for graceful termination
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ promise, reason }, 'Unhandled promise rejection detected');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, 'Uncaught exception detected');
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to bootstrap background worker service');
  process.exit(1);
});
