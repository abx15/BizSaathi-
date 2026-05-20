'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Home, 
  FileText, 
  CreditCard, 
  FolderHeart, 
  MoreHorizontal, 
  Users, 
  Sparkles, 
  Settings, 
  LogOut 
} from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const mainItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Bills", href: "/invoices", icon: FileText },
    { name: "Expenses", href: "/expenses", icon: CreditCard },
    { name: "CRM", href: "/crm", icon: FolderHeart },
  ];

  const moreItems = [
    { name: "Staff Attendance", href: "/staff", icon: Users },
    { name: "AI Reports", href: "/ai", icon: Sparkles },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-md h-16 flex items-center justify-around z-30 px-2 pb-safe select-none">
      {mainItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 flex-1 h-full text-[10px] font-bold transition-all duration-200",
              isActive ? "text-brand-500" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[2]")} />
            <span>{item.name}</span>
          </Link>
        );
      })}

      {/* "More" Bottom Sheet Trigger */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center gap-1.5 flex-1 h-full text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none">
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-4 bg-card max-h-[70vh] focus:outline-none">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left font-extrabold text-base">BizSaathi Menu</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 py-3">
            {moreItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/80 text-[10px] font-bold text-center",
                    isActive ? "bg-brand-500/5 border-brand-500 text-brand-500" : "bg-background text-muted-foreground"
                  )}
                >
                  <Icon className="h-5.5 w-5.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setMoreOpen(false);
                logout();
              }}
              className="w-full h-10 font-bold rounded-xl flex justify-center gap-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
