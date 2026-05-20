'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/store/ui.store";
import { useAuth } from "@/hooks/use-auth";
import { UI_TEXT } from "@/lib/constants";
import { Logo } from "@/components/common/logo";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Home, 
  FileText, 
  CreditCard, 
  Users, 
  FolderHeart, 
  Sparkles, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const { user, tenant, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const navItems = [
    { name: UI_TEXT.dashboard.sidebar.dashboard, href: "/dashboard", icon: Home },
    { name: UI_TEXT.dashboard.sidebar.invoices, href: "/invoices", icon: FileText },
    { name: UI_TEXT.dashboard.sidebar.expenses, href: "/expenses", icon: CreditCard },
    { name: UI_TEXT.dashboard.sidebar.staff, href: "/staff", icon: Users },
    { name: UI_TEXT.dashboard.sidebar.crm, href: "/crm", icon: FolderHeart },
    { name: UI_TEXT.dashboard.sidebar.aiReports, href: "/ai", icon: Sparkles },
    { name: UI_TEXT.dashboard.sidebar.settings, href: "/settings", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-card text-card-foreground transition-all duration-300 z-30 select-none",
        sidebarOpen ? "w-60" : "w-16",
        className
      )}
    >
      {/* Top Brand Logo Area */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {sidebarOpen ? (
          <Link href="/dashboard">
            <Logo />
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <Logo iconOnly />
          </Link>
        )}
        
        {sidebarOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-8 w-8 rounded-lg p-0 border border-border"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-brand-500/10"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="truncate">{item.name}</span>
              )}
              
              {/* Tooltip on collapsed state */}
              {!sidebarOpen && (
                <div className="absolute left-14 invisible opacity-0 group-hover:visible group-hover:opacity-100 bg-popover border border-border text-popover-foreground text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-md whitespace-nowrap transition-all duration-200 z-50 pointer-events-none">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Expand trigger if collapsed */}
      {!sidebarOpen && (
        <div className="flex justify-center py-2.5 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-8 w-8 rounded-lg p-0 border border-border"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* User profile & controls footer */}
      <div className="p-3 border-t border-border space-y-3 bg-secondary/20">
        {/* Profile Card */}
        {sidebarOpen ? (
          <div className="flex items-center gap-3 p-1 rounded-xl">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || "User"} />
              <AvatarFallback className="bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs uppercase">
                {user?.name?.slice(0, 2) || user?.phone?.slice(-2) || "BS"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold truncate leading-none text-foreground">
                {tenant?.name || "My Business"}
              </h4>
              <p className="text-[11px] text-muted-foreground font-semibold mt-1 truncate">
                {user?.name || user?.phone}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-1">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || "User"} />
              <AvatarFallback className="bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs uppercase">
                {user?.name?.slice(0, 2) || user?.phone?.slice(-2) || "BS"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <Separator className="bg-border/60" />

        {/* Sidebar Controls (Dark mode + Logout) */}
        <div className={cn("flex flex-col gap-1.5", sidebarOpen ? "" : "items-center")}>
          {sidebarOpen ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-secondary/50 border border-border/40">
              <span className="text-xs font-semibold text-muted-foreground">Dark Theme</span>
              <ThemeToggle />
            </div>
          ) : (
            <ThemeToggle />
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className={cn(
              "w-full rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10 cursor-pointer transition-all duration-200",
              sidebarOpen ? "justify-start gap-3.5 px-3 py-2.5 h-10" : "h-10 w-10 p-0 justify-center"
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>{UI_TEXT.dashboard.sidebar.logout}</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
