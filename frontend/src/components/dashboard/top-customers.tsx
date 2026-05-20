"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Users, ArrowUpRight } from "lucide-react";
import { TopCustomer } from "@/lib/api/dashboard";
import { formatINR } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TopCustomersProps {
  customers: TopCustomer[];
}

export function TopCustomers({ customers }: TopCustomersProps) {
  // Helper to generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Helper to generate a consistent premium gradient based on customer name hash
  const getAvatarGradient = (name: string) => {
    const colors = [
      "from-violet-500 to-indigo-500",
      "from-sky-500 to-blue-500",
      "from-emerald-500 to-teal-500",
      "from-rose-500 to-pink-500",
      "from-amber-500 to-orange-500",
      "from-fuchsia-500 to-purple-500",
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Rank configurations
  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-[10px] font-black text-white shadow-md ring-2 ring-yellow-300 dark:ring-yellow-500/30 animate-pulse">
            <Trophy className="h-3 w-3" />
          </div>
        );
      case 1:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-slate-300 to-slate-400 text-[10px] font-black text-slate-800 shadow-md ring-2 ring-slate-200 dark:ring-slate-500/30">
            2
          </div>
        );
      case 2:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-amber-600 to-amber-700 text-[10px] font-black text-white shadow-md ring-2 ring-amber-500 dark:ring-amber-500/30">
            3
          </div>
        );
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border text-[10px] font-bold text-muted-foreground">
            {index + 1}
          </div>
        );
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -15 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 via-transparent to-transparent opacity-10 pointer-events-none" />
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Top Customers
            </CardTitle>
            <CardDescription className="text-muted-foreground/90 mt-0.5">
              Sabse zyaada sales dene wale client partners
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs font-medium text-primary hover:text-primary-hover hover:bg-primary/10 transition-colors"
          >
            <Link href="/customers" className="flex items-center gap-1">
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pb-4">
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 stroke-[1.5]" />
              <h3 className="mt-4 text-sm font-semibold text-foreground">Koyi customers nahi mile</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                Invoices create hone ke baad aapke top customer yahan dikhenge.
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-3.5"
            >
              {customers.map((cust, idx) => (
                <motion.div
                  key={cust.customerId}
                  variants={itemVariants}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-foreground/[0.02] dark:hover:bg-white/[0.01] transition-all duration-200 group/item border border-transparent hover:border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border border-border/50 ring-2 ring-background shadow-md">
                        <AvatarFallback
                          className={`bg-gradient-to-br ${getAvatarGradient(
                            cust.name
                          )} text-white font-bold text-sm tracking-wide`}
                        >
                          {getInitials(cust.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1.5 -left-1.5 z-10">
                        {getRankBadge(idx)}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm group-hover/item:text-primary transition-colors duration-200">
                        {cust.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        {cust.invoiceCount} invoices create kiye
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-foreground tracking-tight">
                      {formatINR(cust.totalRevenue)}
                    </span>
                    <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-widest mt-0.5">
                      Paid In Full
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
