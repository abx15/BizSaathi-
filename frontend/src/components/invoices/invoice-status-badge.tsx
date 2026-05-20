'use client';

import React from 'react';
import { InvoiceStatus } from '@/lib/api/invoices';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className = '' }: InvoiceStatusBadgeProps) {
  const statusConfig = {
    DRAFT: {
      label: 'Draft',
      className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    },
    SENT: {
      label: 'Bheja Gaya',
      className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30',
    },
    PAID: {
      label: 'Paid ✓',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30',
    },
    PARTIAL: {
      label: 'Partial',
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30',
    },
    OVERDUE: {
      label: 'Overdue ⚠️',
      className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/30 animate-pulse',
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'bg-slate-100 text-slate-400 border-slate-200 line-through dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700',
    },
  }[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusConfig.className} ${className}`}
    >
      {statusConfig.label}
    </span>
  );
}
export default InvoiceStatusBadge;
