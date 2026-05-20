import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    try {
      const client = this.redis.getClient();
      const status = await client.ping();
      const responseTime = Date.now() - startTime;
      if (status === 'PONG') {
        return this.getStatus(key, true, { responseTime });
      }
      throw new Error(`Unexpected ping response: ${status}`);
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      throw new HealthCheckError(
        'Redis ping failed',
        this.getStatus(key, false, { message: err.message, responseTime }),
      );
    }
  }
}
