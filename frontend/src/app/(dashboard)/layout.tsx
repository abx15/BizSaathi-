'use client';

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LoadingScreen } from "@/components/common/loading-screen";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isOnboarded } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (!isOnboarded) {
      router.push("/onboarding");
    } else {
      setChecking(false);
    }
  }, [isAuthenticated, isOnboarded, router]);

  if (checking) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Left Collapsible Sidebar */}
      <Sidebar />

      {/* Main Frame Canvas */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Universal Top Search & Alert Header */}
        <Topbar />

        {/* Dashboard Main Scroll Container */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:p-6 pb-24 md:pb-6 bg-secondary/15">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Menu */}
        <MobileNav />
      </div>
    </div>
  );
}
