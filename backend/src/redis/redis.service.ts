import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined in environment variables');
    }

    this.client = new Redis(redisUrl);

    this.client.on('connect', () => {
      this.logger.log('Redis successfully connected');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Set a key-value pair in Redis.
   * @param key The key to set.
   * @param value The value to store.
   * @param ttlSeconds Optional time-to-live in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a value from Redis by key.
   * @param key The key to retrieve.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Delete a key from Redis.
   * @param key The key to delete.
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
  
  /**
   * Increment a numeric value stored at key.
   * @param key The key to increment.
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }
  
  /**
   * Set a timeout on a key.
   * @param key The key to set the timeout on.
   * @param seconds The timeout in seconds.
   */
  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }
}
