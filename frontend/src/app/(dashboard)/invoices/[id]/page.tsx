'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInvoice, Invoice } from '@/lib/api/invoices';
import { useWsStore } from '@/store/ws.store';
import { InvoiceDetailSkeleton } from '@/components/invoices/invoice-skeleton';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
import { InvoiceDetailCard } from '@/components/invoices/invoice-detail-card';
import { InvoiceActions } from '@/components/invoices/invoice-actions';
import { InvoicePaymentForm } from '@/components/invoices/invoice-payment-form';
import { InvoiceShareSheet } from '@/components/invoices/invoice-share-sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  RefreshCw, 
  AlertCircle, 
  FileText, 
  LayoutDashboard,
  Coins,
  Send,
  Loader2
} from 'lucide-react';

export default function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const events = useWsStore((state) => state.events);

  // Modal display states
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Fetch invoice details using TanStack Query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
    staleTime: 5 * 60 * 1000,
  });

  const invoice = data?.data;

  // Real-time WebSocket refresh triggers
  useEffect(() => {
    const latest = events[0];
    if (!latest) return;

    const payload = (latest.payload || {}) as Record<string, any>;
    if (payload.invoiceId === id) {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    }
  }, [events[0]?.id]);

  if (isLoading) {
    return <InvoiceDetailSkeleton />;
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

  return (
    <div className="space-y-6">
      {/* Top Header Actions Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/40 gap-4 print:hidden">
        <div className="flex items-center space-x-3">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 border-border/60"
          >
            <Link href="/invoices">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-foreground uppercase tracking-wide">
                Invoice Details
              </h1>
              <span className="text-xs bg-muted px-2 py-0.5 rounded font-extrabold text-muted-foreground">
                #{invoice.invoiceNumber}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
              Grahak: {invoice.customer?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-end sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 w-9 shrink-0 border-border/60"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <InvoiceActions
            invoice={invoice}
            onRecordPaymentClick={() => setPaymentOpen(true)}
            onShareClick={() => setShareOpen(true)}
          />
        </div>
      </div>

      {/* Main View Area divided by Tab Selection (Overview vs PDF) */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex justify-between items-center print:hidden border-b pb-2">
          <TabsList className="bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg text-xs font-bold uppercase tracking-wider py-1.5 px-4">
              <LayoutDashboard className="h-4 w-4 mr-1.5" /> Bahi Khata (Dashboard)
            </TabsTrigger>
            <TabsTrigger value="pdf" className="rounded-lg text-xs font-bold uppercase tracking-wider py-1.5 px-4">
              <FileText className="h-4 w-4 mr-1.5" /> A4 Tax Invoice (PDF Preview)
            </TabsTrigger>
          </TabsList>

          <span className="text-[10px] text-muted-foreground font-bold tracking-widest hidden sm:inline select-none">
            BIZSAATHI SYSTEM LEDGER
          </span>
        </div>

        {/* Overview Dashboard Tab content */}
        <TabsContent value="overview" className="space-y-6 focus-visible:outline-none print:hidden">
          <InvoiceDetailCard invoice={invoice} />
        </TabsContent>

        {/* PDF Print Preview Tab content */}
        <TabsContent value="pdf" className="focus-visible:outline-none pt-2">
          <InvoicePreview invoice={invoice} />
        </TabsContent>
      </Tabs>

      {/* Payment recording Dialog Modal */}
      {paymentOpen && (
        <InvoicePaymentForm
          invoice={invoice}
          isOpen={paymentOpen}
          onOpenChange={setPaymentOpen}
          onSuccess={() => refetch()}
        />
      )}

      {/* Share / PDF downloading Sheet Modal */}
      {shareOpen && (
        <InvoiceShareSheet
          invoice={invoice}
          isOpen={shareOpen}
          onOpenChange={setShareOpen}
        />
      )}
    </div>
  );
}
