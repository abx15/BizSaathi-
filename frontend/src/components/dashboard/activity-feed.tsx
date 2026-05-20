'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Radio, Clock, MessageSquare, Award } from 'lucide-react';
import { useWsStore } from '@/store/ws.store';
import { timeAgo } from '@/lib/format';

export function ActivityFeed() {
  const events = useWsStore((state) => state.events);
  const connected = useWsStore((state) => state.connected);

  // Take the last 10 events (FIFO - since state adds new ones at the beginning of the array, the first 10 items are the latest!)
  const latestEvents = events.slice(0, 10);

  // Helper to resolve emoji and text theme based on WS event types
  const getEventMeta = (type: string) => {
    const config: Record<string, { emoji: string; color: string; border: string }> = {
      'invoice.paid': {
        emoji: '💰',
        color: 'bg-emerald-500/10 text-emerald-400',
        border: 'border-emerald-500/20',
      },
      'invoice.created': {
        emoji: '📄',
        color: 'bg-blue-500/10 text-blue-400',
        border: 'border-blue-500/20',
      },
      'invoice.overdue': {
        emoji: '⚠️',
        color: 'bg-rose-500/10 text-rose-400',
        border: 'border-rose-500/20',
      },
      'lead.won': {
        emoji: '🎉',
        color: 'bg-purple-500/10 text-purple-400',
        border: 'border-purple-500/20',
      },
      'lead.created': {
        emoji: '💼',
        color: 'bg-amber-500/10 text-amber-400',
        border: 'border-amber-500/20',
      },
      'expense.created': {
        emoji: '💸',
        color: 'bg-rose-500/10 text-rose-400',
        border: 'border-rose-500/20',
      },
    };

    return (
      config[type] || {
        emoji: '🔔',
        color: 'bg-indigo-500/10 text-indigo-400',
        border: 'border-indigo-500/20',
      }
    );
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col justify-between">
      <div>
        {/* Card Header with Pulsing connection state */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-border/40">
          <div>
            <h3 className="text-base font-bold text-foreground">Live Activity</h3>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
              WebSocket dwara taaza ghatnayein
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              {connected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground flex items-center">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Event List */}
        <div className="p-4 max-h-[380px] overflow-y-auto pr-1">
          {latestEvents.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <Bot className="h-10 w-10 text-muted-foreground/30 animate-bounce" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Koi Halchal Nahi Hai
                </p>
                <div className="flex justify-center items-center space-x-1">
                  <span className="text-[10px] text-muted-foreground">Waiting for events</span>
                  <span className="flex space-x-0.5">
                    <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce delay-100" />
                    <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce delay-200" />
                    <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce delay-300" />
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 relative">
              {/* Timeline Connector Line */}
              <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-border/40" />

              <AnimatePresence initial={false}>
                {latestEvents.map((evt) => {
                  const meta = getEventMeta(evt.type);
                  return (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, y: -15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                      className="flex items-start space-x-3 relative z-10 p-1.5 rounded-lg border border-transparent hover:border-border/30 hover:bg-muted/5 transition-all"
                    >
                      {/* Event Symbol Circle */}
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center border text-base shadow-inner flex-shrink-0 ${meta.color} ${meta.border}`}
                      >
                        {meta.emoji}
                      </div>

                      {/* Event Message Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs font-bold text-foreground leading-normal tracking-wide">
                          {evt.message}
                        </p>
                        <div className="flex items-center space-x-2 text-[10px] text-muted-foreground font-semibold">
                          <Clock className="h-3 w-3" />
                          <span>{timeAgo(evt.timestamp)}</span>
                          {evt.title && (
                            <>
                              <span>·</span>
                              <span className="text-indigo-400 capitalize">{evt.title}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="p-3 bg-muted/10 border-t border-border/40 text-center">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center justify-center">
          <Radio className="h-3 w-3 mr-1 animate-pulse" /> BizSaathi Webhook Streaming Enabled
        </span>
      </div>
    </div>
  );
}
