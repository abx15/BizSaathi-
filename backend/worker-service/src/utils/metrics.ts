import { logger } from '../logger';

class MetricsTracker {
  private activeJobs = new Map<string, number>();
  private completedCount = 0;
  private failedCount = 0;

  jobStarted(queueName: string, jobId: string) {
    this.activeJobs.set(jobId, Date.now());
    logger.debug({ queueName, jobId }, 'Job started');
  }

  jobCompleted(queueName: string, jobId: string) {
    const startedAt = this.activeJobs.get(jobId);
    const duration = startedAt ? Date.now() - startedAt : 0;
    this.activeJobs.delete(jobId);
    this.completedCount++;
    logger.info(
      { queueName, jobId, durationMs: duration, totalCompleted: this.completedCount },
      'Job completed successfully'
    );
  }

  jobFailed(queueName: string, jobId: string, error: Error) {
    const startedAt = this.activeJobs.get(jobId);
    const duration = startedAt ? Date.now() - startedAt : 0;
    this.activeJobs.delete(jobId);
    this.failedCount++;
    logger.error(
      { queueName, jobId, error: error.message, durationMs: duration, totalFailed: this.failedCount },
      'Job failed execution'
    );
  }

  getMetrics() {
    return {
      activeJobsCount: this.activeJobs.size,
      completedJobs: this.completedCount,
      failedJobs: this.failedCount,
    };
  }
}

export const metrics = new MetricsTracker();
