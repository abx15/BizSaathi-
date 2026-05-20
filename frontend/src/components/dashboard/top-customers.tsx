'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatINR } from '@/lib/format';
import { TopCustomer } from '@/lib/api/dashboard';

interface TopCustomersProps {
  data?: TopCustomer[];
  isLoading: boolean;
}

export function TopCustomers({ data = [], isLoading }: TopCustomersProps) {
  // Simple color picker based on character hash for persistent avatar backgrounds
  const getAvatarColor = (name: string): string => {
    const list = [
      'bg-red-500/20 text-red-400 border-red-500/30',
      'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'bg-pink-500/20 text-pink-400 border-pink-500/30',
    ];
    if (!name) return list[0];
    const code = name.charCodeAt(0) + (name.charCodeAt(name.length - 1) || 0);
    return list[code % list.length];
  };

  const getInitials = (name: string): string => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-card border rounded-xl space-y-4">
        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 py-1">
              <div className="h-6 w-6 rounded bg-muted animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Slice at top 5 just to be sure
  const topList = data.slice(0, 5);

  return (
    <div className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col justify-between">
      <div>
        <div className="p-6 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Top Customers</h3>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
              Is mahine ki sabsay zyada amdani
            </p>
          </div>
          <Link
            href="/customers"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>Sabhi Customers</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {topList.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground font-medium">
            Bhugtan ke aadhar par leaderboard banega.
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-4">
            {topList.map((cust, index) => {
              const rank = index + 1;
              const rankBadge = {
                1: 'bg-amber-500 text-amber-950 font-bold border-amber-400/40',
                2: 'bg-slate-300 text-slate-900 font-bold border-slate-200/40',
                3: 'bg-orange-600 text-orange-50 font-bold border-orange-500/40',
              }[rank] || 'bg-muted text-muted-foreground font-semibold';

              return (
                <div
                  key={cust.customerId}
                  className="flex items-center justify-between p-2 rounded-lg border border-border/10 bg-muted/5 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Rank Indicator */}
                    <div
                      className={`h-6 w-6 rounded-md flex items-center justify-center text-xs border uppercase tracking-wider ${rankBadge}`}
                    >
                      {rank === 1 ? <Trophy className="h-3 w-3" /> : `#${rank}`}
                    </div>

                    {/* Customer Avatar */}
                    <Avatar className={`h-8 w-8 border ${getAvatarColor(cust.name)}`}>
                      <AvatarFallback className="bg-transparent font-extrabold text-xs">
                        {getInitials(cust.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Customer Name and Invoice count */}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                        {cust.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        {cust.invoiceCount} invoices bani
                      </p>
                    </div>
                  </div>

                  {/* Revenue value */}
                  <div className="text-right ml-2 flex-shrink-0">
                    <span className="text-xs font-black text-foreground">
                      {formatINR(cust.totalRevenue)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
