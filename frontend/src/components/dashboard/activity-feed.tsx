"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Trash2,
  CheckCheck,
  FilePlus,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Activity,
} from "lucide-react";
import { useWsStore, WsEvent } from "@/store/ws.store";
import { timeAgo } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ActivityFeed() {
  const { events, connected, clearEvents, markAllAsRead } = useWsStore();

  // Pick suitable color-coded icons per WS event type
  const getEventStyle = (type: string) => {
    const defaultStyle = {
      icon: <Bell className="h-4 w-4 text-primary" />,
      bg: "bg-primary/10 border-primary/20",
    };

    const map: Record<string, typeof defaultStyle> = {
      "invoice.created": {
        icon: <FilePlus className="h-4 w-4 text-blue-500" />,
        bg: "bg-blue-500/10 border-blue-500/20",
      },
      "invoice.paid": {
        icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
        bg: "bg-emerald-500/10 border-emerald-500/20",
      },
      "payment.received": {
        icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
        bg: "bg-emerald-500/10 border-emerald-500/20",
      },
      "invoice.overdue": {
        icon: <AlertCircle className="h-4 w-4 text-rose-500" />,
        bg: "bg-rose-500/10 border-rose-500/20",
      },
    };

    // Normalize keys
    const match = Object.keys(map).find((key) => type.toLowerCase().includes(key));
    return match ? map[match] : defaultStyle;
  };

  // Limit display to last 8 events for visual aesthetics and performance
  const visibleEvents = events.slice(0, 8);

  return (
    <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent opacity-10 pointer-events-none" />
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Live Activity
              </CardTitle>
              {/* Pulsing Green Live Connection Dot */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-background/50 border border-border/40 select-none">
                <span className={`relative flex h-2 w-2`}>
                  {connected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      connected ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  ></span>
                </span>
                <span className={connected ? "text-emerald-500" : "text-rose-500"}>
                  {connected ? "Live" : "Offline"}
                </span>
              </div>
            </div>
            <CardDescription className="text-muted-foreground/90 mt-0.5">
              WebSocket events aur notifications ki live feeds
            </CardDescription>
          </div>
          {events.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={markAllAsRead}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Mark all read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearEvents}
                className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                title="Clear feed"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="pb-4">
          {visibleEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className={`h-12 w-12 text-muted-foreground/30 stroke-[1.5] ${connected ? "animate-pulse" : ""}`} />
              <h3 className="mt-4 text-sm font-semibold text-foreground">Koyi events nahi hain</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                {connected
                  ? "Bilkul shaant! Naye updates aate hi yahan live flash honge."
                  : "WebSocket server se connect kijiye live activity dekhne ke liye."}
              </p>
            </div>
          ) : (
            <div className="relative pl-3 border-l border-border/30 space-y-4">
              <AnimatePresence initial={false}>
                {visibleEvents.map((evt) => {
                  const style = getEventStyle(evt.type);
                  return (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, y: -15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className={`relative flex gap-3 items-start group rounded-lg p-2 hover:bg-foreground/[0.015] border border-transparent hover:border-border/20 transition-all ${
                        !evt.read ? "bg-primary/[0.01] font-medium" : ""
                      }`}
                    >
                      {/* Timeline dot connector */}
                      <span className="absolute -left-[17px] top-4.5 flex h-2 w-2 rounded-full border border-background bg-border/80 group-hover:bg-primary transition-colors" />

                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm ${style.bg}`}
                      >
                        {style.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-foreground text-xs truncate">
                            {evt.title || "Notification"}
                          </h4>
                          <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">
                            {timeAgo(evt.timestamp)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 break-words">
                          {evt.message}
                        </p>
                      </div>

                      {!evt.read && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse" />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
