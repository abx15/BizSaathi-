'use client';

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatINR, formatINRCompact } from '@/lib/format';
import { ExpenseAnalytics } from '@/lib/api/dashboard';

interface ExpenseChartProps {
  data?: ExpenseAnalytics;
  isLoading: boolean;
}

export function ExpenseChart({ data, isLoading }: ExpenseChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading || !mounted) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground">
            Kharche Ka Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4 animate-pulse">
            <div className="h-40 w-40 rounded-full bg-muted/40" />
            <div className="space-y-2 w-full max-w-[150px]">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 w-full bg-muted/40 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback data if API returns empty
  const categories = data?.byCategory || [
    { categoryId: '1', categoryName: 'Rent', icon: '🏠', color: '#f43f5e', amount: 50000, percentage: 42.8, count: 1 },
    { categoryId: '2', categoryName: 'Salary', icon: '👥', color: '#3b82f6', amount: 45000, percentage: 38.5, count: 3 },
    { categoryId: '3', categoryName: 'Materials', icon: '📦', color: '#10b981', amount: 15000, percentage: 12.8, count: 5 },
    { categoryId: '4', categoryName: 'Others', icon: '⚙️', color: '#64748b', amount: 6800, percentage: 5.9, count: 2 },
  ];

  const totalExpense = data?.summary?.totalExpenses ?? categories.reduce((sum, c) => sum + c.amount, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const category = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-800 text-slate-100 p-2.5 rounded-lg shadow-xl text-xs space-y-0.5">
          <p className="font-bold text-slate-400">
            {category.icon} {category.categoryName}
          </p>
          <p className="font-extrabold text-sm">{formatINR(category.amount)}</p>
          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
            {category.percentage.toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full h-full border hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-foreground">
          Kharche Ka Breakdown
        </CardTitle>
        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
          Is mahine ke kharche by category
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-4 md:gap-8">
          {/* Donut Container */}
          <div className="relative w-44 h-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="amount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  animationDuration={1200}
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Kharcha
              </span>
              <span className="text-lg font-black text-foreground mt-0.5">
                {formatINRCompact(totalExpense)}
              </span>
            </div>
          </div>

          {/* Right Custom Legend List */}
          <div className="flex-1 w-full space-y-2 max-h-[176px] overflow-y-auto pr-1">
            {categories.map((c) => (
              <div
                key={c.categoryId}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg border border-border/20 bg-muted/10 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.color || '#64748b' }}
                  />
                  <span className="text-base leading-none">{c.icon || '💸'}</span>
                  <span className="font-bold text-foreground truncate max-w-[80px] sm:max-w-[100px]">
                    {c.categoryName}
                  </span>
                </div>
                <div className="text-right space-y-0.5 ml-2">
                  <p className="font-extrabold text-foreground">{formatINRCompact(c.amount)}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    {c.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
