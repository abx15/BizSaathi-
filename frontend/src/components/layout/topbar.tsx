'use client';

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/store/ui.store";
import { useWsStore } from "@/store/ws.store";
import { useAuth } from "@/hooks/use-auth";
import { timeAgo } from "@/lib/format";
import { UI_TEXT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  Search, 
  Menu, 
  Sparkles, 
  FileText, 
  CreditCard, 
  Users, 
  Settings, 
  LogOut, 
  Check, 
  Moon, 
  Sun 
} from "lucide-react";
import { useTheme } from "next-themes";

export function Topbar() {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  
  // Ui Zustand
  const { sidebarOpen, setSidebarOpen, searchOpen, setSearchOpen, notificationsOpen, setNotificationsOpen } = useUiStore();
  
  // Ws Zustand
  const { events, markAllAsRead, markAsRead } = useWsStore();
  
  // Auth useAuth
  const { user, tenant, logout } = useAuth();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false); // standard clean hydration
    setMounted(true);
  }, []);

  // Handle keyboard command shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  if (!mounted) return null;

  // Compute page title dynamically
  const getPageTitle = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0 || segments[0] === "dashboard") return "Dashboard Overview";
    const segment = segments[0];
    const map: Record<string, string> = {
      invoices: "Invoices & Billing",
      expenses: "Expense Tracker",
      staff: "Staff Management",
      crm: "CRM Contacts",
      ai: "AI Business Reports",
      settings: "Business Settings",
    };
    return map[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  const unreadCount = events.filter((e) => !e.read).length;

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card/60 backdrop-blur-md px-4 md:px-6 sticky top-0 z-20 select-none">
      
      {/* Mobile hamburger menu and page title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-9 w-9 p-0 md:hidden border border-border"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-base md:text-lg font-bold tracking-tight text-foreground truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Action Buttons Search, Notification, Profile */}
      <div className="flex items-center gap-3">
        {/* Universal Search Cmd+K Trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 text-xs w-48 font-medium cursor-pointer"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">{UI_TEXT.dashboard.topbar.searchPlaceholder}</span>
          <kbd className="font-sans font-semibold text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded-md shadow-sm">
            ⌘K
          </kbd>
        </button>

        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchOpen(true)}
          className="sm:hidden h-9 w-9 p-0 border border-border"
        >
          <Search className="h-4.5 w-4.5" />
        </Button>

        {/* Real-time Notification Bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotificationsOpen(true)}
            className="h-9 w-9 p-0 border border-border relative rounded-xl"
          >
            <Bell className="h-4.5 w-4.5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>

        {/* Profile Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-border p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || "User"} />
                <AvatarFallback className="bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase">
                  {user?.name?.slice(0, 2) || user?.phone?.slice(-2) || "BS"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-foreground truncate">{tenant?.name || "My Business"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.name || user?.phone}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer font-medium text-sm flex gap-2">
              <Avatar className="h-4.5 w-4.5">
                <AvatarFallback className="text-[8px] bg-brand-500/10 text-brand-600">BS</AvatarFallback>
              </Avatar>
              {UI_TEXT.dashboard.topbar.profile}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer font-medium text-sm flex gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              {UI_TEXT.dashboard.topbar.businessSettings}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="cursor-pointer font-medium text-sm flex gap-2"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
              <span>Theme Switch</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={logout}
              className="cursor-pointer font-semibold text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex gap-2"
            >
              <LogOut className="h-4 w-4" />
              {UI_TEXT.dashboard.sidebar.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Global Cmd+K Search Command Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search actions, files, or menus..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Invoices & Expenses">
            <CommandItem className="cursor-pointer flex gap-2">
              <FileText className="h-4 w-4 text-brand-500" />
              <span>Naya Invoice Banayein</span>
            </CommandItem>
            <CommandItem className="cursor-pointer flex gap-2">
              <CreditCard className="h-4 w-4 text-amber-500" />
              <span>Naya Expense Add karein</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Quick Links">
            <CommandItem className="cursor-pointer flex gap-2">
              <Users className="h-4 w-4" />
              <span>Staff attendance manage karein</span>
            </CommandItem>
            <CommandItem className="cursor-pointer flex gap-2">
              <Sparkles className="h-4 w-4 text-brand-500" />
              <span>AI Performance Reports dekhein</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Push Notifications Side Drawer Sheet */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-card">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex justify-between items-center">
              <SheetTitle className="text-lg font-bold">{UI_TEXT.dashboard.topbar.notifications}</SheetTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-brand-600 dark:text-brand-400 text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  {UI_TEXT.dashboard.topbar.markAllRead}
                </Button>
              )}
            </div>
            <SheetDescription>
              Real-time pushes coming from WebSocket events.
            </SheetDescription>
          </SheetHeader>

          {/* Notifications List Container */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
                <Bell className="h-8 w-8 text-muted-foreground/40 stroke-[1.5]" />
                <p className="text-sm font-semibold text-muted-foreground">
                  {UI_TEXT.dashboard.topbar.noNotifications}
                </p>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => markAsRead(event.id)}
                  className={cn(
                    "p-3.5 rounded-xl border border-border/80 transition-all cursor-pointer relative select-none hover:bg-secondary/40",
                    !event.read ? "bg-brand-500/5 border-brand-500/15" : "bg-background"
                  )}
                >
                  {!event.read && (
                    <span className="absolute top-3.5 right-3.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
                  )}
                  <h4 className="text-sm font-bold pr-4">{event.title || "Notification"}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.message}</p>
                  <span className="text-[10px] text-muted-foreground/60 font-semibold block mt-2 text-right">
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
