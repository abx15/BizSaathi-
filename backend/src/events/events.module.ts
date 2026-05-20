import { Module, Global } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { EventPublisherService } from './event-publisher.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [EventPublisherService],
  exports: [EventPublisherService],
})
export class EventsModule {}
