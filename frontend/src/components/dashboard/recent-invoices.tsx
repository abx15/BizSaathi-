'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, Send, SendHorizontal, Download, ArrowRight, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatINR, formatDateShort, getStatusColor } from '@/lib/format';
import { sendInvoice, sendInvoiceWhatsApp, getInvoicePdf } from '@/lib/api/invoices';
import { RecentInvoice } from '@/lib/api/dashboard';

interface RecentInvoicesProps {
  data?: RecentInvoice[];
  isLoading: boolean;
  highlightedInvoiceId?: string | null;
}

export function RecentInvoices({ data = [], isLoading, highlightedInvoiceId }: RecentInvoicesProps) {
  const router = useRouter();
  const [actingInvoiceId, setActingInvoiceId] = useState<string | null>(null);

  const handleSendInvoice = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActingInvoiceId(id);
    try {
      const res = await sendInvoice(id);
      if (res.success) {
        toast.success(`Invoice ${res.data.invoiceNumber} send kiya gaya!`, {
          icon: '📄',
        });
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Invoice bhejne mein truti hui');
    } finally {
      setActingInvoiceId(null);
    }
  };

  const handleRemindWhatsApp = async (id: string, customerName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActingInvoiceId(id);
    try {
      const res = await sendInvoiceWhatsApp(id);
      if (res.success) {
        toast.success(`${customerName} ko WhatsApp reminder bheja gaya!`, {
          icon: '📱',
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Reminder bhejne mein truti hui');
    } finally {
      setActingInvoiceId(null);
    }
  };

  const handleDownloadPdf = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActingInvoiceId(id);
    try {
      const res = await getInvoicePdf(id);
      if (res.success && res.data.signedUrl) {
        window.open(res.data.signedUrl, '_blank');
        toast.success('PDF download shuru ho gayi.');
      }
    } catch (err: any) {
      toast.error('PDF fetch karne mein truti hui');
    } finally {
      setActingInvoiceId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-card border rounded-xl space-y-4">
        <div className="h-5 w-36 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col justify-between">
      <div>
        <div className="p-6 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Haal Hi Ke Invoices</h3>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
              Aapke pichle 5 invoices ka chittha
            </p>
          </div>
          <Link href="/invoices" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
            <span>Sabhi Dekho</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {data.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground font-medium">Koi haal hi ka invoice nahi mila.</p>
            <Link href="/invoices/new" passHref>
              <Button size="sm" variant="outline" className="font-bold text-xs uppercase tracking-wide">
                Naya Invoice Banao
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-semibold">
                    <th className="py-3 px-6">Invoice #</th>
                    <th className="py-3 px-6">Customer</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((inv) => {
                    const isHighlighted = highlightedInvoiceId === inv.id;
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                        className={`border-b last:border-0 border-border/40 hover:bg-muted/10 cursor-pointer transition-colors ${
                          isHighlighted ? 'bg-emerald-500/10 dark:bg-emerald-950/20 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)] font-bold' : ''
                        }`}
                      >
                        <td className="py-3.5 px-6 font-mono font-bold text-foreground">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-foreground">
                          {inv.customerName}
                        </td>
                        <td className="py-3.5 px-6 text-right font-extrabold text-foreground">
                          {formatINR(inv.totalAmount)}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(
                              inv.status
                            )} ${inv.status === 'OVERDUE' ? 'animate-pulse' : ''}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-muted-foreground font-medium">
                          {formatDateShort(inv.invoiceDate)}
                        </td>
                        <td className="py-2 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1.5">
                            {inv.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={actingInvoiceId !== null}
                                onClick={(e) => handleSendInvoice(inv.id, e)}
                                className="h-7 px-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px] font-bold uppercase tracking-wider"
                              >
                                <SendHorizontal className="h-3 w-3 mr-1" />
                                Send
                              </Button>
                            )}

                            {(inv.status === 'SENT' || inv.status === 'PARTIAL') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={actingInvoiceId !== null}
                                onClick={(e) => handleRemindWhatsApp(inv.id, inv.customerName, e)}
                                className="h-7 px-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-[10px] font-bold uppercase tracking-wider"
                              >
                                <Phone className="h-3 w-3 mr-1" />
                                Remind
                              </Button>
                            )}

                            {inv.status === 'OVERDUE' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={actingInvoiceId !== null}
                                onClick={(e) => handleRemindWhatsApp(inv.id, inv.customerName, e)}
                                className="h-7 px-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[10px] font-bold uppercase tracking-wider animate-pulse"
                              >
                                <Phone className="h-3 w-3 mr-1" />
                                Remind
                              </Button>
                            )}

                            {inv.status === 'PAID' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={actingInvoiceId !== null}
                                onClick={(e) => handleDownloadPdf(inv.id, e)}
                                className="h-7 px-2 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 text-[10px] font-bold uppercase tracking-wider"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                PDF
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => router.push(`/invoices/${inv.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y border-t">
              {data.map((inv) => {
                const isHighlighted = highlightedInvoiceId === inv.id;
                return (
                  <div
                    key={inv.id}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className={`p-4 flex flex-col space-y-3 cursor-pointer ${
                      isHighlighted ? 'bg-emerald-500/10 dark:bg-emerald-950/20 shadow-inner' : 'active:bg-muted/10'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-mono font-black text-foreground">{inv.invoiceNumber}</h4>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">
                          {inv.customerName}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="font-extrabold text-foreground text-sm block">
                          {formatINR(inv.totalAmount)}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(
                            inv.status
                          )}`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Due: {formatDateShort(inv.dueDate)}
                      </span>
                      <div className="flex items-center space-x-2">
                        {inv.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleSendInvoice(inv.id, e)}
                            className="h-7 px-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold"
                          >
                            Send
                          </Button>
                        )}
                        {(inv.status === 'SENT' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleRemindWhatsApp(inv.id, inv.customerName, e)}
                            className="h-7 px-2 bg-blue-500/10 text-blue-500 text-[10px] font-bold"
                          >
                            Remind
                          </Button>
                        )}
                        {inv.status === 'PAID' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDownloadPdf(inv.id, e)}
                            className="h-7 px-2 bg-slate-500/10 text-slate-400 text-[10px] font-bold"
                          >
                            PDF
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => router.push(`/invoices/${inv.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
