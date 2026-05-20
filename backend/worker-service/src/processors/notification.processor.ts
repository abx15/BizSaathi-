import { Job } from 'bullmq';
import { logger } from '../logger';
import { redisConnection } from '../redis';
import { withRetry } from '../utils/retry';

export async function processNotificationJob(job: Job): Promise<any> {
  const { name, data } = job;
  logger.info({ jobId: job.id, name, data }, 'Processing Notification job');

  switch (name) {
    case 'notification:realtime:push': {
      const { tenantId, userId, eventType, eventPayload } = data;
      
      const payloadString = JSON.stringify({
        type: eventType,
        payload: eventPayload,
        timestamp: new Date().toISOString(),
      });

      await withRetry(async () => {
        // Publish to tenant channel (for realtime Go service sub 'tenant:*')
        const tenantChannel = `tenant:${tenantId}`;
        await redisConnection.publish(tenantChannel, payloadString);
        logger.debug({ channel: tenantChannel, eventType }, 'Published realtime event to tenant channel');

        // Optionally publish to user channel if userId is provided
        if (userId) {
          const userChannel = `user:${userId}`;
          await redisConnection.publish(userChannel, payloadString);
          logger.debug({ channel: userChannel, eventType }, 'Published realtime event to user channel');
        }
      });

      return { published: true };
    }

    case 'notification:dashboard:refresh': {
      const { tenantId } = data;
      
      const payloadString = JSON.stringify({
        type: 'dashboard:refresh',
        payload: { refresh: true },
        timestamp: new Date().toISOString(),
      });

      await withRetry(async () => {
        const tenantChannel = `tenant:${tenantId}`;
        await redisConnection.publish(tenantChannel, payloadString);
        logger.debug({ channel: tenantChannel }, 'Published dashboard refresh event');
      });

      return { published: true };
    }

    default:
      throw new Error(`Unknown job name in Notification queue: ${name}`);
  }
}
