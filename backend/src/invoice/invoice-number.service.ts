import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class InvoiceNumberService {
  constructor(private readonly redis: RedisService) {}

  async generateNextInvoiceNumber(tenantId: string, invoiceDate: Date = new Date()): Promise<string> {
    const year = invoiceDate.getFullYear();
    const month = invoiceDate.getMonth(); // 0-indexed (April is 3)
    let financialYear = '';
    
    if (month >= 3) {
      financialYear = `${year}-${(year + 1).toString().slice(2)}`;
    } else {
      financialYear = `${year - 1}-${year.toString().slice(2)}`;
    }

    const key = `invoice_seq:${tenantId}:${financialYear}`;
    const sequence = await this.redis.getClient().incr(key);

    // Pad sequence to 4 digits
    const paddedSequence = sequence.toString().padStart(4, '0');
    return `INV-${financialYear}-${paddedSequence}`;
  }
}
