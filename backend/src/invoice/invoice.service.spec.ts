import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { GstService } from './gst.service';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { InvoiceNumberService } from './invoice-number.service';
import { PdfService } from './pdf.service';

describe('InvoiceService and GstService', () => {
  let gstService: GstService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GstService,
        // Provide mocks for others if InvoiceService is tested,
        // but here we focus on GST math as requested
      ],
    }).compile();

    gstService = module.get<GstService>(GstService);
  });

  it('should calculate CGST+SGST correctly (intra-state)', () => {
    // 10 items, 1000 rate, 5% discount, 18% GST, intra-state (isInterState = false)
    const result = gstService.calculateItemGst(10, 1000, 5, 18, false);

    // gross = 10000
    // discount = 500
    // taxable = 9500
    // gst 18% -> 9% CGST, 9% SGST
    // cgst = 855
    // sgst = 855
    // igst = 0
    // total = 9500 + 1710 = 11210

    expect(result.taxableAmount.toNumber()).toBe(9500);
    expect(result.cgst.toNumber()).toBe(855);
    expect(result.sgst.toNumber()).toBe(855);
    expect(result.igst.toNumber()).toBe(0);
    expect(result.totalAmount.toNumber()).toBe(11210);
  });

  it('should calculate IGST correctly (inter-state)', () => {
    // 5 items, 200 rate, 0 discount, 5% GST, inter-state (isInterState = true)
    const result = gstService.calculateItemGst(5, 200, 0, 5, true);

    // gross = 1000
    // discount = 0
    // taxable = 1000
    // igst = 50
    // total = 1050

    expect(result.taxableAmount.toNumber()).toBe(1000);
    expect(result.cgst.toNumber()).toBe(0);
    expect(result.sgst.toNumber()).toBe(0);
    expect(result.igst.toNumber()).toBe(50);
    expect(result.totalAmount.toNumber()).toBe(1050);
  });

  it('should use banker rounding for 2 decimal places', () => {
    // 1 item, rate 10.125, 0 discount, 18% GST, inter-state
    // Taxable: 10.125 -> rounds to 10.12 (banker's rounding half-even)
    const result = gstService.calculateItemGst(1, 10.125, 0, 18, true);

    expect(result.taxableAmount.toNumber()).toBe(10.12);
  });
});
