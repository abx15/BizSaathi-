'use client';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/60 dark:bg-muted/30 ${className}`}
      {...props}
    />
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-1 md:p-6 max-w-7xl mx-auto">
      {/* Dynamic Greeting Loader */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 md:w-80" />
          <Skeleton className="h-4 w-48 md:w-56" />
        </div>
        <Skeleton className="h-5 w-40 self-start md:self-center" />
      </div>

      {/* AI Summary Banner Skeleton */}
      <Skeleton className="h-28 w-full rounded-xl border border-muted" />

      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-muted/50 rounded-xl p-4 md:p-6 space-y-4 bg-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-7 w-24 md:w-32" />
              <Skeleton className="h-3 w-36 md:w-40" />
            </div>
          </div>
        ))}
      </div>

      {/* Two Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue Chart (Bar) - 60% */}
        <div className="lg:col-span-3 border border-muted/50 rounded-xl p-6 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>

        {/* Expenses Chart (Donut) - 40% */}
        <div className="lg:col-span-2 border border-muted/50 rounded-xl p-6 bg-card space-y-4">
          <Skeleton className="h-5 w-44" />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
            <Skeleton className="h-44 w-44 rounded-full" />
            <div className="space-y-3 w-full sm:w-auto flex-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between sm:justify-start gap-4">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12 ml-auto sm:ml-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="min-w-[130px] sm:min-w-[150px] border border-muted/50 rounded-xl p-4 bg-card flex flex-col items-center justify-center space-y-3 text-center">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-3 w-20 sm:w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Invoices, Customers, Activity Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Invoices - 2 cols on desktop */}
        <div className="xl:col-span-2 border border-muted/50 rounded-xl p-6 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-muted/20">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-12 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers & Live Activity */}
        <div className="space-y-6">
          {/* Top Customers */}
          <div className="border border-muted/50 rounded-xl p-6 bg-card space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export { Skeleton };
