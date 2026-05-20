import { Controller, Get, Post, Delete, Param, Query, HttpCode, HttpStatus, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from './queue.constants';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Admin Queues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/queues')
export class QueueAdminController {
  private readonly queuesMap: Record<string, Queue>;

  constructor(
    @InjectQueue(QUEUES.PDF) pdfQueue: Queue,
    @InjectQueue(QUEUES.EMAIL) emailQueue: Queue,
    @InjectQueue(QUEUES.WHATSAPP) whatsappQueue: Queue,
    @InjectQueue(QUEUES.NOTIFICATION) notificationQueue: Queue,
    @InjectQueue(QUEUES.INVOICE) invoiceQueue: Queue,
    @InjectQueue(QUEUES.PAYROLL) payrollQueue: Queue,
    @InjectQueue(QUEUES.AI) aiQueue: Queue,
    @InjectQueue(QUEUES.CLEANUP) cleanupQueue: Queue,
  ) {
    this.queuesMap = {
      [QUEUES.PDF]: pdfQueue,
      [QUEUES.EMAIL]: emailQueue,
      [QUEUES.WHATSAPP]: whatsappQueue,
      [QUEUES.NOTIFICATION]: notificationQueue,
      [QUEUES.INVOICE]: invoiceQueue,
      [QUEUES.PAYROLL]: payrollQueue,
      [QUEUES.AI]: aiQueue,
      [QUEUES.CLEANUP]: cleanupQueue,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all background queues with job counts' })
  async listQueues() {
    const result = [];
    for (const [name, queue] of Object.entries(this.queuesMap)) {
      const counts = await queue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting', 'paused');
      const isPaused = await queue.isPaused();
      result.push({
        name,
        isPaused,
        counts,
      });
    }
    return result;
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get queue details and list of jobs' })
  async getQueueDetails(
    @Param('name') name: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const queue = this.queuesMap[name];
    if (!queue) {
      throw new NotFoundException(`Queue ${name} not found`);
    }

    const counts = await queue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting', 'paused');
    const isPaused = await queue.isPaused();

    const p = Math.max(1, parseInt(page, 10));
    const l = Math.max(1, parseInt(limit, 10));
    const start = (p - 1) * l;
    const end = start + l - 1;

    const statuses: any[] = status ? [status] : ['active', 'completed', 'failed', 'delayed', 'waiting', 'paused'];
    const jobs = await queue.getJobs(statuses, start, end, true);

    return {
      name,
      isPaused,
      counts,
      jobs: jobs.map(j => ({
        id: j.id,
        name: j.name,
        data: j.data,
        opts: j.opts,
        progress: j.progress,
        failedReason: j.failedReason,
        stacktrace: j.stacktrace,
        attemptsMade: j.attemptsMade,
        timestamp: j.timestamp,
        processedOn: j.processedOn,
        finishedOn: j.finishedOn,
      })),
      page: p,
      limit: l,
    };
  }

  @Post(':name/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry all failed jobs in a queue' })
  async retryFailedJobs(@Param('name') name: string) {
    const queue = this.queuesMap[name];
    if (!queue) {
      throw new NotFoundException(`Queue ${name} not found`);
    }
    const failedJobs = await queue.getFailed();
    const retriedCount = failedJobs.length;
    for (const job of failedJobs) {
      await job.retry();
    }
    return { message: `Retried ${retriedCount} failed jobs in queue ${name}`, retriedCount };
  }

  @Post(':name/prune')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prune completed or failed jobs from a queue' })
  async pruneJobs(
    @Param('name') name: string,
    @Query('status') status: 'completed' | 'failed' = 'completed',
    @Query('grace') grace = '0',
  ) {
    const queue = this.queuesMap[name];
    if (!queue) {
      throw new NotFoundException(`Queue ${name} not found`);
    }
    const graceMs = parseInt(grace, 10) || 0;
    const jobsRemoved = await queue.clean(graceMs, 10000, status);
    return { message: `Pruned ${jobsRemoved.length} ${status} jobs in queue ${name}`, count: jobsRemoved.length };
  }

  @Post(':name/jobs/:id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a specific failed job' })
  async retryJob(@Param('name') name: string, @Param('id') id: string) {
    const queue = this.queuesMap[name];
    if (!queue) {
      throw new NotFoundException(`Queue ${name} not found`);
    }
    const job = await queue.getJob(id);
    if (!job) {
      throw new NotFoundException(`Job ${id} not found in queue ${name}`);
    }
    const isFailed = await job.isFailed();
    if (!isFailed) {
      return { message: `Job ${id} is not in failed state` };
    }
    await job.retry();
    return { message: `Job ${id} has been retried` };
  }

  @Delete(':name/jobs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a specific job from the queue' })
  async deleteJob(@Param('name') name: string, @Param('id') id: string) {
    const queue = this.queuesMap[name];
    if (!queue) {
      throw new NotFoundException(`Queue ${name} not found`);
    }
    const job = await queue.getJob(id);
    if (!job) {
      throw new NotFoundException(`Job ${id} not found in queue ${name}`);
    }
    await job.remove();
    return { message: `Job ${id} has been removed from queue ${name}` };
  }
}
