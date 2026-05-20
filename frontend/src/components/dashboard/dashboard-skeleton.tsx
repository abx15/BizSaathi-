'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 w-full animate-pulse">
      {/* Dynamic Greeting & Subtitle Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <Skeleton className="h-8 w-64 rounded-lg bg-muted/60" />
          <Skeleton className="h-4 w-48 mt-2 rounded bg-muted/60" />
        </div>
        <Skeleton className="h-5 w-40 rounded bg-muted/60" />
      </div>

      {/* AI Summary Banner Skeleton */}
      <Skeleton className="h-28 w-full rounded-xl bg-muted/60" />

      {/* Overdue Alert Banner Skeleton */}
      <Skeleton className="h-12 w-full rounded-lg bg-muted/40" />

      {/* Stat Cards Grid (4 in a row on desktop, 2x2 on mobile) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 bg-card border rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24 rounded bg-muted/60" />
              <Skeleton className="h-8 w-8 rounded-lg bg-muted/60" />
            </div>
            <Skeleton className="h-7 w-20 rounded bg-muted/60" />
            <Skeleton className="h-4 w-32 rounded bg-muted/60" />
            {/* Sparkline/Progress skeleton */}
            <Skeleton className="h-2 w-full rounded bg-muted/40 mt-2" />
          </div>
        ))}
      </div>

      {/* Charts Section (Stacked on mobile, side-by-side on desktop 60/40) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Revenue Grouped Bar Chart (60% width) */}
        <div className="lg:col-span-6 p-6 bg-card border rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-48 rounded bg-muted/60" />
            <Skeleton className="h-4 w-28 rounded bg-muted/40" />
          </div>
          <Skeleton className="h-[300px] w-full rounded bg-muted/40" />
        </div>

        {/* Expense Donut Chart (40% width) */}
        <div className="lg:col-span-4 p-6 bg-card border rounded-xl space-y-4">
          <Skeleton className="h-5 w-40 rounded bg-muted/60" />
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            <Skeleton className="h-40 w-40 rounded-full bg-muted/40" />
            <div className="space-y-2 w-full max-w-[150px]">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-3 w-3 rounded-full bg-muted/60" />
                  <Skeleton className="h-3 w-20 rounded bg-muted/60" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded bg-muted/60" />
        <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-36 h-28 bg-card border rounded-xl flex flex-col items-center justify-center p-4 space-y-3"
            >
              <Skeleton className="h-8 w-8 rounded-full bg-muted/60" />
              <Skeleton className="h-3 w-20 rounded bg-muted/60" />
            </div>
          ))}
        </div>
      </div>

      {/* Tables Section (Stacked on mobile and desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Recent Invoices Table (60% width) */}
        <div className="lg:col-span-6 p-6 bg-card border rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-36 rounded bg-muted/60" />
            <Skeleton className="h-4 w-28 rounded bg-muted/40" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24 rounded bg-muted/60" />
                  <Skeleton className="h-3 w-16 rounded bg-muted/40" />
                </div>
                <Skeleton className="h-4 w-20 rounded bg-muted/60" />
                <Skeleton className="h-6 w-16 rounded bg-muted/40" />
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers (40% width) */}
        <div className="lg:col-span-4 p-6 bg-card border rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-40 rounded bg-muted/60" />
            <Skeleton className="h-4 w-28 rounded bg-muted/40" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 py-1">
                <Skeleton className="h-6 w-6 rounded-full bg-muted/60" />
                <Skeleton className="h-8 w-8 rounded-full bg-muted/60" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-28 rounded bg-muted/60" />
                  <Skeleton className="h-3 w-20 rounded bg-muted/40" />
                </div>
                <Skeleton className="h-4 w-16 rounded bg-muted/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
