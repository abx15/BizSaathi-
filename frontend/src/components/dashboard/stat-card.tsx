'use client';

import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatINR } from '@/lib/format';
import { useCountUp } from '@/hooks/use-count-up';

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string; // tailwind bg color class, e.g., 'bg-emerald-500/10 text-emerald-500'
  label: string;
  numericValue: number;
  isCurrency?: boolean;
  subtext: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'same';
  };
  sparkline?: number[]; // 7 daily points, e.g., [10, 15, 8, 12, 22, 18, 25]
  progress?: {
    value: number;
    max: number;
  };
  isLoading?: boolean;
  highlightTrigger?: any; // any value that changes to trigger a highlight animation
}

export function StatCard({
  icon,
  iconBg,
  label,
  numericValue,
  isCurrency = false,
  subtext,
  trend,
  sparkline,
  progress,
  isLoading = false,
  highlightTrigger,
}: StatCardProps) {
  const animatedValue = useCountUp(numericValue, 1200);
  const controls = useAnimation();
  const [prevTrigger, setPrevTrigger] = useState(highlightTrigger);

  // Parse display format
  const displayValue = isCurrency
    ? formatINR(animatedValue)
    : animatedValue.toLocaleString('en-IN');

  // Trigger web socket flash animation on change
  useEffect(() => {
    if (highlightTrigger !== undefined && highlightTrigger !== prevTrigger) {
      setPrevTrigger(highlightTrigger);
      
      const flashColor = trend?.direction === 'down' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)';
      
      controls.start({
        boxShadow: `0 0 20px ${flashColor}`,
        borderColor: trend?.direction === 'down' ? '#ef4444' : '#22c55e',
        scale: [1, 1.03, 1],
        transition: { duration: 0.6, ease: 'easeInOut' },
      });
    }
  }, [highlightTrigger, prevTrigger, controls, trend?.direction]);

  if (isLoading) {
    return (
      <div className="p-5 bg-card border rounded-xl space-y-3 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="h-9 w-9 rounded-lg bg-muted" />
        </div>
        <div className="h-8 w-24 bg-muted rounded" />
        <div className="h-4 w-40 bg-muted rounded" />
      </div>
    );
  }

  // Calculate simple SVG sparkline path
  let sparklinePath = '';
  if (sparkline && sparkline.length > 1) {
    const width = 80;
    const height = 24;
    const padding = 2;
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = max - min || 1;
    
    sparklinePath = sparkline
      .map((val, idx) => {
        const x = (idx / (sparkline.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((val - min) / range) * (height - padding * 2) - padding;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <motion.div
      animate={controls}
      className="p-5 bg-card border rounded-xl relative overflow-hidden transition-shadow duration-300 hover:shadow-lg flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Card Header Info */}
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <div className={`p-2.5 rounded-lg border border-border/40 ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
        </div>

        {/* Card Value Display */}
        <div className="space-y-1">
          <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {displayValue}
          </h3>
          
          {/* Trend Tag */}
          <div className="flex items-center space-x-2">
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${
                  trend.direction === 'up'
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : trend.direction === 'down'
                    ? 'text-rose-500 bg-rose-500/10'
                    : 'text-slate-500 bg-slate-500/10'
                }`}
              >
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : trend.direction === 'down' ? (
                  <TrendingDown className="h-3 w-3 mr-1" />
                ) : (
                  <Minus className="h-3 w-3 mr-1" />
                )}
                {trend.direction !== 'same' ? `${trend.value}%` : 'Samaan'}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {subtext}
            </span>
          </div>
        </div>
      </div>

      {/* Conditional Mini Progress Bar or Sparkline Footer */}
      <div className="mt-4 pt-3 border-t border-muted/50">
        {progress ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
              <span>Paid: {progress.value}</span>
              <span>Total: {progress.max}</span>
            </div>
            <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(progress.value / (progress.max || 1)) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-indigo-500 rounded-full"
              />
            </div>
          </div>
        ) : sparkline && sparkline.length > 1 ? (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              7-Day Trend
            </span>
            <svg className="w-20 h-6 overflow-visible" viewBox="0 0 80 24">
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                d={sparklinePath}
                fill="none"
                stroke={trend?.direction === 'down' ? '#ef4444' : '#22c55e'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          <div className="h-6 flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping mr-2" />
            <span className="text-[10px] font-bold tracking-wide uppercase text-muted-foreground">
              Aankde Surakshit Hain
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
