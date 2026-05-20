import { Pool } from 'pg';
import { config } from './config';
import { logger } from './logger';

export const dbPool = new Pool({
  connectionString: config.dbUrl,
  max: 20, // connection pool limit
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

dbPool.on('connect', () => {
  logger.debug('Database client connected from pool');
});

dbPool.on('error', (err: Error) => {
  logger.error({ err }, 'Unexpected database pool connection error');
});

export const db = {
  query: (text: string, params?: any[]) => {
    return dbPool.query(text, params);
  },
  transaction: async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};
