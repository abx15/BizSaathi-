'use client';

import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useAuthStore } from '@/store/auth.store';
import { formatINR } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

export function InvoiceTotals() {
  const { control } = useFormContext();
  const tenant = useAuthStore((state) => state.tenant);

  // Watch fields in real-time
  const items = useWatch({ control, name: 'items' }) || [];
  const isGstInvoice = useWatch({ control, name: 'isGstInvoice' });
  const placeOfSupply = useWatch({ control, name: 'placeOfSupply' }) || 'Delhi';

  // State detection matching GST summary
  const businessGst = tenant?.gstNumber || '';
  const businessState =
    businessGst.startsWith('07') || tenant?.address?.toLowerCase().includes('delhi')
      ? 'Delhi'
      : 'Delhi';

  const isSameState = placeOfSupply.toLowerCase() === businessState.toLowerCase();

  // Compute values
  let taxableSubtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;

  items.forEach((item: any) => {
    if (!item.name) return;

    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const disc = parseFloat(item.discount) || 0;
    const gstRate = parseFloat(item.gstRate) || 0;

    const taxableValue = qty * rate * (1 - disc / 100);
    const taxAmount = isGstInvoice ? taxableValue * (gstRate / 100) : 0;

    taxableSubtotal += taxableValue;
    totalTax += taxAmount;

    if (isGstInvoice) {
      if (isSameState) {
        totalCgst += taxAmount / 2;
        totalSgst += taxAmount / 2;
      } else {
        totalIgst += taxAmount;
      }
    }
  });

  const grandTotal = taxableSubtotal + (isGstInvoice ? totalTax : 0);

  return (
    <Card className="p-6 bg-card border border-border space-y-4">
      <div className="flex items-center space-x-2 pb-2 border-b border-border/40">
        <Calculator className="h-4 w-4 text-indigo-400" />
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
          Aggregates Ledger (Total Hisab)
        </h4>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex justify-between items-center text-muted-foreground font-medium">
          <span>Taxable Subtotal</span>
          <span className="font-semibold text-foreground">{formatINR(taxableSubtotal)}</span>
        </div>

        {isGstInvoice && (
          <>
            {isSameState ? (
              <>
                <div className="flex justify-between items-center text-muted-foreground font-medium">
                  <span>Central GST (CGST)</span>
                  <span className="text-emerald-500 font-semibold">{formatINR(totalCgst)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground font-medium">
                  <span>State GST (SGST)</span>
                  <span className="text-emerald-500 font-semibold">{formatINR(totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center text-muted-foreground font-medium">
                <span>Integrated GST (IGST)</span>
                <span className="text-emerald-500 font-semibold">{formatINR(totalIgst)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-border/20 pt-2 text-muted-foreground font-medium">
              <span>Total Tax (GST Amount)</span>
              <span className="text-emerald-600 font-semibold">{formatINR(totalTax)}</span>
            </div>
          </>
        )}

        <div className="flex justify-between items-center border-t border-border/80 pt-3 text-sm">
          <span className="font-extrabold uppercase tracking-wide text-foreground">Grand Total (₹)</span>
          <span className="text-lg font-black text-foreground">{formatINR(grandTotal)}</span>
        </div>
      </div>
    </Card>
  );
}
