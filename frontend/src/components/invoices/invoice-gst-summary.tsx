'use client';

import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Sparkles, Info } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { formatINR } from '@/lib/format';

interface GstGroup {
  hsnCode: string;
  rate: number;
  taxableValue: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export function InvoiceGstSummary() {
  const { control } = useFormContext();
  const tenant = useAuthStore((state) => state.tenant);

  // Watch fields in real-time
  const items = useWatch({ control, name: 'items' }) || [];
  const isGstInvoice = useWatch({ control, name: 'isGstInvoice' });
  const placeOfSupply = useWatch({ control, name: 'placeOfSupply' }) || 'Delhi';

  if (!isGstInvoice) {
    return null;
  }

  // Parse business state to check for intra-state (CGST+SGST) vs inter-state (IGST)
  // Let's assume Delhi as a default or extract from business address or GSTIN
  const businessGst = tenant?.gstNumber || '';
  const businessState = 
    businessGst.startsWith('07') || tenant?.address?.toLowerCase().includes('delhi') 
      ? 'Delhi' 
      : 'Delhi'; // Fallback default to Delhi

  const isSameState = placeOfSupply.toLowerCase() === businessState.toLowerCase();

  // Aggregate items by HSN + Tax Rate
  const groupsMap: Record<string, GstGroup> = {};

  items.forEach((item: any) => {
    if (!item.name) return;
    
    const hsn = item.hsnCode || 'N/A';
    const rate = parseFloat(item.gstRate) || 0;
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.rate) || 0;
    const disc = parseFloat(item.discount) || 0;

    const taxableValue = qty * price * (1 - disc / 100);
    const taxAmount = taxableValue * (rate / 100);
    
    const cgst = isSameState ? taxAmount / 2 : 0;
    const sgst = isSameState ? taxAmount / 2 : 0;
    const igst = !isSameState ? taxAmount : 0;

    const key = `${hsn}-${rate}`;

    if (groupsMap[key]) {
      groupsMap[key].taxableValue += taxableValue;
      groupsMap[key].taxAmount += taxAmount;
      groupsMap[key].cgst += cgst;
      groupsMap[key].sgst += sgst;
      groupsMap[key].igst += igst;
    } else {
      groupsMap[key] = {
        hsnCode: hsn,
        rate,
        taxableValue,
        taxAmount,
        cgst,
        sgst,
        igst,
      };
    }
  });

  const groups = Object.values(groupsMap);

  if (groups.length === 0) return null;

  // Compute grand totals
  const totalTaxable = groups.reduce((sum, g) => sum + g.taxableValue, 0);
  const totalCgst = groups.reduce((sum, g) => sum + g.cgst, 0);
  const totalSgst = groups.reduce((sum, g) => sum + g.sgst, 0);
  const totalIgst = groups.reduce((sum, g) => sum + g.igst, 0);

  return (
    <div className="p-5 border rounded-xl bg-card space-y-3">
      <div className="flex items-center justify-between border-b pb-2.5">
        <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400 mr-1.5 animate-pulse" /> GST Kar Patraka
        </h4>
        <div className="flex items-center text-[10px] text-muted-foreground font-semibold">
          <Info className="h-3 w-3 mr-1 text-indigo-400" />
          <span>
            {isSameState 
              ? `Same state (${placeOfSupply}) mein CGST + SGST lagta hai` 
              : `Alag state (Delhi → ${placeOfSupply}) mein IGST lagta hai`}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground font-bold">
              <th className="py-2 px-3">HSN Code</th>
              <th className="py-2 px-3 text-right">Taxable Value</th>
              {isSameState ? (
                <>
                  <th className="py-2 px-3 text-right">CGST</th>
                  <th className="py-2 px-3 text-right">SGST</th>
                </>
              ) : (
                <th className="py-2 px-3 text-right">IGST</th>
              )}
              <th className="py-2 px-3 text-right font-black text-foreground">Total GST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {groups.map((group, idx) => (
              <tr key={idx} className="font-semibold text-foreground">
                <td className="py-2 px-3 font-mono">
                  {group.hsnCode} <span className="text-[10px] text-muted-foreground font-bold">@{group.rate}%</span>
                </td>
                <td className="py-2 px-3 text-right">{formatINR(group.taxableValue)}</td>
                {isSameState ? (
                  <>
                    <td className="py-2 px-3 text-right text-emerald-500">{formatINR(group.cgst)}</td>
                    <td className="py-2 px-3 text-right text-emerald-500">{formatINR(group.sgst)}</td>
                  </>
                ) : (
                  <td className="py-2 px-3 text-right text-emerald-500">{formatINR(group.igst)}</td>
                )}
                <td className="py-2 px-3 text-right font-extrabold text-foreground">
                  {formatINR(group.taxAmount)}
                </td>
              </tr>
            ))}
            {/* Grand Total Row */}
            <tr className="bg-muted/10 font-bold border-t border-border/80">
              <td className="py-2.5 px-3 uppercase tracking-wide">Total</td>
              <td className="py-2.5 px-3 text-right">{formatINR(totalTaxable)}</td>
              {isSameState ? (
                <>
                  <td className="py-2.5 px-3 text-right text-emerald-600">{formatINR(totalCgst)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600">{formatINR(totalSgst)}</td>
                </>
              ) : (
                <td className="py-2.5 px-3 text-right text-emerald-600">{formatINR(totalIgst)}</td>
              )}
              <td className="py-2.5 px-3 text-right font-black text-foreground">
                {formatINR(totalCgst + totalSgst + totalIgst)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
