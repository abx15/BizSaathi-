import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export const redis = new Redis(config.REDIS_URL);

redis.on('connect', () => {
  logger.info('Redis connected successfully to bot service client');
});

redis.on('error', (err) => {
  logger.error('Redis bot service connection error', err);
});
