'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatINRCompact } from '@/lib/format';
import { CashFlow } from '@/lib/api/dashboard';

interface RevenueChartProps {
  data?: CashFlow;
  isLoading: boolean;
}

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading || !mounted) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground">
            Paise Ka Hisaab (6 Mahine)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full bg-muted/40 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Fallback mock data if none returned
  const chartData = data?.months || [
    { month: 'Jan', inflow: 120000, outflow: 75000, net: 45000 },
    { month: 'Feb', inflow: 150000, outflow: 90000, net: 60000 },
    { month: 'Mar', inflow: 200000, outflow: 120000, net: 80000 },
    { month: 'Apr', inflow: 180000, outflow: 95000, net: 85000 },
    { month: 'May', inflow: 220000, outflow: 110000, net: 110000 },
    { month: 'Jun', inflow: 250000, outflow: 120000, net: 130000 },
  ];

  // Custom Tooltip Renderer
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const inflow = payload[0].value;
      const outflow = payload[1].value;
      const net = inflow - outflow;
      const label = payload[0].payload.month;

      return (
        <div className="bg-slate-900 border border-slate-800 text-slate-100 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-400 border-b border-slate-800 pb-1 mb-1 uppercase tracking-wider">{label}</p>
          <p className="flex justify-between space-x-4">
            <span className="text-emerald-400">💰 Amdani (Inflow):</span>
            <span className="font-extrabold">{formatINRCompact(inflow)}</span>
          </p>
          <p className="flex justify-between space-x-4">
            <span className="text-rose-400">💸 Kharcha (Outflow):</span>
            <span className="font-extrabold">{formatINRCompact(outflow)}</span>
          </p>
          <div className="pt-1.5 mt-1 border-t border-slate-800 flex justify-between font-extrabold">
            <span>Net Bachat:</span>
            <span className={net >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {net >= 0 ? '+' : ''}{formatINRCompact(net)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full h-full border hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-bold text-foreground">
            Paise Ka Hisaab (6 Mahine)
          </CardTitle>
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
            Mahaana inflow vs outflow
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-semibold">
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Amdani</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Kharcha</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis
                dataKey="month"
                stroke="var(--color-muted-foreground, #64748b)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                stroke="var(--color-muted-foreground, #64748b)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => formatINRCompact(val)}
                dx={-8}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
              <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.2)" strokeWidth={1} />
              <Bar
                dataKey="inflow"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                animationDuration={1500}
              />
              <Bar
                dataKey="outflow"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
