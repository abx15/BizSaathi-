import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from './queue.constants';
import { QueueService } from './queue.service';
import { QueueAdminController } from './admin.controller';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUES.PDF },
      { name: QUEUES.EMAIL },
      { name: QUEUES.WHATSAPP },
      { name: QUEUES.NOTIFICATION },
      { name: QUEUES.INVOICE },
      { name: QUEUES.PAYROLL },
      { name: QUEUES.AI },
      { name: QUEUES.CLEANUP },
    ),
  ],
  controllers: [QueueAdminController],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}

