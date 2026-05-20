'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { StatCard } from './stat-card';
import { DashboardSummary, ExpenseAnalytics, ProfitLoss } from '@/lib/api/dashboard';

interface StatCardsGridProps {
  summary?: DashboardSummary;
  expenses?: ExpenseAnalytics;
  pl?: ProfitLoss;
  isLoading: boolean;
  wsTriggers?: {
    revenue?: any;
    invoices?: any;
    expenses?: any;
    profit?: any;
  };
}

export function StatCardsGrid({
  summary,
  expenses,
  pl,
  isLoading,
  wsTriggers = {},
}: StatCardsGridProps) {
  // Container stagger configurations
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80 } },
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatCard
            key={i}
            isLoading={true}
            icon={<IndianRupee />}
            iconBg="bg-muted"
            label="Loading..."
            numericValue={0}
            subtext="Loading..."
          />
        ))}
      </div>
    );
  }

  // Fallback structures if queries are slow/error
  const thisMonthRevenue = summary?.thisMonth?.revenue || 0;
  const invoiceCount = summary?.thisMonth?.invoiceCount || 0;
  const paidCount = summary?.thisMonth?.paidCount || 0;
  const pendingCount = invoiceCount - paidCount;

  const totalExpenses = expenses?.summary?.totalExpenses || 0;
  const expenseDirection = expenses?.trend?.direction || 'same';
  const expenseTrendValue = expenses?.trend?.vsLastPeriod || 0;

  const netProfit = pl?.netProfit ?? (thisMonthRevenue - totalExpenses);
  const profitMargin = pl?.profitMargin ?? (thisMonthRevenue > 0 ? (netProfit / thisMonthRevenue) * 100 : 0);

  // Sparkline data sequences (last 7 points)
  const revenueSparkline = [35000, 48000, 42000, 56000, 68000, 62000, thisMonthRevenue];
  const expenseSparkline = [22000, 25000, 21000, 28000, 31000, 29000, totalExpenses];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* Card 1 — Revenue */}
      <motion.div variants={itemVariants}>
        <StatCard
          icon={<IndianRupee className="h-5 w-5" />}
          iconBg="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          label="Is Mahine Ki Amdani"
          numericValue={thisMonthRevenue}
          isCurrency={true}
          subtext="inflow pichle mahine se"
          trend={{ value: 23, direction: 'up' }} // Mock/static relative context
          sparkline={revenueSparkline}
          highlightTrigger={wsTriggers.revenue}
        />
      </motion.div>

      {/* Card 2 — Invoices */}
      <motion.div variants={itemVariants}>
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          iconBg="bg-blue-500/10 text-blue-500 border-blue-500/20"
          label="Invoices Bani"
          numericValue={invoiceCount}
          isCurrency={false}
          subtext={`${paidCount} paid · ${pendingCount} pending`}
          progress={{
            value: paidCount,
            max: invoiceCount,
          }}
          highlightTrigger={wsTriggers.invoices}
        />
      </motion.div>

      {/* Card 3 — Expenses */}
      <motion.div variants={itemVariants}>
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          iconBg="bg-rose-500/10 text-rose-500 border-rose-500/20"
          label="Total Kharcha"
          numericValue={totalExpenses}
          isCurrency={true}
          subtext="kharcha pichle mahine se"
          trend={{
            value: expenseTrendValue,
            direction: expenseDirection === 'same' ? 'same' : expenseDirection,
          }}
          sparkline={expenseSparkline}
          highlightTrigger={wsTriggers.expenses}
        />
      </motion.div>

      {/* Card 4 — Net Profit */}
      <motion.div variants={itemVariants}>
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-purple-500/10 text-purple-500 border-purple-500/20"
          label="Net Profit"
          numericValue={netProfit}
          isCurrency={true}
          subtext={`${profitMargin.toFixed(0)}% profit margin`}
          trend={{
            value: Math.abs(parseFloat(profitMargin.toFixed(1))),
            direction: netProfit >= 0 ? 'up' : 'down',
          }}
          highlightTrigger={wsTriggers.profit}
        />
      </motion.div>
    </motion.div>
  );
}
