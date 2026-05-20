import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DbHealthIndicator extends HealthIndicator {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    try {
      // Execute a basic query to check DB availability
      await this.db.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      return this.getStatus(key, true, { responseTime });
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      throw new HealthCheckError(
        'Database ping failed',
        this.getStatus(key, false, { message: err.message, responseTime }),
      );
    }
  }
}
