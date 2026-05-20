'use client';

import { DollarSign, FileText, TrendingDown, TrendingUp, LineChart } from 'lucide-react';
import StatCard from './stat-card';
import { formatINR as formatINRHelper } from '@/lib/format';
import { DashboardSummary, ExpenseAnalytics, ProfitLoss } from '@/lib/api/dashboard';

interface StatCardsGridProps {
  summary?: DashboardSummary;
  expenses?: ExpenseAnalytics;
  pl?: ProfitLoss;
  isLoading: boolean;
  wsTrigger?: any; // highlight triggers
}

export default function StatCardsGrid({
  summary,
  expenses,
  pl,
  isLoading,
  wsTrigger,
}: StatCardsGridProps) {
  // 1. Revenue Metrics
  const revenue = summary?.thisMonth?.revenue || 0;
  const revenueTrend = expenses?.trend?.direction ? {
    value: expenses?.trend?.vsLastPeriod || 15,
    direction: expenses?.trend?.direction || 'up'
  } : { value: 23, direction: 'up' as const };
  const revenueSparkline = [20000, 45000, 30000, 75000, 60000, 95000, revenue || 120000];

  // 2. Invoices Metrics
  const invoiceCount = summary?.thisMonth?.invoiceCount || 0;
  const paidCount = summary?.thisMonth?.paidCount || 0;
  const pendingCount = Math.max(0, invoiceCount - paidCount);
  const paidPct = invoiceCount > 0 ? Math.round((paidCount / invoiceCount) * 100) : 0;

  // 3. Expenses Metrics
  const totalExpenses = expenses?.summary?.totalExpenses || 0;
  const expenseTrend = expenses?.trend ? {
    value: Math.abs(expenses.trend.vsLastPeriod),
    direction: expenses.trend.direction === 'up' ? ('down' as const) : ('up' as const) // Expense down is positive, but let's represent standard trends
  } : { value: 5, direction: 'down' as const };
  const expenseSparkline = [15000, 22000, 18000, 31000, 25000, 29000, totalExpenses || 25000];

  // 4. Net Profit Metrics
  const netProfit = pl?.netProfit !== undefined ? pl.netProfit : (revenue - totalExpenses);
  const profitMargin = pl?.profitMargin !== undefined ? pl.profitMargin : (revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0);
  const isProfitPositive = netProfit >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Card 1: Revenue */}
      <StatCard
        icon={<DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        iconBg="bg-emerald-500/10"
        label="Is Mahine Ki Amdani"
        rawValue={revenue}
        valueFormatter={formatINRHelper}
        subtext={`${revenueTrend.direction === 'up' ? '+' : '-'}${revenueTrend.value}% pichle mahine se`}
        trend={revenueTrend}
        sparkline={revenueSparkline}
        isLoading={isLoading}
        highlightTrigger={wsTrigger?.type === 'invoice.paid' ? wsTrigger : null}
      />

      {/* Card 2: Invoices */}
      <StatCard
        icon={<FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        iconBg="bg-blue-500/10"
        label="Invoices Bani"
        rawValue={invoiceCount}
        valueFormatter={(val) => val.toString()}
        subtext={`${paidCount} paid · ${pendingCount} pending`}
        trend={{ value: paidPct, direction: 'up' }}
        sparkline={[5, 12, 8, 15, 19, 14, invoiceCount || 23]}
        isLoading={isLoading}
        highlightTrigger={wsTrigger?.type === 'invoice.created' ? wsTrigger : null}
      />

      {/* Card 3: Expenses */}
      <StatCard
        icon={<TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
        iconBg="bg-rose-500/10"
        label="Total Kharcha"
        rawValue={totalExpenses}
        valueFormatter={formatINRHelper}
        subtext={`${expenseTrend.direction === 'down' ? '-' : '+'}${expenseTrend.value}% pichle mahine se`}
        trend={expenseTrend}
        sparkline={expenseSparkline}
        isLoading={isLoading}
        highlightTrigger={wsTrigger?.type === 'expense.created' ? wsTrigger : null}
      />

      {/* Card 4: Net Profit */}
      <StatCard
        icon={<LineChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
        iconBg="bg-purple-500/10"
        label="Net Profit"
        rawValue={netProfit}
        valueFormatter={formatINRHelper}
        subtext={`${profitMargin}% profit margin`}
        trend={{ value: profitMargin, direction: isProfitPositive ? 'up' : 'down' }}
        sparkline={[5000, 23000, 12000, 44000, 35000, 66000, netProfit || 95000]}
        isLoading={isLoading}
      />
    </div>
  );
}
