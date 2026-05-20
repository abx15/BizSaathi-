'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Invoice, sendBulkReminders, deleteInvoice } from '@/lib/api/invoices';
import { InvoiceStatusBadge } from './invoice-status-badge';
import { formatINR, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Eye, 
  Send, 
  Coins, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  FilePlus,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  Sparkles,
  Phone,
  MessageSquare
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { InvoicePaymentForm } from './invoice-payment-form';
import { InvoiceShareSheet } from './invoice-share-sheet';
import { cn } from '@/lib/utils';

interface InvoiceListProps {
  invoices: Invoice[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function InvoiceList({ invoices, currentPage, totalPages, onPageChange, isLoading = false }: InvoiceListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Selected invoices for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // States for interactive modals triggered from list rows
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);
  const [activeShareInvoice, setActiveShareInvoice] = useState<Invoice | null>(null);

  // Bulk Send WhatsApp Reminders mutation
  const bulkReminderMutation = useMutation({
    mutationFn: () => sendBulkReminders({ invoiceIds: selectedIds }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`${selectedIds.length} grahakon ko WhatsApp reminder sandesh bheja gaya!`);
        setSelectedIds([]);
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Bulk message bhejne mein samasya aayi.');
    },
  });

  // Handle select/deselect all
  const handleSelectAll = () => {
    const filterableIds = invoices
      .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
      .map(inv => inv.id);
      
    if (selectedIds.length === filterableIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filterableIds);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Delete invoice mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      toast.success('Invoice delete ho gaya.');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Invoice delete nahi ho paya.');
    },
  });

  const handleDeleteClick = (id: string, num: string) => {
    if (confirm(`Kya aap sach mein invoice #${num} ko delete karna chahte hain?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Check if all selectable invoices are checked
  const selectableInvoices = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED');
  const isAllSelected = selectableInvoices.length > 0 && selectedIds.length === selectableInvoices.length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card border rounded-2xl">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="text-xs text-muted-foreground font-semibold mt-4">Invoices load ho rahe hain, kripya pratiksha karein...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border rounded-2xl text-center space-y-4">
        <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 flex items-center justify-center rounded-2xl">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Koi Invoice Nahi Mila</h3>
          <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
            Lagta hai aapke pass filters ke anusar koi invoice nahi hai. Naya invoice banakar shuru karein!
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="font-bold text-xs uppercase bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
        >
          <Link href="/invoices/new">
            <FilePlus className="h-3.5 w-3.5 mr-1.5" /> Naya Invoice Banao
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Desktop Table View */}
      <div className="hidden md:block bg-card border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/10 text-muted-foreground font-bold text-[10px] uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 w-[4%] text-center">
                  {selectableInvoices.length > 0 && (
                    <button type="button" onClick={handleSelectAll} className="text-muted-foreground hover:text-foreground">
                      {isAllSelected ? <CheckSquare className="h-4.5 w-4.5 text-indigo-500" /> : <Square className="h-4.5 w-4.5" />}
                    </button>
                  )}
                </th>
                <th className="py-3.5 px-3 w-[12%]">Invoice No</th>
                <th className="py-3.5 px-3 w-[25%]">Customer</th>
                <th className="py-3.5 px-3 w-[12%]">Billing Date</th>
                <th className="py-3.5 px-3 w-[15%] text-right">Grand Total</th>
                <th className="py-3.5 px-4 w-[16%] text-center">Payment Status</th>
                <th className="py-3.5 px-3 w-[11%]">Status</th>
                <th className="py-3.5 px-4 w-[5%] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {invoices.map((inv) => {
                const isSelected = selectedIds.includes(inv.id);
                const isSelectable = inv.status !== 'PAID' && inv.status !== 'CANCELLED';
                const remaining = inv.totalAmount - inv.paidAmount;
                const paidPercent = inv.totalAmount > 0 ? (inv.paidAmount / inv.totalAmount) * 100 : 0;

                return (
                  <tr 
                    key={inv.id} 
                    className={cn(
                      "hover:bg-muted/5 transition-colors font-semibold group",
                      isSelected && "bg-indigo-500/5 hover:bg-indigo-500/10"
                    )}
                  >
                    {/* Multiselect Checkbox */}
                    <td className="py-3.5 px-4 text-center">
                      {isSelectable ? (
                        <button type="button" onClick={() => handleSelectOne(inv.id)} className="text-muted-foreground group-hover:text-indigo-400">
                          {isSelected ? <CheckSquare className="h-4.5 w-4.5 text-indigo-500" /> : <Square className="h-4.5 w-4.5" />}
                        </button>
                      ) : (
                        <Square className="h-4.5 w-4.5 opacity-20 cursor-not-allowed mx-auto text-slate-500" />
                      )}
                    </td>

                    {/* Invoice Number & Direct Link */}
                    <td className="py-3.5 px-3">
                      <Link 
                        href={`/invoices/${inv.id}`}
                        className="font-extrabold text-foreground hover:text-indigo-400 hover:underline tracking-wide"
                      >
                        #{inv.invoiceNumber}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-3 min-w-0">
                      <div className="truncate">
                        <span className="font-bold text-foreground block truncate">{inv.customer?.name}</span>
                        {inv.customer?.city && (
                          <span className="text-[10px] text-muted-foreground font-medium block truncate">
                            {inv.customer.city}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Billing Date */}
                    <td className="py-3.5 px-3 font-mono text-muted-foreground">
                      {formatDate(inv.invoiceDate)}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-3 text-right font-black text-foreground text-sm">
                      {formatINR(inv.totalAmount)}
                    </td>

                    {/* Paid Ledger Mini-Bar */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground leading-none">
                          <span className="text-emerald-500">{formatINR(inv.paidAmount)}</span>
                          <span className="text-rose-500">{formatINR(remaining)}</span>
                        </div>
                        {inv.totalAmount > 0 && (
                          <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${paidPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>

                    {/* Actions Context Menu */}
                    <td className="py-3.5 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs font-semibold rounded-xl border">
                          <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}`)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> View Bill
                          </DropdownMenuItem>

                          {inv.status === 'DRAFT' && (
                            <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}/edit`)}>
                              <FilePlus className="h-3.5 w-3.5 mr-2" /> Edit Draft
                            </DropdownMenuItem>
                          )}

                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT' && (
                            <DropdownMenuItem onClick={() => setActivePaymentInvoice(inv)}>
                              <Coins className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Pay Bill
                            </DropdownMenuItem>
                          )}

                          {!isCancelled(inv.status) && (
                            <DropdownMenuItem onClick={() => setActiveShareInvoice(inv)}>
                              <Send className="h-3.5 w-3.5 mr-2 text-indigo-400" /> Share & PDF
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(inv.id, inv.invoiceNumber)}
                            className="text-rose-500 hover:text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Bill
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Grid View */}
      <div className="md:hidden space-y-3.5">
        {invoices.map((inv) => {
          const isSelected = selectedIds.includes(inv.id);
          const isSelectable = inv.status !== 'PAID' && inv.status !== 'CANCELLED';
          const remaining = inv.totalAmount - inv.paidAmount;

          return (
            <Card 
              key={inv.id}
              className={cn(
                "p-4 bg-card border border-border space-y-3.5 transition-all",
                isSelected && "border-indigo-500 bg-indigo-500/5 shadow-md"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {isSelectable && (
                    <button type="button" onClick={() => handleSelectOne(inv.id)} className="text-muted-foreground mr-1">
                      {isSelected ? <CheckSquare className="h-4.5 w-4.5 text-indigo-500" /> : <Square className="h-4.5 w-4.5" />}
                    </button>
                  )}
                  <div className="space-y-0.5">
                    <Link href={`/invoices/${inv.id}`} className="font-extrabold text-foreground hover:underline text-xs tracking-wider">
                      #{inv.invoiceNumber}
                    </Link>
                    <p className="text-[10px] text-muted-foreground font-semibold font-mono">{formatDate(inv.invoiceDate)}</p>
                  </div>
                </div>
                <InvoiceStatusBadge status={inv.status} />
              </div>

              <div className="border-t border-dashed border-border/40 pt-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Customer</p>
                <p className="text-xs font-extrabold text-foreground truncate mt-0.5">{inv.customer?.name}</p>
                {inv.customer?.city && (
                  <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">Shahar: {inv.customer.city}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-dashed border-border/40 pt-3 text-xs font-semibold">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block uppercase">Total Amount</span>
                  <span className="text-sm font-black text-foreground">{formatINR(inv.totalAmount)}</span>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-[10px] text-rose-500 block uppercase">Due Balance</span>
                  <span className="text-sm font-black text-rose-500">{formatINR(remaining)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="h-8 text-[10px] font-bold uppercase px-2.5"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                </Button>

                {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT' && (
                  <Button
                    size="sm"
                    onClick={() => setActivePaymentInvoice(inv)}
                    className="h-8 text-[10px] font-bold uppercase px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Coins className="h-3.5 w-3.5 mr-1" /> Pay
                  </Button>
                )}

                {!isCancelled(inv.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveShareInvoice(inv)}
                    className="h-8 text-[10px] font-bold uppercase px-2.5 text-indigo-400 border-indigo-500/20"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" /> Share
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-card border rounded-2xl p-4 shadow-sm select-none">
          <p className="text-[10px] text-muted-foreground font-semibold">
            Page <span className="font-extrabold text-foreground">{currentPage}</span> of <span className="font-extrabold text-foreground">{totalPages}</span>
          </p>

          <div className="flex items-center space-x-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isLoading}
              onClick={() => onPageChange(currentPage - 1)}
              className="h-8 w-8 p-0 border-border/60"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || isLoading}
              onClick={() => onPageChange(currentPage + 1)}
              className="h-8 w-8 p-0 border-border/60"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar (Slides up when IDs are checked) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-slate-100 px-5 py-3 rounded-full border border-slate-800 shadow-2xl flex items-center space-x-4 animate-slideUp text-xs font-bold font-sans">
          <div className="flex items-center space-x-1.5 border-r border-slate-800 pr-3.5">
            <CheckSquare className="h-4.5 w-4.5 text-indigo-400" />
            <span>
              <span className="font-black text-indigo-400">{selectedIds.length}</span> bills selected
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              disabled={bulkReminderMutation.isPending}
              onClick={() => bulkReminderMutation.mutate()}
              className="h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase flex items-center shadow-lg shadow-emerald-500/10"
            >
              {bulkReminderMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Processing...
                </>
              ) : (
                <>
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Bulk Send Reminders
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-8 px-3 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[10px] uppercase font-bold"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Dynamic Payment Recording Form Dialog */}
      {activePaymentInvoice && (
        <InvoicePaymentForm
          invoice={activePaymentInvoice}
          isOpen={!!activePaymentInvoice}
          onOpenChange={(open) => {
            if (!open) setActivePaymentInvoice(null);
          }}
        />
      )}

      {/* Dynamic PDF & WhatsApp sharing Sheet */}
      {activeShareInvoice && (
        <InvoiceShareSheet
          invoice={activeShareInvoice}
          isOpen={!!activeShareInvoice}
          onOpenChange={(open) => {
            if (!open) setActiveShareInvoice(null);
          }}
        />
      )}
    </div>
  );
}

function isCancelled(status: string) {
  return status === 'CANCELLED';
}
