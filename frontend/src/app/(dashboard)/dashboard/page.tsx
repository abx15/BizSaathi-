'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { useWsStore } from '@/store/ws.store';
import { formatINRCompact } from '@/lib/format';

// API Functions
import {
  getDashboardSummary,
  getExpenseAnalytics,
  getProfitLoss,
  getCashFlow,
  getAISummary,
} from '@/lib/api/dashboard';

// Subcomponents
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { AiSummaryBanner } from '@/components/dashboard/ai-summary-banner';
import { OverdueAlert } from '@/components/dashboard/overdue-alert';
import { StatCardsGrid } from '@/components/dashboard/stat-cards-grid';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentInvoices } from '@/components/dashboard/recent-invoices';
import { TopCustomers } from '@/components/dashboard/top-customers';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper to determine time-based greeting in IST
function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Suprabhat, ${name}! 🌅`;
  if (hour < 17) return `Namaskar, ${name}! ☀️`;
  return `Shubh Sandhya, ${name}! 🌆`;
}

// Format date into Indian style, e.g. "Mangalwar, 15 Jan 2025"
function getIndianFormattedDate(): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  return new Intl.DateTimeFormat('en-IN', options).format(new Date());
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const events = useWsStore((state) => state.events);

  // Trigger states for highlighting cards
  const [wsTriggers, setWsTriggers] = useState({
    revenue: 0,
    invoices: 0,
    expenses: 0,
    profit: 0,
  });

  const [highlightedInvoiceId, setHighlightedInvoiceId] = useState<string | null>(null);

  // Compute dynamic month bounds for API queries
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  ).padStart(2, '0')}`;

  // 1. Dashboard summary (invoices, top customers)
  const {
    data: summaryRes,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // 2. Expense analytics (current month)
  const {
    data: expensesRes,
    isLoading: expensesLoading,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ['dashboard', 'expenses', currentMonth],
    queryFn: () => getExpenseAnalytics(monthStart, monthEnd),
    staleTime: 5 * 60 * 1000,
  });

  // 3. Profit & Loss
  const {
    data: plRes,
    isLoading: plLoading,
    refetch: refetchPl,
  } = useQuery({
    queryKey: ['dashboard', 'pl', currentMonth],
    queryFn: () => getProfitLoss(currentMonth),
    staleTime: 5 * 60 * 1000,
  });

  // 4. Cash flow (6 months bar chart)
  const {
    data: cashflowRes,
    isLoading: cashflowLoading,
    refetch: refetchCashflow,
  } = useQuery({
    queryKey: ['dashboard', 'cashflow'],
    queryFn: getCashFlow,
    staleTime: 30 * 60 * 1000, // 30 min
  });

  // 5. AI Summary Banner
  const {
    data: aiSummaryRes,
    isLoading: aiLoading,
    isError: aiError,
    refetch: refetchAiSummary,
  } = useQuery({
    queryKey: ['dashboard', 'ai-summary'],
    queryFn: getAISummary,
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });

  // Handle refetching all queries (refresh helper)
  const refetchAll = () => {
    refetchSummary();
    refetchExpenses();
    refetchPl();
    refetchCashflow();
    refetchAiSummary();
  };

  // Extract inner payload data from APIResponse envelop safely
  const summary = summaryRes?.data;
  const expenses = expensesRes?.data;
  const pl = plRes?.data;
  const cashflow = cashflowRes?.data;
  const aiSummary = aiSummaryRes?.data;

  // WebSocket event listeners for reactive real-time updates
  useEffect(() => {
    const latest = events[0];
    if (!latest) return;

    const payload = (latest.payload || {}) as Record<string, any>;

    switch (latest.type) {
      case 'invoice.paid':
        toast.success(`₹${formatINRCompact(payload.amount || 0)} mila!`, {
          description: `${payload.customerName || 'Customer'} ne payment ki`,
          icon: '💰',
        });
        
        // Brief visual feedback triggers
        setWsTriggers((prev) => ({
          ...prev,
          revenue: prev.revenue + 1,
          profit: prev.profit + 1,
        }));
        
        if (payload.invoiceId) {
          setHighlightedInvoiceId(payload.invoiceId);
          setTimeout(() => setHighlightedInvoiceId(null), 5000); // Highlight row for 5s
        }
        
        // Invalidate TanStack query cache keys
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        break;

      case 'invoice.created':
        toast.info('Naya invoice banaya gaya', {
          description: `Invoice: ${payload.invoiceNumber || ''}`,
          icon: '📄',
        });
        
        setWsTriggers((prev) => ({
          ...prev,
          invoices: prev.invoices + 1,
        }));
        
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        break;

      case 'invoice.overdue':
        toast.warning('Invoice overdue ho gaya!', {
          description: `Invoice ${payload.invoiceNumber || ''} ka bhugtan baki hai`,
          icon: '⚠️',
        });
        
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        break;

      case 'payment.received':
        toast.success(`Payment prapt hui!`, {
          description: `Rashi: ₹${formatINRCompact(payload.amount || 0)}`,
          icon: '💰',
        });
        
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        break;

      case 'dashboard.refresh':
        refetchAll();
        break;

      case 'notification':
        toast(latest.title || 'BizSaathi Alert', {
          description: latest.message || '',
        });
        break;

      default:
        break;
    }
  }, [events[0]?.id]); // trigger strictly when event ID increments

  // Determine overall loading
  const pageLoading = summaryLoading || expensesLoading || plLoading || cashflowLoading;

  if (pageLoading) {
    return <DashboardSkeleton />;
  }

  // Handle entire page load error states elegantly
  if (summaryError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Dashboard load nahi ho saka</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Internet connection check karein ya kripya dobara koshish karein.
        </p>
        <Button onClick={refetchAll} className="font-bold flex items-center space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>Dobara Try Karein</span>
        </Button>
      </div>
    );
  }

  const userName = user?.name || 'Vyaapaari';

  return (
    <div className="space-y-6">
      {/* 1. Header Greeting section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            {getGreeting(userName)}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
            Aaj ki taaza khabar aapke business ki
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-card border px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground">
          <span>{getIndianFormattedDate()}</span>
        </div>
      </div>

      {/* 2. AI Summary Typewriter Banner */}
      <AiSummaryBanner
        data={aiSummary}
        isLoading={aiLoading}
        isError={aiError}
        onRefresh={refetchAiSummary}
      />

      {/* 3. Overdue Alert Warning Banner (Conditional) */}
      {summary && summary.overdue?.count > 0 && (
        <OverdueAlert
          overdueCount={summary.overdue.count}
          overdueAmount={summary.overdue.amount}
        />
      )}

      {/* 4. Stat Cards Grid (Dynamic Counter Animations) */}
      <StatCardsGrid
        summary={summary}
        expenses={expenses}
        pl={pl}
        isLoading={false}
        wsTriggers={wsTriggers}
      />

      {/* 5. Chart Layout Section (60/40 Split Bar & Donut Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-6">
          <RevenueChart data={cashflow} isLoading={false} />
        </div>
        <div className="lg:col-span-4">
          <ExpenseChart data={expenses} isLoading={false} />
        </div>
      </div>

      {/* 6. Quick Action Shortcuts */}
      <QuickActions />

      {/* 7. Bottom Details Block (Table + Ranking widgets + websocket activity log) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Side: Recent Invoices (60% space) */}
        <div className="lg:col-span-6">
          <RecentInvoices
            data={summary?.recentInvoices}
            isLoading={false}
            highlightedInvoiceId={highlightedInvoiceId}
          />
        </div>

        {/* Right Side: Top Customers & WebSocket logs stacked (40% space) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <TopCustomers data={summary?.topCustomers} isLoading={false} />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
