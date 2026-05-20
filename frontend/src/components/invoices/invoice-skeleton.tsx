'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function InvoiceListSkeleton() {
  return (
    <div className="space-y-6 w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-44 rounded-lg bg-muted/60" />
          <Skeleton className="h-4 w-60 mt-1 rounded bg-muted/60" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg bg-muted/60" />
      </div>

      {/* Summary Row (4 stats) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 border rounded-xl bg-card space-y-2">
            <Skeleton className="h-3 w-16 bg-muted/50 rounded" />
            <Skeleton className="h-6 w-24 bg-muted/60 rounded" />
            <Skeleton className="h-3 w-32 bg-muted/40 rounded" />
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-center justify-between p-4 border rounded-xl bg-card">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <Skeleton className="h-9 w-48 bg-muted/60 rounded-lg" />
          <Skeleton className="h-9 w-32 bg-muted/40 rounded-lg" />
          <Skeleton className="h-9 w-40 bg-muted/40 rounded-lg" />
          <Skeleton className="h-9 w-36 bg-muted/40 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-24 bg-muted/50 rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="p-4 bg-muted/20 border-b border-border/40 flex justify-between">
          <Skeleton className="h-4 w-12 bg-muted/50 rounded" />
          <Skeleton className="h-4 w-32 bg-muted/50 rounded" />
          <Skeleton className="h-4 w-20 bg-muted/50 rounded" />
          <Skeleton className="h-4 w-16 bg-muted/50 rounded" />
          <Skeleton className="h-4 w-16 bg-muted/50 rounded" />
        </div>
        <div className="divide-y">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex justify-between items-center">
              <Skeleton className="h-4 w-16 bg-muted/40 rounded" />
              <Skeleton className="h-4 w-36 bg-muted/50 rounded" />
              <Skeleton className="h-4 w-20 bg-muted/50 rounded" />
              <Skeleton className="h-5 w-16 bg-muted/40 rounded-full" />
              <Skeleton className="h-4 w-16 bg-muted/40 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InvoiceFormSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 w-full animate-pulse">
      {/* Left Form Panel */}
      <div className="lg:col-span-6 space-y-6">
        {/* Customer Select Block */}
        <div className="p-6 border rounded-xl bg-card space-y-4">
          <Skeleton className="h-5 w-32 bg-muted/60 rounded" />
          <Skeleton className="h-10 w-full bg-muted/40 rounded-lg" />
        </div>

        {/* Details Block */}
        <div className="p-6 border rounded-xl bg-card space-y-4">
          <Skeleton className="h-5 w-36 bg-muted/60 rounded" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full bg-muted/40 rounded-lg" />
            <Skeleton className="h-10 w-full bg-muted/40 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-6 w-24 bg-muted/40 rounded" />
            <Skeleton className="h-10 w-full bg-muted/40 rounded-lg" />
          </div>
        </div>

        {/* Line Items Block */}
        <div className="p-6 border rounded-xl bg-card space-y-4">
          <Skeleton className="h-5 w-24 bg-muted/60 rounded" />
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 flex-1 bg-muted/40 rounded-lg" />
                <Skeleton className="h-10 w-16 bg-muted/40 rounded-lg" />
                <Skeleton className="h-10 w-24 bg-muted/40 rounded-lg" />
                <Skeleton className="h-10 w-24 bg-muted/40 rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-32 bg-muted/50 rounded-lg" />
        </div>
      </div>

      {/* Right sticky summaries */}
      <div className="lg:col-span-4 space-y-6">
        <div className="p-6 border rounded-xl bg-card space-y-4">
          <Skeleton className="h-5 w-40 bg-muted/60 rounded" />
          <div className="space-y-2 pt-2 border-t">
            <Skeleton className="h-4 w-full bg-muted/40 rounded" />
            <Skeleton className="h-4 w-full bg-muted/40 rounded" />
            <Skeleton className="h-5 w-3/4 bg-muted/60 rounded" />
          </div>
          <div className="space-y-2 pt-4">
            <Skeleton className="h-10 w-full bg-muted/60 rounded-lg" />
            <Skeleton className="h-10 w-full bg-muted/40 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoiceDetailSkeleton() {
  return (
    <div className="space-y-6 w-full animate-pulse">
      {/* Back button + title skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-24 bg-muted/60 rounded-lg" />
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-28 bg-muted/50 rounded-lg" />
          <Skeleton className="h-9 w-28 bg-muted/50 rounded-lg" />
        </div>
      </div>

      {/* Paper summary card layout */}
      <div className="p-8 border rounded-xl bg-card space-y-8 min-h-[500px]">
        {/* Top brand header */}
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 bg-muted/60 rounded" />
            <Skeleton className="h-3 w-32 bg-muted/40 rounded" />
          </div>
          <Skeleton className="h-8 w-28 bg-muted/60 rounded" />
        </div>

        {/* Meta billing details */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-16 bg-muted/50 rounded" />
            <Skeleton className="h-4 w-48 bg-muted/60 rounded" />
            <Skeleton className="h-3 w-36 bg-muted/40 rounded" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24 bg-muted/50 rounded" />
            <Skeleton className="h-4 w-32 bg-muted/60 rounded" />
            <Skeleton className="h-3 w-32 bg-muted/40 rounded" />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3 pt-4">
          <Skeleton className="h-4 w-full bg-muted/50 rounded" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-muted/30 rounded-lg" />
          ))}
        </div>

        {/* Aggregations totals */}
        <div className="flex justify-end pt-4">
          <div className="w-64 space-y-2">
            <Skeleton className="h-4 w-full bg-muted/40 rounded" />
            <Skeleton className="h-4 w-full bg-muted/40 rounded" />
            <Skeleton className="h-6 w-full bg-muted/60 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
