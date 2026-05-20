'use client';

import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useCountUp } from '@/hooks/use-count-up';
import { Skeleton } from './dashboard-skeleton';

interface StatCardProps {
  icon: ReactNode;
  iconBg: string;
  label: string;
  rawValue: number;
  valueFormatter: (val: number) => string;
  subtext: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'same';
  };
  sparkline?: number[];
  isLoading?: boolean;
  highlightTrigger?: any; // websocket triggers brief highlight
}

export default function StatCard({
  icon,
  iconBg,
  label,
  rawValue,
  valueFormatter,
  subtext,
  trend,
  sparkline,
  isLoading,
  highlightTrigger,
}: StatCardProps) {
  const animatedValue = useCountUp(rawValue, 1000, !isLoading);
  const [pulse, setPulse] = useState<'green' | 'red' | null>(null);

  // Briefly highlight green/red on WebSocket update
  useEffect(() => {
    if (highlightTrigger) {
      const type = highlightTrigger.type === 'expense.created' ? 'red' : 'green';
      setPulse(type);
      const t = setTimeout(() => setPulse(null), 1000);
      return () => clearTimeout(t);
    }
  }, [highlightTrigger]);

  if (isLoading) {
    return (
      <div className="border border-muted/50 rounded-2xl p-5 space-y-4 bg-card flex flex-col justify-between h-full min-h-[140px]">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-24" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    );
  }

  // Sparkline path generation (fits 100x30 box)
  const generateSparklinePath = (data: number[]) => {
    if (!data || data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;
    const width = 100;
    const height = 28;
    const padding = 2;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      // Invert Y because SVG 0 is top
      const y = height - ((val - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const hasTrend = trend && trend.direction !== 'same';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`border rounded-2xl p-5 bg-card flex flex-col justify-between relative overflow-hidden transition-all duration-500 h-full min-h-[140px] ${
        pulse === 'green'
          ? 'border-emerald-500 bg-emerald-500/5 shadow-md scale-102'
          : pulse === 'red'
          ? 'border-rose-500 bg-rose-500/5 shadow-md scale-102'
          : 'border-muted/50 hover:border-muted hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            {label}
          </span>
          <span className="text-xl md:text-2xl font-bold tracking-tight text-foreground transition-all duration-300 block">
            {valueFormatter(animatedValue)}
          </span>
        </div>
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-4 pt-2 border-t border-muted-foreground/5 w-full">
        <div className="flex flex-col gap-0.5 max-w-[60%]">
          {hasTrend && (
            <span
              className={`flex items-center gap-0.5 text-xs font-bold ${
                trend.direction === 'up'
                  ? 'text-emerald-500'
                  : 'text-rose-500'
              }`}
            >
              {trend.direction === 'up' ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {trend.value}%
            </span>
          )}
          <span className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
            {subtext}
          </span>
        </div>

        {/* Tiny Sparkline Chart */}
        {sparkline && sparkline.length >= 2 && (
          <div className="w-[80px] h-[30px] flex-shrink-0 self-end opacity-80 hover:opacity-100 transition-opacity">
            <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
              <path
                d={generateSparklinePath(sparkline)}
                fill="none"
                stroke={
                  !trend || trend.direction === 'up'
                    ? '#10b981' // emerald-500
                    : trend.direction === 'down'
                    ? '#ef4444' // rose-500
                    : '#64748b' // slate-500
                }
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </motion.div>
  );
}
