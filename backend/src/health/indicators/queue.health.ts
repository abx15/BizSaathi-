import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '../../queue/queue.constants';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(
    @InjectQueue(QUEUES.PDF) private readonly pdfQueue: Queue,
    @InjectQueue(QUEUES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUES.WHATSAPP) private readonly whatsappQueue: Queue,
  ) {
    super();
  }

  async checkAll(key: string): Promise<HealthIndicatorResult> {
    try {
      // Verify queue accessibility by retrieving job counts
      const [pdfJobs, emailJobs, whatsappJobs] = await Promise.all([
        this.pdfQueue.getJobCounts('waiting', 'active'),
        this.emailQueue.getJobCounts('waiting', 'active'),
        this.whatsappQueue.getJobCounts('waiting', 'active'),
      ]);

      return this.getStatus(key, true, {
        pdf: pdfJobs,
        email: emailJobs,
        whatsapp: whatsappJobs,
      });
    } catch (err: any) {
      throw new HealthCheckError(
        'Queue health check failed',
        this.getStatus(key, false, { message: err.message }),
      );
    }
  }
}
