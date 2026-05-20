'use client';

import { motion } from 'framer-motion';
import { FilePlus, PiggyBank, UserPlus, FolderKanban, MessageSquareCode } from 'lucide-react';
import Link from 'next/link';

export default function QuickActions() {
  const actions = [
    {
      label: 'Invoice Banao',
      icon: <FilePlus className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      color: 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20',
      url: '/invoices/new',
    },
    {
      label: 'Kharcha Add Karo',
      icon: <PiggyBank className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
      color: 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20',
      url: '/expenses/new',
    },
    {
      label: 'Staff Add Karo',
      icon: <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      color: 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20',
      url: '/staff/new',
    },
    {
      label: 'Lead Add Karo',
      icon: <FolderKanban className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
      color: 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20',
      url: '/crm/leads/new',
    },
    {
      label: 'AI Se Poochho',
      icon: <MessageSquareCode className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      color: 'bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/20',
      url: '/ai',
    },
  ];

  return (
    <div className="space-y-3.5 w-full">
      <h3 className="font-bold text-foreground text-base tracking-tight">Quick Actions</h3>
      
      {/* Horizontal grid scrollable on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-2.5 pt-0.5 scrollbar-none snap-x snap-mandatory">
        {actions.map((act, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="snap-start flex-shrink-0 min-w-[135px] sm:min-w-[155px] flex-1"
          >
            <Link
              href={act.url}
              className={`flex flex-col items-center justify-center p-4 border rounded-2xl bg-card text-center gap-3 shadow-xs hover:shadow-sm cursor-pointer transition-all duration-300 ${act.color} h-[115px] sm:h-[125px]`}
            >
              <div className="p-2.5 bg-background rounded-xl shadow-xs">
                {act.icon}
              </div>
              <span className="text-xs font-bold text-foreground tracking-wide leading-tight">
                {act.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
