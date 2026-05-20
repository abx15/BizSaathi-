import Redis from 'ioredis';
import { config } from './config';
import { logger } from './logger';

export const redisConnection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null, // REQUIRED for BullMQ
  reconnectOnError: (err) => {
    logger.error({ err }, 'Redis connection error occurring');
    return true;
  }
});

redisConnection.on('connect', () => {
  logger.info('Connected to Redis');
});

redisConnection.on('error', (err) => {
  logger.error({ err }, 'Redis general connection error');
});
