'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getInvoice, updateInvoice, CreateInvoiceInput } from '@/lib/api/invoices';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { InvoiceFormSkeleton } from '@/components/invoices/invoice-skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronLeft } from 'lucide-react';

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);

  // Fetch invoice details
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
    staleTime: 0, // Enforce fresh fetch when editing
  });

  const invoice = data?.data;

  // Guard redirection if not DRAFT
  useEffect(() => {
    if (invoice && invoice.status !== 'DRAFT') {
      toast.warning('Draft invoices ko hi edit kiya ja sakta hai.', {
        description: `Invoice status: ${invoice.status}`,
      });
      router.replace(`/invoices/${id}`);
    }
  }, [invoice, id, router]);

  // Mutation to update invoice
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CreateInvoiceInput>) => updateInvoice(id, payload),
    onSuccess: (res) => {
      if (res.success && res.data) {
        toast.success(`Invoice #${res.data.invoiceNumber} update ho gaya!`);
        
        // Invalidate queries to refresh list and details
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        
        router.push(`/invoices/${id}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Invoice update karne mein truti hui.');
      setUpdating(false);
    },
  });

  const handleSubmit = async (data: CreateInvoiceInput) => {
    setUpdating(true);
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <InvoiceFormSkeleton />;
  }

  if (isError || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-bold">Invoice Details Mil Nahi Saki</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Aisa lagta hai ki yeh invoice nahi mila ya network mein koi samasya hai.
        </p>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push('/invoices')} className="font-bold text-xs uppercase">
            Invoices List Par Jao
          </Button>
          <Button onClick={() => refetch()} className="font-bold text-xs uppercase bg-primary hover:bg-primary/90 text-primary-foreground">
            Dobara Try Karein
          </Button>
        </div>
      </div>
    );
  }

  // Double-check block render if someone tries to hack the url
  if (invoice.status !== 'DRAFT') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-amber-500 animate-bounce" />
        <h2 className="text-xl font-bold">Access Blocked (Niyamit Rok)</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Suraksha aur financial consistency ke niyam ke anusaar, keval <span className="font-black text-indigo-400">DRAFT</span> status ke invoice ko hi edit kiya ja sakta hai.
        </p>
        <Button onClick={() => router.push(`/invoices/${id}`)} className="font-bold text-xs uppercase bg-indigo-600 text-white">
          <ChevronLeft className="h-4 w-4 mr-1" /> Invoice Page Par Wapas Jayein
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-1 sm:px-4 py-2">
      <InvoiceForm 
        initialData={invoice} 
        onSubmit={handleSubmit} 
        isLoading={updating} 
      />
    </div>
  );
}
