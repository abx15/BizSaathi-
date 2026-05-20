'use client';

import React from 'react';
import { Invoice, InvoiceItem } from '@/lib/api/invoices';
import { formatINR, formatDate } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { InvoiceStatusBadge } from './invoice-status-badge';
import { cn } from '@/lib/utils';
import { Download, Sparkles, Building, User, Calendar, Receipt } from 'lucide-react';

interface InvoicePreviewProps {
  invoice: Invoice;
  className?: string;
}

export function InvoicePreview({ invoice, className }: InvoicePreviewProps) {
  const { tenant, user } = useAuthStore((state) => state);

  // Compute subtotal and taxes locally for display verification if needed
  const isGst = invoice.isGstInvoice;
  const placeOfSupply = invoice.placeOfSupply || 'Delhi';
  
  // Calculate if same state
  const businessGst = tenant?.gstNumber || '';
  const businessState = 
    businessGst.startsWith('07') || tenant?.address?.toLowerCase().includes('delhi') 
      ? 'Delhi' 
      : 'Delhi';
  const isSameState = placeOfSupply.toLowerCase() === businessState.toLowerCase();

  // Aggregate items by HSN + Tax Rate for GST summary table
  const gstGroups: Record<string, {
    hsnCode: string;
    rate: number;
    taxableValue: number;
    taxAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
  }> = {};

  invoice.items.forEach((item) => {
    const hsn = item.hsnCode || 'N/A';
    const rate = item.gstRate || 0;
    const qty = item.quantity || 0;
    const price = item.rate || 0;
    const disc = item.discount || 0;

    const taxableValue = qty * price * (1 - disc / 100);
    const taxAmount = isGst ? taxableValue * (rate / 100) : 0;
    const cgst = isSameState ? taxAmount / 2 : 0;
    const sgst = isSameState ? taxAmount / 2 : 0;
    const igst = !isSameState ? taxAmount : 0;

    const key = `${hsn}-${rate}`;
    if (gstGroups[key]) {
      gstGroups[key].taxableValue += taxableValue;
      gstGroups[key].taxAmount += taxAmount;
      gstGroups[key].cgst += cgst;
      gstGroups[key].sgst += sgst;
      gstGroups[key].igst += igst;
    } else {
      gstGroups[key] = {
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

  return (
    <div className={cn("max-w-4xl mx-auto bg-white text-slate-800 p-6 md:p-10 shadow-2xl rounded-2xl border border-slate-100 font-sans print:p-0 print:shadow-none print:border-none", className)}>
      {/* Decorative Brand Accent (Top border color strip) */}
      <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-2xl -mt-6 -mx-6 md:-mt-10 md:-mx-10 mb-6 md:mb-10 print:hidden" />

      {/* Invoice Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100 pb-8">
        {/* Tenant/Business Info */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 bg-indigo-600 text-white flex items-center justify-center rounded-xl shadow-lg shadow-indigo-500/20">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wide text-slate-900 uppercase">
                {tenant?.name || 'BizSaathi Trader'}
              </h1>
              <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                Tax Invoice / Bil Patra
              </p>
            </div>
          </div>
          
          <div className="text-xs text-slate-500 font-medium space-y-1 mt-2">
            {tenant?.address && <p className="leading-relaxed">{tenant.address}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold text-slate-600">
              {user?.email && <span>Email: {user.email}</span>}
              {tenant?.phone && <span>Mob: {tenant.phone}</span>}
            </div>
            {tenant?.gstNumber && (
              <p className="text-xs mt-1 pt-1.5 border-t border-slate-100">
                <span className="font-extrabold text-slate-800 tracking-wider">GSTIN: {tenant.gstNumber}</span>
              </p>
            )}
          </div>
        </div>

        {/* Invoice Metadata */}
        <div className="flex flex-col md:items-end justify-between text-left md:text-right space-y-4 md:space-y-0">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-2">
              #{invoice.invoiceNumber}
            </h2>
          </div>

          <div className="text-xs text-slate-500 font-semibold grid grid-cols-2 gap-x-4 gap-y-1 md:flex md:flex-col md:space-y-1 md:gap-0">
            <div>
              <span className="text-slate-400 font-bold mr-1">TARIQ (DATE):</span>
              <span className="text-slate-800 font-extrabold">{formatDate(invoice.invoiceDate)}</span>
            </div>
            {invoice.dueDate && (
              <div>
                <span className="text-slate-400 font-bold mr-1">DUE DATE:</span>
                <span className="text-slate-800 font-extrabold">{formatDate(invoice.dueDate)}</span>
              </div>
            )}
            {isGst && (
              <div>
                <span className="text-slate-400 font-bold mr-1">SUPPLY PLACE:</span>
                <span className="text-slate-800 font-extrabold">{placeOfSupply}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bill To Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-slate-100">
        {/* Customer Details */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center">
            <User className="h-3.5 w-3.5 mr-1 text-slate-400" /> Bill To / Grahak Vivaran
          </h3>
          <div className="text-xs font-semibold text-slate-800">
            <p className="text-sm font-extrabold text-slate-900">{invoice.customer?.name}</p>
            {invoice.customer?.address && <p className="text-slate-500 font-medium mt-1 leading-relaxed">{invoice.customer.address}</p>}
            {invoice.customer?.city && (
              <p className="text-slate-500 font-medium">
                {invoice.customer.city}
                {invoice.customer.state ? `, ${invoice.customer.state}` : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 mt-1.5 text-slate-500 font-medium">
              {invoice.customer?.phone && <span>Mob: {invoice.customer.phone}</span>}
              {invoice.customer?.email && <span>Email: {invoice.customer.email}</span>}
            </div>
          </div>
        </div>

        {/* GSTIN / Supply specifics */}
        <div className="flex flex-col md:items-end justify-end space-y-2">
          {invoice.customer?.gstin ? (
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-left md:text-right w-full md:w-auto min-w-[200px]">
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">
                Grahak GST Details
              </p>
              <p className="text-xs font-black text-indigo-900 mt-1 uppercase tracking-wider">
                {invoice.customer.gstin}
              </p>
            </div>
          ) : (
            isGst && (
              <div className="p-2 bg-slate-50 rounded-lg text-[10px] text-slate-500 font-semibold w-full md:w-auto text-left md:text-right">
                Consumer Transaction (Non-GST Customer)
              </div>
            )
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="py-8 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
              <th className="py-3 px-2 w-[5%] text-center">#</th>
              <th className="py-3 px-3 w-[45%]">Item Description</th>
              <th className="py-3 px-2 w-[10%] text-center">HSN</th>
              <th className="py-3 px-2 w-[10%] text-right">Qty</th>
              <th className="py-3 px-2 w-[12%] text-right">Rate</th>
              <th className="py-3 px-2 w-[8%] text-right">Disc %</th>
              {isGst && <th className="py-3 px-2 w-[8%] text-right">GST</th>}
              <th className="py-3 px-3 w-[15%] text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map((item, index) => {
              const qty = item.quantity || 0;
              const rate = item.rate || 0;
              const disc = item.discount || 0;
              const taxableAmount = qty * rate * (1 - disc / 100);

              return (
                <tr key={item.id || index} className="text-slate-700 font-semibold hover:bg-slate-50/50">
                  <td className="py-3.5 px-2 text-center text-slate-400 font-mono">
                    {index + 1}
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="font-extrabold text-slate-900 leading-snug">{item.name}</p>
                  </td>
                  <td className="py-3.5 px-2 text-center font-mono text-slate-500">
                    {item.hsnCode || '-'}
                  </td>
                  <td className="py-3.5 px-2 text-right text-slate-900 font-bold">
                    {qty} <span className="text-[10px] text-slate-400 font-normal">{item.unit || 'PCS'}</span>
                  </td>
                  <td className="py-3.5 px-2 text-right font-semibold">
                    {formatINR(rate)}
                  </td>
                  <td className="py-3.5 px-2 text-right text-slate-500">
                    {disc > 0 ? `${disc}%` : '-'}
                  </td>
                  {isGst && (
                    <td className="py-3.5 px-2 text-right text-slate-500 font-mono">
                      {item.gstRate}%
                    </td>
                  )}
                  <td className="py-3.5 px-3 text-right font-extrabold text-slate-900">
                    {formatINR(taxableAmount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Section (Split: Notes vs Financials) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
        {/* Notes & Terms */}
        <div className="space-y-4">
          {invoice.notes && (
            <div className="space-y-1">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Notes
              </h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {invoice.notes}
              </p>
            </div>
          )}

          {invoice.termsConditions && (
            <div className="space-y-1">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Terms & Conditions
              </h4>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed whitespace-pre-line">
                {invoice.termsConditions}
              </p>
            </div>
          )}
        </div>

        {/* Totals Box */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-5 space-y-3.5 h-fit">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Taxable Subtotal</span>
            <span className="text-slate-900 font-extrabold">{formatINR(invoice.subtotal)}</span>
          </div>

          {isGst && (
            <>
              {isSameState ? (
                <>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                    <span>CGST (Central Tax)</span>
                    <span className="text-emerald-600 font-bold">{formatINR(invoice.totalCgst)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                    <span>SGST (State Tax)</span>
                    <span className="text-emerald-600 font-bold">{formatINR(invoice.totalSgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span>IGST (Integrated Tax)</span>
                  <span className="text-emerald-600 font-bold">{formatINR(invoice.totalIgst)}</span>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Grand Total</span>
            <span className="text-lg font-black text-slate-900">{formatINR(invoice.totalAmount)}</span>
          </div>

          {invoice.paidAmount > 0 && (
            <div className="flex justify-between items-center text-xs font-bold text-emerald-600 pt-1 border-t border-dashed border-slate-200">
              <span>Paid Amount</span>
              <span>{formatINR(invoice.paidAmount)}</span>
            </div>
          )}

          {invoice.totalAmount - invoice.paidAmount > 0 && (
            <div className="flex justify-between items-center text-xs font-extrabold text-rose-500 pt-1 border-t border-dashed border-slate-200">
              <span>Balance Due</span>
              <span>{formatINR(invoice.totalAmount - invoice.paidAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* GST Summary Table (A4 Requirement for formal tax invoices) */}
      {isGst && Object.keys(gstGroups).length > 0 && (
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
            GST Tax Breakdown
          </h4>
          <table className="w-full text-left border-collapse text-[10px] text-slate-500">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-1 px-2">HSN Code</th>
                <th className="py-1 px-2 text-right">Taxable Value</th>
                {isSameState ? (
                  <>
                    <th className="py-1 px-2 text-right">CGST</th>
                    <th className="py-1 px-2 text-right">SGST</th>
                  </>
                ) : (
                  <th className="py-1 px-2 text-right">IGST</th>
                )}
                <th className="py-1 px-2 text-right font-bold text-slate-700">Total Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.values(gstGroups).map((g, idx) => (
                <tr key={idx} className="font-medium">
                  <td className="py-1.5 px-2 font-mono">
                    {g.hsnCode} <span className="text-[9px] font-bold text-indigo-500">@{g.rate}%</span>
                  </td>
                  <td className="py-1.5 px-2 text-right">{formatINR(g.taxableValue)}</td>
                  {isSameState ? (
                    <>
                      <td className="py-1.5 px-2 text-right">{formatINR(g.cgst)}</td>
                      <td className="py-1.5 px-2 text-right">{formatINR(g.sgst)}</td>
                    </>
                  ) : (
                    <td className="py-1.5 px-2 text-right">{formatINR(g.igst)}</td>
                  )}
                  <td className="py-1.5 px-2 text-right font-extrabold text-slate-800">
                    {formatINR(g.taxAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Signature & Auth footer */}
      <div className="flex flex-col md:flex-row items-end justify-between mt-12 pt-8 border-t border-slate-100 gap-6">
        <div className="text-[10px] text-slate-400 font-semibold max-w-sm">
          <p>Thank you for doing business with us! This is a system-generated electronic invoice, signature is not mandatory.</p>
        </div>
        
        <div className="text-right space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            For {tenant?.name || 'BizSaathi Trader'}
          </p>
          <div className="h-10 w-40 border-b border-dashed border-slate-300 mx-auto md:mr-0 flex items-center justify-center">
            {invoice.status === 'PAID' && (
              <span className="text-[10px] text-emerald-600 font-black tracking-widest border-2 border-emerald-600/30 px-3 py-1 rounded-lg uppercase rotate-3 select-none">
                PAID / BHUGTAN HO GAYA
              </span>
            )}
          </div>
          <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
            Authorized Signatory
          </p>
        </div>
      </div>
    </div>
  );
}
