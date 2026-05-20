'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, ArrowUpRight, TrendingUp, AlertTriangle, BarChart3, Bot } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AISummary } from '@/lib/api/dashboard';

interface AiSummaryBannerProps {
  data?: AISummary;
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
}

export function AiSummaryBanner({ data, isLoading, isError, onRefresh }: AiSummaryBannerProps) {
  const [animatedWords, setAnimatedWords] = useState<string[]>([]);
  const hasAnimatedRef = useRef(false);

  // Parse words only when data is loaded
  useEffect(() => {
    if (data?.summary) {
      const words = data.summary.split(' ');
      setAnimatedWords(words);
    }
  }, [data?.summary]);

  // Mood configuration
  const mood = data?.mood || 'neutral';
  
  const moodConfig = {
    positive: {
      border: 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      gradient: 'from-emerald-950/20 via-background to-emerald-950/10',
      glow: 'bg-emerald-500/20',
      icon: <TrendingUp className="h-5 w-5 text-emerald-500 animate-pulse" />,
      text: 'text-emerald-400',
    },
    neutral: {
      border: 'border-slate-500/20 shadow-[0_0_15px_rgba(148,163,184,0.05)]',
      gradient: 'from-slate-950/20 via-background to-slate-950/10',
      glow: 'bg-slate-500/20',
      icon: <BarChart3 className="h-5 w-5 text-slate-400" />,
      text: 'text-slate-400',
    },
    warning: {
      border: 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
      gradient: 'from-amber-950/20 via-background to-amber-950/10',
      glow: 'bg-amber-500/20',
      icon: <AlertTriangle className="h-5 w-5 text-amber-500 animate-bounce" />,
      text: 'text-amber-400',
    },
  }[mood];

  const handleRefreshClick = () => {
    // Disable animation on subsequent refetches
    hasAnimatedRef.current = true;
    onRefresh();
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  if (isLoading) {
    return (
      <div className="w-full h-28 bg-card border rounded-xl flex items-center justify-between p-6 relative overflow-hidden animate-pulse">
        <div className="flex items-center space-x-4 w-full">
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
          </div>
        </div>
        <div className="h-8 w-8 bg-muted rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium">AI summary load nahi ho saki. Kripya refresh karein.</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} className="text-destructive hover:bg-destructive/20">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full relative overflow-hidden rounded-xl border bg-gradient-to-r ${moodConfig.gradient} ${moodConfig.border} p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-500`}
    >
      {/* Background glowing orb */}
      <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-30 ${moodConfig.glow}`} />

      <div className="flex items-start space-x-4 flex-1">
        {/* Badge & Icon Area */}
        <div className="flex flex-col items-center space-y-2">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-inner flex items-center justify-center">
            <Bot className="h-6 w-6 animate-pulse text-indigo-400" />
          </div>
          <Badge variant="outline" className="bg-primary/5 text-[10px] uppercase font-bold tracking-wider text-indigo-300 border-indigo-500/30">
            AI Saathi
          </Badge>
        </div>

        {/* Center: Streamed Text */}
        <div className="flex-1 space-y-1">
          <div className="text-xs text-muted-foreground flex items-center space-x-1.5">
            <Sparkles className="h-3 w-3 text-yellow-400" />
            <span className="font-semibold tracking-wide uppercase">Dainik Vyapaar Vishleshan</span>
          </div>

          <div className="text-sm md:text-base text-foreground leading-relaxed font-medium">
            {/* If first animation and not refetched, render word-by-word */}
            {!hasAnimatedRef.current ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                onAnimationComplete={() => {
                  hasAnimatedRef.current = true;
                }}
                className="flex flex-wrap gap-x-1"
              >
                {animatedWords.map((word, idx) => (
                  <motion.span key={idx} variants={wordVariants} className="inline-block">
                    {word}
                  </motion.span>
                ))}
              </motion.div>
            ) : (
              <span>{data?.summary}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right Actions & Mood */}
      <div className="flex items-center space-x-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-muted">
        <div className="flex items-center space-x-2 bg-muted/30 px-3 py-1.5 rounded-lg border">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Mood:</span>
          <div className="flex items-center space-x-1">
            {moodConfig.icon}
            <span className={`text-xs font-bold capitalize ${moodConfig.text}`}>
              {mood}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleRefreshClick}
          className="h-9 w-9 rounded-lg hover:rotate-180 transition-all duration-500"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Link href="/ai" passHref>
          <Button variant="ghost" size="sm" className="h-9 font-medium text-xs text-indigo-400 hover:text-indigo-300">
            Aur detail? <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
