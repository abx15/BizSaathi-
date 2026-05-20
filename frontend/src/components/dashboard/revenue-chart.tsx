'use client';

import { Suspense, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatINRCompact } from '@/lib/format';
import { CashFlow } from '@/lib/api/dashboard';
import { Skeleton } from './dashboard-skeleton';

interface RevenueChartProps {
  data?: CashFlow;
  isLoading: boolean;
}

function RevenueChartContent({ data }: { data?: CashFlow }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-[280px] w-full bg-muted/20 animate-pulse rounded-lg" />;
  }

  // Fallback mockup cash flow data if API is empty
  const defaultMonths = [
    { month: 'Dec', inflow: 145000, outflow: 92000, net: 53000 },
    { month: 'Jan', inflow: 210000, outflow: 110000, net: 100000 },
    { month: 'Feb', inflow: 180000, outflow: 130000, net: 50000 },
    { month: 'Mar', inflow: 250000, outflow: 120000, net: 130000 },
    { month: 'Apr', inflow: 290000, outflow: 140000, net: 150000 },
    { month: 'May', inflow: 330000, outflow: 175000, net: 155000 },
  ];

  const chartData = data?.months?.length ? data.months.map(m => ({
    month: m.month,
    inflow: m.inflow,
    outflow: m.outflow,
    net: m.net,
  })) : defaultMonths;

  // Custom detailed tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const inflow = payload[0].value;
      const outflow = payload[1].value;
      const net = inflow - outflow;
      const month = payload[0].payload.month;

      return (
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3.5 shadow-xl text-xs space-y-1.5 min-w-[160px]">
          <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1">
            {month} 2026
          </p>
          <div className="flex justify-between gap-4">
            <span className="text-emerald-400">Amdani (Inflow):</span>
            <span className="font-semibold">{formatINRCompact(inflow)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-rose-400">Kharcha (Outflow):</span>
            <span className="font-semibold">{formatINRCompact(outflow)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-800 pt-1 mt-1 font-bold">
            <span className={net >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              Net {net >= 0 ? 'Munafe' : 'Nuksan'}:
            </span>
            <span>{net >= 0 ? '+' : ''}{formatINRCompact(net)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-muted/10" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatINRCompact(v)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs font-semibold text-muted-foreground mr-2">
                {value === 'inflow' ? 'Amdani' : 'Kharcha'}
              </span>
            )}
          />
          <ReferenceLine y={0} stroke="#cbd5e1" className="dark:stroke-muted/20" />
          <Bar
            dataKey="inflow"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            animationDuration={800}
          />
          <Bar
            dataKey="outflow"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function RevenueChart({ data, isLoading }: RevenueChartProps) {
  return (
    <div className="border border-muted/50 rounded-2xl p-6 bg-card space-y-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground text-base">Paise Ka Hisaab (6 Mahine)</h3>
          <p className="text-xs text-muted-foreground">Inflow aur Outflow analytics</p>
        </div>
        {data && (
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Net Savings</span>
            <span className="text-sm font-bold text-emerald-500">
              +{formatINRCompact(data.netCashFlow || 550000)}
            </span>
          </div>
        )}
      </div>

      <Suspense fallback={<div className="h-[280px] w-full bg-muted/20 animate-pulse rounded-lg" />}>
        {isLoading ? (
          <div className="h-[280px] w-full bg-muted/20 animate-pulse rounded-lg" />
        ) : (
          <RevenueChartContent data={data} />
        )}
      </Suspense>
    </div>
  );
}
