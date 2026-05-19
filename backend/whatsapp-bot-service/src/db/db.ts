import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10, // maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('PostgreSQL connected successfully to bot service pool');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL bot service pool connection error', err);
});
