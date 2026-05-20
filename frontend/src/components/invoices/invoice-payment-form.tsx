'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addPayment, Invoice } from '@/lib/api/invoices';
import { formatINR } from '@/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Landmark, Coins, QrCode, Loader2, Sparkles } from 'lucide-react';

const paymentSchema = (maxAmount: number) =>
  z.object({
    amount: z
      .number({ invalid_type_error: 'Bhugtan rashi likhein' })
      .min(1, 'Rashi kam se kam ₹1 honi chahiye')
      .max(maxAmount, `Rashi ₹${maxAmount} se zyada nahi ho sakti`),
    method: z.string().min(1, 'Payment method chunein'),
    reference: z.string().optional(),
    note: z.string().optional(),
    paidAt: z.string().min(1, 'Bhugtan tareekh anivary hai'),
  });

type PaymentFormValues = z.infer<ReturnType<typeof paymentSchema>>;

interface InvoicePaymentFormProps {
  invoice: Invoice;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  { id: 'UPI', label: 'UPI / Scan QR', icon: QrCode },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark },
  { id: 'CASH', label: 'Cash / Nakad', icon: Coins },
  { id: 'CARD', label: 'Debit/Credit Card', icon: CreditCard },
];

export function InvoicePaymentForm({ invoice, isOpen, onOpenChange, onSuccess }: InvoicePaymentFormProps) {
  const queryClient = useQueryClient();
  const balanceDue = invoice.totalAmount - invoice.paidAmount;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema(balanceDue)),
    defaultValues: {
      amount: balanceDue,
      method: 'UPI',
      reference: '',
      note: '',
      paidAt: new Date().toISOString().split('T')[0],
    },
  });

  const selectedMethod = watch('method');

  // React Query mutation to record payment
  const paymentMutation = useMutation({
    mutationFn: (data: PaymentFormValues) => addPayment(invoice.id, data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`₹${res.data?.paidAmount} ka bhugtan darj kiya gaya!`);
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        
        reset();
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Payment register karne mein truti hui.');
    },
  });

  const onSubmit = (values: PaymentFormValues) => {
    paymentMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px] p-6 rounded-2xl border bg-card">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-base font-extrabold text-foreground flex items-center tracking-wide uppercase">
            <Sparkles className="h-5 w-5 text-indigo-400 mr-2 animate-pulse" /> Record Payment (Bhugtan Darj Karein)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-3">
          {/* Summary Box */}
          <div className="p-4 bg-muted/20 border border-border/40 rounded-xl grid grid-cols-2 gap-4 text-xs font-semibold">
            <div className="space-y-0.5">
              <span className="text-muted-foreground">Total Invoiced</span>
              <p className="text-sm font-black text-foreground">{formatINR(invoice.totalAmount)}</p>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="text-rose-500">Remaining Balance</span>
              <p className="text-sm font-black text-rose-500">{formatINR(balanceDue)}</p>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider">
              Payment Amount (₹) *
            </Label>
            <Input
              id="amount"
              type="number"
              step="any"
              max={balanceDue}
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
              className="h-10 text-sm border-border/60 bg-transparent font-extrabold"
            />
            {errors.amount && (
              <p className="text-[10px] font-bold text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Method selector grid */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider">
              Payment Method *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setValue('method', method.id, { shouldDirty: true })}
                    className={`flex items-center space-x-2.5 p-3 border rounded-xl font-bold text-[11px] text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-border/60 bg-card hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-muted-foreground'}`} />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.method && (
              <p className="text-[10px] font-bold text-destructive">{errors.method.message}</p>
            )}
          </div>

          {/* Reference and Date group */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="paidAt" className="text-xs font-bold uppercase tracking-wider">
                Payment Date *
              </Label>
              <Input
                id="paidAt"
                type="date"
                {...register('paidAt')}
                className="h-10 text-xs border-border/60 bg-transparent font-semibold"
              />
              {errors.paidAt && (
                <p className="text-[10px] font-bold text-destructive">{errors.paidAt.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reference" className="text-xs font-bold uppercase tracking-wider">
                Ref No. (Txn ID)
              </Label>
              <Input
                id="reference"
                placeholder="UPI ID, Cheque No..."
                {...register('reference')}
                className="h-10 text-xs border-border/60 bg-transparent font-medium"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs font-bold uppercase tracking-wider">
              Internal Note (Bhugtan Tippani)
            </Label>
            <Textarea
              id="note"
              placeholder="Record references or details..."
              rows={2}
              {...register('note')}
              className="text-xs border-border/60 font-medium resize-none bg-transparent"
            />
          </div>

          <DialogFooter className="pt-4 border-t flex flex-row items-center justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="font-bold text-xs uppercase"
            >
              Close
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={paymentMutation.isPending}
              className="font-bold text-xs uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
            >
              {paymentMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                'Bhugtan Bachao'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
