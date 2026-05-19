import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class EmployeeCodeService {
  private readonly logger = new Logger(EmployeeCodeService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Generate a tenant-scoped employee code using Redis INCR for race-condition safety.
   * Format: EMP-001, EMP-002, ...
   */
  async generateCode(tenantId: string): Promise<string> {
    const key = `emp_code:${tenantId}`;
    const counter = await this.redis.incr(key);
    const padded = counter.toString().padStart(3, '0');
    return `EMP-${padded}`;
  }
}
