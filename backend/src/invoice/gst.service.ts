import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';

@Injectable()
export class GstService {
  /**
   * Calculates the GST breakdown for a single item.
   * Rounding rule: banker's rounding to 2 decimal places.
   */
  calculateItemGst(
    quantity: number | string | Decimal,
    rate: number | string | Decimal,
    discountPercent: number | string | Decimal,
    gstRate: number | string | Decimal,
    isInterState: boolean,
  ) {
    const qty = new Decimal(quantity);
    const r = new Decimal(rate);
    const discount = new Decimal(discountPercent);
    const taxRate = new Decimal(gstRate);

    // taxableAmount = (quantity * rate) * (1 - discount/100)
    const grossAmount = qty.mul(r);
    const discountAmount = grossAmount.mul(discount).div(100);
    const taxableAmount = grossAmount.sub(discountAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

    let cgst = new Decimal(0);
    let sgst = new Decimal(0);
    let igst = new Decimal(0);

    if (isInterState) {
      // IGST
      igst = taxableAmount.mul(taxRate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    } else {
      // CGST + SGST
      const halfRate = taxRate.div(2);
      cgst = taxableAmount.mul(halfRate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
      sgst = taxableAmount.mul(halfRate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    }

    const totalTax = cgst.plus(sgst).plus(igst);
    const totalAmount = taxableAmount.plus(totalTax);

    return {
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalAmount,
    };
  }

  /**
   * Summarizes all items for invoice totals.
   */
  summarizeInvoice(items: Array<any>) {
    let subtotal = new Decimal(0);
    let totalCgst = new Decimal(0);
    let totalSgst = new Decimal(0);
    let totalIgst = new Decimal(0);

    items.forEach((item) => {
      // item.amount corresponds to taxableAmount
      subtotal = subtotal.plus(new Decimal(item.amount || 0));
      totalCgst = totalCgst.plus(new Decimal(item.cgst || 0));
      totalSgst = totalSgst.plus(new Decimal(item.sgst || 0));
      totalIgst = totalIgst.plus(new Decimal(item.igst || 0));
    });

    const totalAmount = subtotal.plus(totalCgst).plus(totalSgst).plus(totalIgst).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

    return {
      subtotal,
      totalCgst,
      totalSgst,
      totalIgst,
      totalAmount,
    };
  }
}
