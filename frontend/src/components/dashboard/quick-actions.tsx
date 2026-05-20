'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FilePlus, Receipt, UserPlus, Briefcase, Bot } from 'lucide-react';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      title: 'Invoice Banao',
      icon: <FilePlus className="h-6 w-6" />,
      colorClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      route: '/invoices/new',
    },
    {
      title: 'Kharcha Add Karo',
      icon: <Receipt className="h-6 w-6" />,
      colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      route: '/expenses/new',
    },
    {
      title: 'Staff Add Karo',
      icon: <UserPlus className="h-6 w-6" />,
      colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      route: '/staff/new',
    },
    {
      title: 'Lead Add Karo',
      icon: <Briefcase className="h-6 w-6" />,
      colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      route: '/crm/leads/new',
    },
    {
      title: 'AI Se Poochho',
      icon: <Bot className="h-6 w-6" />,
      colorClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      route: '/ai',
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } },
  };

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground">Quick Actions</h3>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {actions.map((act, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push(act.route)}
            className="flex-shrink-0 w-36 h-28 bg-card border rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:shadow-md transition-shadow select-none group"
          >
            <div className={`p-3 rounded-xl border mb-3 group-hover:scale-110 transition-transform ${act.colorClass}`}>
              {act.icon}
            </div>
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {act.title}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
