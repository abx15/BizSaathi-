import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { DbHealthIndicator } from './indicators/db.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { QueueHealthIndicator } from './indicators/queue.health';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DbHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly queue: QueueHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Basic liveness health check' })
  check() {
    return this.health.check([
      () => ({ api: { status: 'up' } }),
    ]);
  }

  @Public()
  @Get('deep')
  @HealthCheck()
  @ApiOperation({ summary: 'Deep readiness system health check' })
  deepCheck() {
    return this.health.check([
      () => this.db.pingCheck('postgresql'),
      () => this.redis.pingCheck('redis'),
      () => this.queue.checkAll('queues'),
    ]);
  }
}
