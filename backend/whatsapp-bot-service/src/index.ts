import Fastify from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import { config } from './config';
import { logger } from './utils/logger';
import { pool } from './db/db';
import { redis } from './redis/redis';
import { verifyWebhookHandler } from './webhook/verify.handler';
import { postWebhookHandler } from './webhook/webhook.handler';

const server = Fastify({
  logger: false, // use our custom structured logger instead
  bodyLimit: 1048576, // 1MB body limit
});

/**
 * Register middleware and routes
 */
const bootstrap = async () => {
  try {
    // 1. Raw body parsing is absolutely required for HMAC signature verification
    await server.register(fastifyRawBody, {
      field: 'rawBody',
      global: true,
      encoding: 'utf8',
      runFirst: true,
    });

    logger.info('Registered raw body parser middleware');

    // 2. Register HTTP endpoints
    server.get('/health', async (request, reply) => {
      return { status: 'OK', service: 'whatsapp-bot-service' };
    });

    server.get('/v1/webhook/whatsapp', verifyWebhookHandler);
    server.post('/v1/webhook/whatsapp', postWebhookHandler);

    logger.info('Registered webhook routes');

    // 3. Test DB and Redis connections
    await pool.query('SELECT 1');
    logger.info('Verified database connection pool successfully');

    await redis.ping();
    logger.info('Verified Redis connection successfully');

    // 4. Start listening
    const address = await server.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info(`WhatsApp bot service running at: ${address}`);

  } catch (err: any) {
    logger.error('Failed to start Fastify bot service', err);
    process.exit(1);
  }
};

/**
 * Handle graceful shutdowns
 */
const shutdown = async (signal: string) => {
  logger.info(`Shutdown signal received: ${signal}. Gracefully stopping bot service...`);
  
  try {
    await server.close();
    logger.info('Fastify server closed');

    await pool.end();
    logger.info('PostgreSQL pool closed');

    redis.disconnect();
    logger.info('Redis client disconnected');

    process.exit(0);
  } catch (err: any) {
    logger.error('Error during graceful shutdown', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
bootstrap();
