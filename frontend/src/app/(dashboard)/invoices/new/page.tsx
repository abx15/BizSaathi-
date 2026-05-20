'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createInvoice, CreateInvoiceInput } from '@/lib/api/invoices';
import { InvoiceForm } from '@/components/invoices/invoice-form';

export default function NewInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // TanStack Query mutation to create the invoice
  const createMutation = useMutation({
    mutationFn: (data: CreateInvoiceInput) => createInvoice(data),
    onSuccess: (res) => {
      if (res.success && res.data) {
        toast.success(`Naya Invoice #${res.data.invoiceNumber} safaltapurvak banaya gaya!`);
        
        // Invalidate queries to refresh lists and dashboard
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        
        // Redirect to detail page
        router.push(`/invoices/${res.data.id}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Invoice create karne mein truti hui.');
      setSubmitting(false);
    },
  });

  const handleSubmit = async (data: CreateInvoiceInput) => {
    setSubmitting(true);
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-7xl mx-auto px-1 sm:px-4 py-2">
      <InvoiceForm onSubmit={handleSubmit} isLoading={submitting} />
    </div>
  );
}
