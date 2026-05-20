"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { toast } from "sonner";
import { Sparkles, Calendar, RefreshCw } from "lucide-react";

// API Helpers
import {
  getDashboardSummary,
  getExpenseAnalytics,
  getProfitLoss,
  getCashFlow,
  getAISummary,
} from "@/lib/api/dashboard";

// Components
import AISummaryBanner from "@/components/dashboard/ai-summary-banner";
import OverdueAlert from "@/components/dashboard/overdue-alert";
import StatCardsGrid from "@/components/dashboard/stat-cards-grid";
import RevenueChart from "@/components/dashboard/revenue-chart";
import ExpenseChart from "@/components/dashboard/expense-chart";
import QuickActions from "@/components/dashboard/quick-actions";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { TopCustomers } from "@/components/dashboard/top-customers";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";

// Stores & Hooks
import { useAuthStore } from "@/store/auth.store";
import { useWsStore } from "@/store/ws.store";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user, tenant } = useAuthStore();

  // Initialize live WebSocket connection
  useWebSocket();

  const latestEvent = useWsStore((state) => state.events[0]);
  const lastEventIdRef = useRef<string | null>(null);

  // Time-based Hinglish IST Greetings
  const getISTGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs >= 5 && hrs < 12) return { text: "Suprabhat", icon: "🌅" };
    if (hrs >= 12 && hrs < 17) return { text: "Namaskar", icon: "☀️" };
    if (hrs >= 17 && hrs < 22) return { text: "Shubh Sandhya", icon: "🌆" };
    return { text: "Namaskar", icon: "🌙" };
  };

  const greeting = getISTGreeting();

  // Dynamic ranges for this month's analytics
  const now = new Date();
  const fromStr = format(startOfMonth(now), "yyyy-MM-dd");
  const toStr = format(endOfMonth(now), "yyyy-MM-dd");
  const monthStr = format(now, "yyyy-MM");

  // Parallel TanStack Queries
  const {
    data: summaryRes,
    isLoading: isSummaryLoading,
    isRefetching: isSummaryRefetching,
    isError: isSummaryError,
  } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: getDashboardSummary,
    refetchOnWindowFocus: false,
  });

  const {
    data: expensesRes,
    isLoading: isExpensesLoading,
    isError: isExpensesError,
  } = useQuery({
    queryKey: ["dashboard", "expenses"],
    queryFn: () => getExpenseAnalytics(fromStr, toStr),
    refetchOnWindowFocus: false,
  });

  const {
    data: plRes,
    isLoading: isPlLoading,
    isError: isPlError,
  } = useQuery({
    queryKey: ["dashboard", "profitLoss"],
    queryFn: () => getProfitLoss(monthStr),
    refetchOnWindowFocus: false,
  });

  const {
    data: cashFlowRes,
    isLoading: isCashFlowLoading,
    isError: isCashFlowError,
  } = useQuery({
    queryKey: ["dashboard", "cashFlow"],
    queryFn: getCashFlow,
    refetchOnWindowFocus: false,
  });

  const {
    data: aiRes,
    isLoading: isAiLoading,
    isError: isAiError,
    refetch: refetchAi,
  } = useQuery({
    queryKey: ["dashboard", "aiSummary"],
    queryFn: getAISummary,
    refetchOnWindowFocus: false,
  });

  // WebSocket update handler
  useEffect(() => {
    if (!latestEvent) return;
    if (latestEvent.id === lastEventIdRef.current) return;

    lastEventIdRef.current = latestEvent.id;

    // Trigger instant Sonner toast notification
    if (latestEvent.type === "invoice.paid") {
      toast.success(latestEvent.title || "Bhugtan Prapt Hua!", {
        description: latestEvent.message,
      });
    } else if (latestEvent.type === "invoice.overdue") {
      toast.error(latestEvent.title || "Invoice Overdue!", {
        description: latestEvent.message,
      });
    } else if (latestEvent.type === "invoice.created") {
      toast.success(latestEvent.title || "Invoice Bani!", {
        description: latestEvent.message,
      });
    } else {
      toast.info(latestEvent.title || "Live Alert", {
        description: latestEvent.message,
      });
    }

    // Invalidate dashboard queries to pull fresh seeded/updated Neon metrics
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [latestEvent, queryClient]);

  // General loader check to prevent zero layout shifts
  const isGlobalLoading =
    isSummaryLoading || isExpensesLoading || isPlLoading || isCashFlowLoading;

  const handleManualRefresh = () => {
    toast.promise(
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      {
        loading: "Fresh metrics fetch ho rahi hain...",
        success: "Dashboard data updated!",
        error: "Refresh fail ho gaya. Kripya baad mein try karein.",
      }
    );
  };

  if (isGlobalLoading) {
    return <DashboardSkeleton />;
  }

  // Extract inner data payloads
  const summary = summaryRes?.data;
  const expenses = expensesRes?.data;
  const pl = plRes?.data;
  const cashFlow = cashFlowRes?.data;
  const aiSummary = aiRes?.data;

  const overdueCount = summary?.overdue?.count || 0;
  const overdueAmount = summary?.overdue?.amount || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Overdue Alerts (Reminders trigger) */}
      {overdueCount > 0 && (
        <OverdueAlert overdueCount={overdueCount} overdueAmount={overdueAmount} />
      )}

      {/* 2. Top Header & Indian Greeting Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary to-emerald-700 dark:from-indigo-950 dark:to-emerald-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent pointer-events-none" />
        <div className="space-y-1 z-10">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            {greeting.icon} {greeting.text}, {user?.name || "Saathi"}!
          </h2>
          <p className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
            <Badge variant="outline" className="text-white border-white/20 px-2 py-0">
              {tenant?.name || "BizSaathi Store"}
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 z-10">
          {tenant?.gstNumber && (
            <Badge className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-mono tracking-wider text-xs">
              GSTIN: {tenant.gstNumber}
            </Badge>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            className="h-9 w-9 bg-white/10 text-white hover:bg-white/20 border-white/20 rounded-xl"
            title="Refresh metrics"
          >
            <RefreshCw className={`h-4 w-4 ${isSummaryRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none font-bold shadow-md shadow-emerald-500/20 px-3 py-1 rounded-full text-xs">
            PRO ACTIVATED
          </Badge>
        </div>
      </div>

      {/* 3. AI Copilot Summary Banner */}
      <AISummaryBanner
        data={aiSummary}
        isLoading={isAiLoading}
        isError={isAiError}
        onRefresh={refetchAi}
      />

      {/* 4. KPI Stat Card Highlights Grid */}
      <StatCardsGrid
        summary={summary}
        expenses={expenses}
        pl={pl}
        isLoading={false}
        wsTrigger={latestEvent}
      />

      {/* 5. Quick Actions Shortcuts */}
      <QuickActions />

      {/* 6. Advanced Recharts Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {cashFlow ? (
            <RevenueChart data={cashFlow} isLoading={false} />
          ) : (
            <div className="h-80 flex items-center justify-center border border-dashed rounded-2xl bg-card">
              No cash flow data available
            </div>
          )}
        </div>
        <div className="col-span-1">
          {expenses ? (
            <ExpenseChart data={expenses} isLoading={false} />
          ) : (
            <div className="h-80 flex items-center justify-center border border-dashed rounded-2xl bg-card">
              No expense categories data
            </div>
          )}
        </div>
      </div>

      {/* 7. Recent Invoices, Top Customers, and WebSocket Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentInvoices invoices={summary?.recentInvoices || []} />
        </div>
        <div className="col-span-1 space-y-6">
          <TopCustomers customers={summary?.topCustomers || []} />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
