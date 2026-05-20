'use client';

import { Suspense, useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatINR, formatINRCompact } from '@/lib/format';
import { ExpenseAnalytics, CategoryExpense } from '@/lib/api/dashboard';
import { Skeleton } from './dashboard-skeleton';

interface ExpenseChartProps {
  data?: ExpenseAnalytics;
  isLoading: boolean;
}

function ExpenseChartContent({ data }: { data?: ExpenseAnalytics }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[200px] w-full bg-muted/20 animate-pulse rounded-full" />;
  }

  // Fallback demo expense categories if empty
  const defaultCategories: CategoryExpense[] = [
    { categoryId: '1', categoryName: 'Rent', icon: '🏢', color: '#10B981', amount: 50000, percentage: 42.8, count: 1 },
    { categoryId: '2', categoryName: 'Salary', icon: '👥', color: '#3B82F6', amount: 45000, percentage: 38.5, count: 2 },
    { categoryId: '3', categoryName: 'Materials', icon: '📦', color: '#F59E0B', amount: 15000, percentage: 12.8, count: 5 },
    { categoryId: '4', categoryName: 'Others', icon: '📎', color: '#64748B', amount: 6999, percentage: 5.9, count: 3 },
  ];

  const chartData = data?.byCategory?.length ? data.byCategory : defaultCategories;
  const totalExpenses = data?.summary?.totalExpenses || chartData.reduce((acc, curr) => acc + curr.amount, 0);

  // Custom tooltips matching dark-themed aesthetics
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as CategoryExpense;
      return (
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 shadow-xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <span>{item.icon}</span>
            <span>{item.categoryName}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Total Kharcha:</span>
            <span className="font-semibold">{formatINR(item.amount)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Part:</span>
            <span className="font-semibold">{item.percentage.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8 w-full">
      {/* Donut Pie Section */}
      <div className="h-[200px] w-[200px] relative flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={92}
              paddingAngle={4}
              dataKey="amount"
              nameKey="categoryName"
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#64748b'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Grand Total inside Ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Total Kharcha
          </span>
          <span className="text-lg font-extrabold text-foreground tracking-tight block">
            {formatINRCompact(totalExpenses)}
          </span>
        </div>
      </div>

      {/* Legend List */}
      <div className="flex-1 space-y-2.5 w-full">
        {chartData.map((cat, idx) => (
          <div
            key={cat.categoryId || idx}
            className="flex items-center justify-between text-xs py-1 border-b border-muted-foreground/5 last:border-b-0 hover:bg-foreground/2 px-2.5 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color || '#64748b' }}
              />
              <span className="mr-1">{cat.icon || '📎'}</span>
              <span className="font-semibold text-foreground">{cat.categoryName}</span>
            </div>
            <div className="text-right space-x-2">
              <span className="font-bold text-foreground">{formatINRCompact(cat.amount)}</span>
              <span className="text-muted-foreground text-[10px] font-medium">
                {cat.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExpenseChart({ data, isLoading }: ExpenseChartProps) {
  return (
    <div className="border border-muted/50 rounded-2xl p-6 bg-card space-y-4 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-foreground text-base">Kharche Ka Breakdown</h3>
        <p className="text-xs text-muted-foreground">Kharche is mahine category wise</p>
      </div>

      <Suspense fallback={<div className="h-[200px] w-full bg-muted/20 animate-pulse rounded-full" />}>
        {isLoading ? (
          <div className="h-[200px] w-full bg-muted/20 animate-pulse rounded-full" />
        ) : (
          <ExpenseChartContent data={data} />
        )}
      </Suspense>
    </div>
  );
}
