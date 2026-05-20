'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInvoices, InvoiceFilterParams } from '@/lib/api/invoices';
import { useWsStore } from '@/store/ws.store';
import { InvoiceFilters } from '@/components/invoices/invoice-filters';
import { InvoiceList } from '@/components/invoices/invoice-list';
import { InvoiceListSkeleton } from '@/components/invoices/invoice-skeleton';
import { Button } from '@/components/ui/button';
import { FilePlus, RefreshCw, AlertCircle, Receipt } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const events = useWsStore((state) => state.events);

  // Filters State
  const [filters, setFilters] = useState<InvoiceFilterParams>({
    page: 1,
    limit: 10,
    status: undefined,
    customerId: undefined,
    from: undefined,
    to: undefined,
    search: undefined,
  });

  // Fetch Invoices using TanStack Query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => getInvoices(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const response = data?.data;
  const invoices = response?.items || [];
  const totalPages = response?.totalPages || 1;
  const currentPage = response?.page || 1;

  // Real-time WebSocket Invalidation
  useEffect(() => {
    const latest = events[0];
    if (!latest) return;

    // React to related invoice status transitions
    if (
      latest.type === 'invoice.created' ||
      latest.type === 'invoice.paid' ||
      latest.type === 'invoice.overdue' ||
      latest.type === 'payment.received'
    ) {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  }, [events[0]?.id]);

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleFiltersChange = (newFilters: InvoiceFilterParams) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-wide flex items-center">
            <Receipt className="h-6 w-6 text-indigo-500 mr-2" /> Bahi Khata (Invoices Master)
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
            Apne saare tax aur normal invoices ko manage karein
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 w-9 shrink-0 border-border/60"
            title="Refresh Invoices List"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            asChild
            size="sm"
            className="font-bold text-xs uppercase h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          >
            <Link href="/invoices/new">
              <FilePlus className="h-4 w-4 mr-1.5" /> Naya Invoice Banao
            </Link>
          </Button>
        </div>
      </div>

      {/* Invoice Filter Controls */}
      <InvoiceFilters filters={filters} onChange={handleFiltersChange} />

      {/* Invoices List Display */}
      {isLoading ? (
        <InvoiceListSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-card border rounded-2xl">
          <AlertCircle className="h-10 w-10 text-rose-500" />
          <div>
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Invoices Load Nahi Ho Paye</h3>
            <p className="text-xs text-muted-foreground font-semibold mt-1">
              Internet connection check karein ya kripya dobara try karein.
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="font-bold text-xs uppercase">
            Dobara Try Karein
          </Button>
        </div>
      ) : (
        <InvoiceList
          invoices={invoices}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
