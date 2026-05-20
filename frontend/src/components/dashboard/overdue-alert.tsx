'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Send, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/format';
import { sendBulkReminders } from '@/lib/api/invoices';

interface OverdueAlertProps {
  overdueCount: number;
  overdueAmount: number;
}

export function OverdueAlert({ overdueCount, overdueAmount }: OverdueAlertProps) {
  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('overdue-alert-dismissed');
    if (overdueCount > 0 && !isDismissed) {
      // Delay presentation slightly for visual interest
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [overdueCount]);

  const handleDismiss = () => {
    sessionStorage.setItem('overdue-alert-dismissed', 'true');
    setVisible(false);
  };

  const handleSendReminders = async () => {
    setSending(true);
    try {
      // Call POST to bulk reminders
      const response = await sendBulkReminders({ daysOverdue: 1 });
      
      if (response.success) {
        toast.success('Reminders Bheja Gaya!', {
          description: `${overdueCount} customers ko invoice link ke sath automated WhatsApp reminders bhej diye gaye hain.`,
          icon: '📱',
        });
        handleDismiss(); // Hide once successfully triggered
      } else {
        throw new Error('API failed');
      }
    } catch (err: any) {
      toast.error('Reminders bhejne mein truti hui', {
        description: err.message || 'Server se sahi pratikriya nahi mili.',
      });
    } finally {
      setSending(false);
    }
  };

  if (overdueCount === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -20 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          className="w-full overflow-hidden"
        >
          <div className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(239,68,68,0.1)] relative">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center flex-shrink-0 animate-pulse mt-0.5 sm:mt-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-rose-400 uppercase tracking-wider">
                  Bhugtan Overdue Chetavani!
                </h4>
                <p className="text-xs text-rose-200 font-medium">
                  Aapke <span className="font-extrabold text-rose-400">{overdueCount} invoices</span> overdue ho chuke hain. Total <span className="font-extrabold text-rose-400">{formatINR(overdueAmount)}</span> pending hai.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSendReminders}
                disabled={sending}
                className="h-9 px-4 text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow border border-rose-500/40"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Bhej Rahe Hain...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-2" />
                    Reminders Bhejo
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-9 w-9 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
