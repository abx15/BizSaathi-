"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  Send,
  Bell,
  FileDown,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { RecentInvoice } from "@/lib/api/dashboard";
import { formatINR, formatDate, getStatusColor } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface RecentInvoicesProps {
  invoices: RecentInvoice[];
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
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
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "PAID":
        return <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-500 animate-pulse" />;
      case "OVERDUE":
        return <AlertTriangle className="mr-1 h-3.5 w-3.5 text-rose-500 animate-bounce" />;
      case "SENT":
      case "PARTIAL":
        return <Clock className="mr-1 h-3.5 w-3.5 text-amber-500 animate-spin-slow" />;
      default:
        return <FileText className="mr-1 h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-20 pointer-events-none" />
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Recent Invoices
          </CardTitle>
          <CardDescription className="text-muted-foreground/90 mt-0.5">
            Aapke business ke haal hi ke invoices aur unka status
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-xs font-medium text-primary hover:text-primary-hover hover:bg-primary/10 transition-colors"
        >
          <Link href="/invoices" className="flex items-center gap-1">
            View All <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 stroke-[1.5]" />
            <h3 className="mt-4 text-sm font-semibold text-foreground">Koyi invoices nahi mile</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              Naya invoice banakar payment collect karna shuru karein.
            </p>
            <Button size="sm" asChild className="mt-4 text-xs font-semibold">
              <Link href="/invoices/new">Invoice Banaein</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Layout (Table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground font-medium text-xs text-left">
                    <th className="pb-3 font-semibold">Invoice No</th>
                    <th className="pb-3 font-semibold">Customer</th>
                    <th className="pb-3 font-semibold">Date / Due</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                    <th className="pb-3 font-semibold pl-4">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="divide-y divide-border/30"
                >
                  {invoices.map((inv) => (
                    <motion.tr
                      key={inv.id}
                      variants={itemVariants}
                      className="group/row hover:bg-foreground/[0.02] transition-colors"
                    >
                      <td className="py-3.5 font-mono text-xs font-bold text-foreground group-hover/row:text-primary transition-colors">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5">
                        <div className="font-semibold text-foreground">{inv.customerName}</div>
                      </td>
                      <td className="py-3.5">
                        <div className="text-xs font-medium text-foreground">
                          {formatDate(inv.invoiceDate)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Due: {formatDate(inv.dueDate)}
                        </div>
                      </td>
                      <td className="py-3.5 text-right font-bold text-foreground">
                        {formatINR(inv.totalAmount)}
                      </td>
                      <td className="py-3.5 pl-4">
                        <Badge
                          variant="outline"
                          className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border shadow-sm flex items-center w-fit ${getStatusColor(
                            inv.status
                          )}`}
                        >
                          {getStatusIcon(inv.status)}
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild title="View Invoice">
                            <Link href={`/invoices/${inv.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-emerald-500" title="Send WhatsApp">
                            <Send className="h-4 w-4" />
                          </Button>
                          {inv.status !== "PAID" && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-rose-500 animate-pulse" title="Send Reminder">
                              <Bell className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="group-hover/row:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem asChild>
                                <Link href={`/invoices/${inv.id}`} className="flex items-center gap-2">
                                  <Eye className="h-4 w-4 text-muted-foreground" /> View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <Send className="h-4 w-4" /> Send WhatsApp
                              </DropdownMenuItem>
                              {inv.status !== "PAID" && (
                                <DropdownMenuItem className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                  <Bell className="h-4 w-4" /> Remind Customer
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="flex items-center gap-2">
                                <FileDown className="h-4 w-4 text-muted-foreground" /> Download PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>

            {/* Mobile Layout (Stacked List Cards) */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="md:hidden space-y-3"
            >
              {invoices.map((inv) => (
                <motion.div
                  key={inv.id}
                  variants={itemVariants}
                  className="p-3.5 rounded-lg border border-border/40 bg-card hover:bg-accent/10 transition-colors shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {inv.invoiceNumber}
                    </span>
                    <Badge
                      variant="outline"
                      className={`font-semibold text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(
                        inv.status
                      )}`}
                    >
                      {inv.status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex justify-between items-baseline">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{inv.customerName}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Due: {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground text-sm">
                        {formatINR(inv.totalAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2 pt-2.5 border-t border-border/30">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" asChild>
                      <Link href={`/invoices/${inv.id}`}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                          Options <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <Send className="h-4 w-4" /> Send WhatsApp
                        </DropdownMenuItem>
                        {inv.status !== "PAID" && (
                          <DropdownMenuItem className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                            <Bell className="h-4 w-4" /> WhatsApp Reminder
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="flex items-center gap-2">
                          <FileDown className="h-4 w-4 text-muted-foreground" /> PDF Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
