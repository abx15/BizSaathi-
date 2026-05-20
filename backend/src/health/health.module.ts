import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DbHealthIndicator } from './indicators/db.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { QueueHealthIndicator } from './indicators/queue.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    DbHealthIndicator,
    RedisHealthIndicator,
    QueueHealthIndicator,
  ],
})
export class HealthModule {}
