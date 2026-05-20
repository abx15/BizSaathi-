'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { sendInvoice, deleteInvoice, Invoice } from '@/lib/api/invoices';
import { Button } from '@/components/ui/button';
import { 
  Edit3, 
  Send, 
  Trash2, 
  Share2, 
  Coins, 
  Printer, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InvoiceActionsProps {
  invoice: Invoice;
  onRecordPaymentClick: () => void;
  onShareClick: () => void;
}

export function InvoiceActions({ invoice, onRecordPaymentClick, onShareClick }: InvoiceActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Send invoice mutation
  const sendMutation = useMutation({
    mutationFn: () => sendInvoice(invoice.id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Invoice #${invoice.invoiceNumber} send kiya gaya!`);
        queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Invoice send karne mein samasya aayi.');
    },
  });

  // Delete invoice mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoice(invoice.id),
    onSuccess: () => {
      toast.success(`Invoice #${invoice.invoiceNumber} delete ho gaya.`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.push('/invoices');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Invoice delete karne mein samasya aayi.');
    },
  });

  const isDraft = invoice.status === 'DRAFT';
  const isPaid = invoice.status === 'PAID';
  const isCancelled = invoice.status === 'CANCELLED';

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2.5 items-center justify-start md:justify-end bg-card p-4 border rounded-xl print:hidden">
        {/* Print Button (Always Available) */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="font-bold text-xs uppercase h-9 text-slate-400 hover:text-foreground"
        >
          <Printer className="h-4 w-4 mr-1.5" /> Print Invoice
        </Button>

        {/* Share & Download (Always Available, except for Cancelled) */}
        {!isCancelled && (
          <Button
            variant="outline"
            size="sm"
            onClick={onShareClick}
            className="font-bold text-xs uppercase h-9 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10"
          >
            <Share2 className="h-4 w-4 mr-1.5" /> Share & PDF
          </Button>
        )}

        {/* Draft Specific Actions */}
        {isDraft && (
          <>
            {/* Edit Draft */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
              className="font-bold text-xs uppercase h-9 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10"
            >
              <Edit3 className="h-4 w-4 mr-1.5" /> Edit Invoice
            </Button>

            {/* Send Invoice (Mark active) */}
            <Button
              size="sm"
              disabled={sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
              className="font-bold text-xs uppercase h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" /> Mark as Sent
                </>
              )}
            </Button>
          </>
        )}

        {/* Record Payment (Sent / Partial / Overdue status only) */}
        {!isDraft && !isPaid && !isCancelled && (
          <Button
            size="sm"
            onClick={onRecordPaymentClick}
            className="font-bold text-xs uppercase h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
          >
            <Coins className="h-4 w-4 mr-1.5" /> Record Payment
          </Button>
        )}

        {/* Delete Invoice Button (Only drafts, or unpaid invoices) */}
        {(isDraft || (!isPaid && !isCancelled)) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="font-bold text-xs uppercase h-9 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 ml-auto md:ml-0"
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
          </Button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-[400px] p-6 rounded-2xl border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center">
              <AlertCircle className="h-5.5 w-5.5 text-rose-500 mr-2" /> Delete Confirm (Nishtikaran)
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground mt-2 leading-relaxed">
              Kya aap sach mein invoice <span className="font-extrabold text-foreground">#{invoice.invoiceNumber}</span> ko permanent delete karna chahte hain? Yeh action wapas nahi liya ja sakta.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 border-t flex flex-row items-center justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              className="font-bold text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="font-bold text-xs uppercase bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Deleting...
                </>
              ) : (
                'Ha, Delete Karo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
