import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { EventType, EventEnvelope } from './event-types';
import { randomUUID } from 'crypto';

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Publish an event to the appropriate Redis channel so the WebSocket realtime service picks it up.
   * @param event The event details.
   */
  async publish<T = Record<string, unknown>>(event: {
    type: EventType;
    tenantId: string;
    userId?: string;
    payload: T;
  }): Promise<void> {
    const envelope: EventEnvelope<T> = {
      id: randomUUID(),
      type: event.type,
      tenantId: event.tenantId,
      userId: event.userId,
      payload: event.payload,
      timestamp: new Date().toISOString(),
    };

    // Routing channel naming:
    // If target specific user, publish to user:{userId}
    // Else, broadcast to all users in tenant room via tenant:{tenantId}
    const channel = event.userId
      ? `user:${event.userId}`
      : `tenant:${event.tenantId}`;

    try {
      const message = JSON.stringify(envelope);
      await this.redisService.publish(channel, message);
      this.logger.debug(
        `Successfully published event ${envelope.type} (${envelope.id}) to Redis channel ${channel}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to publish event ${envelope.type} to channel ${channel}`,
        err,
      );
    }
  }
}
