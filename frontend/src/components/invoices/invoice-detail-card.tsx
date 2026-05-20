'use client';

import React from 'react';
import { Invoice, Payment } from '@/lib/api/invoices';
import { formatINR, formatDate } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  Coins, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Receipt,
  User,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceDetailCardProps {
  invoice: Invoice;
}

export function InvoiceDetailCard({ invoice }: InvoiceDetailCardProps) {
  const balanceDue = invoice.totalAmount - invoice.paidAmount;
  const isPaid = invoice.status === 'PAID';
  const isOverdue = invoice.status === 'OVERDUE';
  const isDraft = invoice.status === 'DRAFT';
  const isCancelled = invoice.status === 'CANCELLED';

  // Format payments list
  const paymentsList = invoice.payments || [];

  // Generate lifecycle steps for the invoice status timeline
  const lifecycleSteps = [
    {
      title: 'Created (Bana Gaya)',
      description: `Draft created on ${formatDate(invoice.createdAt)}`,
      completed: true,
      active: isDraft,
    },
    {
      title: 'Sent to Grahak (Bheja Gaya)',
      description: invoice.status !== 'DRAFT' 
        ? 'Invoice sent to customer' 
        : 'Pending send operation',
      completed: invoice.status !== 'DRAFT',
      active: invoice.status === 'SENT',
    },
    {
      title: 'Payment Progress (Bhugtan)',
      description: invoice.paidAmount > 0 
        ? `₹${invoice.paidAmount} received` 
        : 'Awaiting payments',
      completed: invoice.paidAmount > 0 || isPaid,
      active: invoice.status === 'PARTIAL',
    },
    {
      title: 'Settled (Sanchit)',
      description: isPaid 
        ? 'Fully paid & settled!' 
        : isCancelled 
        ? 'Invoice cancelled' 
        : isOverdue 
        ? 'Overdue balance remaining' 
        : 'Awaiting final payment',
      completed: isPaid || isCancelled,
      active: isPaid || isCancelled || isOverdue,
      error: isOverdue,
      warning: isCancelled,
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Metrics & Payments list (2 cols wide on large screen) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Invoiced */}
          <Card className="p-5 bg-card border border-border flex items-center space-x-4">
            <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 flex items-center justify-center rounded-xl">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Invoiced Amount</span>
              <span className="text-base font-black text-foreground">{formatINR(invoice.totalAmount)}</span>
            </div>
          </Card>

          {/* Total Paid */}
          <Card className="p-5 bg-card border border-border flex items-center space-x-4">
            <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-xl">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Paid Amount</span>
              <span className="text-base font-black text-emerald-500">{formatINR(invoice.paidAmount)}</span>
            </div>
          </Card>

          {/* Balance Due */}
          <Card className={cn(
            "p-5 bg-card border border-border flex items-center space-x-4",
            balanceDue > 0 && !isCancelled && "border-rose-500/20 bg-rose-500/[0.01]"
          )}>
            <div className={cn(
              "h-10 w-10 flex items-center justify-center rounded-xl",
              balanceDue > 0 && !isCancelled ? "bg-rose-500/10 text-rose-400" : "bg-slate-500/10 text-slate-400"
            )}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Balance Due</span>
              <span className={cn(
                "text-base font-black",
                balanceDue > 0 && !isCancelled ? "text-rose-500" : "text-foreground"
              )}>
                {isCancelled ? formatINR(0) : formatINR(balanceDue)}
              </span>
            </div>
          </Card>
        </div>

        {/* Payments Ledger List */}
        <Card className="p-6 bg-card border border-border space-y-4">
          <div className="flex items-center justify-between border-b pb-3.5">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center">
              <History className="h-4.5 w-4.5 text-indigo-400 mr-2" /> Payment Ledger (Bhugtan History)
            </h3>
            <Badge variant="outline" className="text-[10px] font-bold">
              {paymentsList.length} Payment{paymentsList.length !== 1 ? 's' : ''} Received
            </Badge>
          </div>

          {paymentsList.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Coins className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground font-semibold">Koi payment history darj nahi ki gayi hai.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground font-bold text-[9px] uppercase tracking-wider select-none">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Ref ID</th>
                    <th className="py-2 px-3">Tippani (Note)</th>
                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-semibold text-foreground">
                  {paymentsList.map((pay) => (
                    <tr key={pay.id} className="hover:bg-muted/5 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{formatDate(pay.paidAt)}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          {pay.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                        {pay.reference || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground font-medium max-w-[150px] truncate">
                        {pay.note || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-500 text-sm font-black">
                        {formatINR(pay.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Status timeline / customer summary card (1 col wide) */}
      <div className="space-y-6">
        {/* Customer Quick Summary card */}
        <Card className="p-6 bg-card border border-border space-y-4">
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b pb-2 flex items-center">
            <User className="h-4 w-4 text-indigo-400 mr-1.5" /> Grahak Vivaran (Customer Info)
          </h3>

          <div className="space-y-3.5 text-xs font-semibold">
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Company / Customer Name</span>
              <span className="text-sm font-black text-foreground block">{invoice.customer?.name}</span>
            </div>
            
            {invoice.customer?.phone && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">WhatsApp / Mobile</span>
                <span className="text-foreground block">{invoice.customer.phone}</span>
              </div>
            )}

            {invoice.customer?.gstin && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-indigo-400 uppercase block font-bold">GSTIN Number</span>
                <span className="text-indigo-400 block uppercase tracking-wider">{invoice.customer.gstin}</span>
              </div>
            )}

            {invoice.customer?.address && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">Billing Address</span>
                <p className="text-muted-foreground font-medium leading-relaxed mt-0.5">
                  {invoice.customer.address}
                  {invoice.customer.city ? `, ${invoice.customer.city}` : ''}
                  {invoice.customer.state ? `, ${invoice.customer.state}` : ''}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Invoice Lifecycle Timeline */}
        <Card className="p-6 bg-card border border-border space-y-4">
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b pb-2 flex items-center">
            <TrendingUp className="h-4 w-4 text-indigo-400 mr-1.5" /> Audit Log Timeline
          </h3>

          <div className="space-y-5">
            {lifecycleSteps.map((step, idx) => {
              const Icon = step.completed 
                ? (step.error ? AlertTriangle : step.warning ? AlertTriangle : CheckCircle2) 
                : Clock;

              return (
                <div key={idx} className="flex items-start space-x-3 text-xs">
                  {/* Step status node */}
                  <div className="relative flex flex-col items-center shrink-0">
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center border",
                      step.active 
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-400 animate-pulse" 
                        : step.completed 
                        ? (step.error ? "bg-rose-500/10 border-rose-500 text-rose-500" : step.warning ? "bg-amber-500/10 border-amber-500 text-amber-500" : "bg-emerald-500/10 border-emerald-500 text-emerald-400")
                        : "bg-muted border-border/80 text-muted-foreground"
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {/* Vertical connecting line */}
                    {idx < lifecycleSteps.length - 1 && (
                      <div className={cn(
                        "w-0.5 h-10 bg-border/40 mt-1",
                        step.completed && "bg-emerald-500/20"
                      )} />
                    )}
                  </div>

                  <div className="space-y-0.5 pt-0.5">
                    <p className={cn(
                      "font-extrabold uppercase text-[10px] tracking-wide",
                      step.active ? "text-indigo-400" : step.completed ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
