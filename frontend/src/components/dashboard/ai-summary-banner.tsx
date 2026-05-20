'use client';

import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, ArrowUpRight, AlertTriangle, BarChart, TrendingUp } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { AISummary } from '@/lib/api/dashboard';
import { Skeleton } from './dashboard-skeleton';
import Link from 'next/link';

interface AISummaryBannerProps {
  data?: AISummary;
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
}

export default function AISummaryBanner({ data, isLoading, isError, onRefresh }: AISummaryBannerProps) {
  const [animatedWords, setAnimatedWords] = useState<string[]>([]);
  const hasAnimated = useRef(false);

  const mood = data?.mood || 'neutral';
  const summaryText = data?.summary || 'Aapke business ki report load ho rahi hai...';

  useEffect(() => {
    if (isLoading || isError || !data?.summary) return;

    const words = data.summary.split(' ');
    
    if (!hasAnimated.current) {
      setAnimatedWords([]);
      let currentWordIndex = 0;
      const interval = setInterval(() => {
        if (currentWordIndex < words.length) {
          setAnimatedWords(prev => [...prev, words[currentWordIndex]]);
          currentWordIndex++;
        } else {
          clearInterval(interval);
          hasAnimated.current = true;
        }
      }, 50); // 50ms interval for typewriter effect

      return () => clearInterval(interval);
    } else {
      setAnimatedWords(words);
    }
  }, [data?.summary, isLoading, isError]);

  // Handle manual refetch
  const handleManualRefresh = () => {
    hasAnimated.current = false;
    onRefresh();
  };

  if (isLoading) {
    return (
      <div className="border border-muted/50 rounded-2xl p-6 bg-card flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3 w-full">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-8/12" />
          </div>
        </div>
        <Skeleton className="h-10 w-24 rounded-lg self-end md:self-center" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-rose-500/20 bg-rose-500/5 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-rose-500">AI Summary load nahi ho saki</h4>
            <p className="text-sm text-muted-foreground">Network ya server error ke karan analysis fetch nahi ho paya.</p>
          </div>
        </div>
        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" /> Dobara try karein
        </button>
      </div>
    );
  }

  // Styles based on mood
  const moodConfig = {
    positive: {
      border: 'border-emerald-500/30 dark:border-emerald-500/20 shadow-emerald-500/5',
      bg: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/5 dark:to-teal-500/2',
      glow: 'shadow-emerald-500/5',
      iconBg: 'bg-emerald-500/10 text-emerald-500',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      accent: 'text-emerald-600 dark:text-emerald-400',
      moodIcon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
    },
    warning: {
      border: 'border-amber-500/30 dark:border-amber-500/20 shadow-amber-500/5',
      bg: 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 dark:from-amber-500/5 dark:to-orange-500/2',
      glow: 'shadow-amber-500/5',
      iconBg: 'bg-amber-500/10 text-amber-500',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      accent: 'text-amber-600 dark:text-amber-400',
      moodIcon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    },
    neutral: {
      border: 'border-slate-500/30 dark:border-slate-500/20 shadow-slate-500/5',
      bg: 'bg-gradient-to-r from-slate-500/10 to-gray-500/5 dark:from-slate-500/5 dark:to-gray-500/2',
      glow: 'shadow-slate-500/5',
      iconBg: 'bg-slate-500/10 text-slate-500',
      badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
      accent: 'text-slate-600 dark:text-slate-400',
      moodIcon: <BarChart className="h-5 w-5 text-slate-500" />,
    },
  };

  const style = moodConfig[mood];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`border rounded-2xl p-5 md:p-6 ${style.bg} ${style.border} shadow-lg ${style.glow} relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-5`}
    >
      {/* Decorative background lights */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/5 blur-2xl pointer-events-none rounded-full" />

      {/* Main message */}
      <div className="flex items-start gap-4 flex-1">
        <div className={`p-3 rounded-2xl ${style.iconBg} flex-shrink-0 animate-bounce-slow mt-1`}>
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
              BizSaathi AI
            </span>
            <span className="flex items-center gap-1">
              {style.moodIcon}
            </span>
          </div>

          <p className="text-base font-medium text-foreground leading-relaxed">
            {animatedWords.map((word, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="inline-block mr-1"
              >
                {word}
              </motion.span>
            ))}
            {/* Blinking cursor while typing */}
            {!hasAnimated.current && (
              <span className="inline-block w-1.5 h-4 bg-muted-foreground animate-pulse ml-0.5" />
            )}
          </p>
        </div>
      </div>

      {/* Actions and refresh */}
      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-muted-foreground/10">
        <Link
          href="/ai"
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-emerald-500 transition-all cursor-pointer group"
        >
          Aur detail chahiye? <ArrowUpRight className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
        <button
          onClick={handleManualRefresh}
          className="p-2 hover:bg-foreground/5 rounded-xl transition-all cursor-pointer text-muted-foreground hover:text-foreground"
          title="AI insights refresh karein"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>
    </motion.div>
  );
}
