'use client';

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/common/logo";
import { UI_TEXT, APP_METADATA } from "@/lib/constants";
import { CheckCircle2, ShieldCheck, Sparkles, MessageCircle } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isOnboarded } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If already logged in and onboarded, redirect straight to dashboard
    if (isAuthenticated) {
      if (isOnboarded) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    }
  }, [isAuthenticated, isOnboarded, router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background select-none">
      
      {/* Left Brand Panel — 60% width on Desktop, hidden on Mobile */}
      <div className="hidden md:flex md:w-[60%] flex-col justify-between p-12 bg-gradient-to-b from-brand-900 via-emerald-950 to-brand-900 text-white relative overflow-hidden select-none">
        
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Top Logo */}
        <div className="z-10">
          <Logo className="scale-110 text-white" />
        </div>

        {/* Tagline & Feature list */}
        <div className="z-10 max-w-lg space-y-8 my-auto">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-white to-brand-100 bg-clip-text text-transparent">
              {UI_TEXT.auth.tagline}
            </h1>
            <p className="text-sm font-semibold text-brand-100/70 tracking-wide">
              Free all-in-one business management app for Indian SMBs.
            </p>
          </div>

          <div className="space-y-5 pt-4">
            {UI_TEXT.auth.features.map((feature, i) => {
              const icons = [
                <CheckCircle2 key="i1" className="h-6 w-6 text-brand-500" />,
                <ShieldCheck key="i2" className="h-6 w-6 text-brand-500" />,
                <Sparkles key="i3" className="h-6 w-6 text-brand-500" />
              ];
              return (
                <div key={i} className="flex gap-4 items-start p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div className="p-2 rounded-xl bg-white/5">
                    {icons[i]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{feature.title}</h4>
                    <p className="text-xs text-brand-100/60 mt-1 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Version Details */}
        <div className="z-10 flex items-center justify-between text-xs text-brand-100/40 font-semibold tracking-wide border-t border-white/10 pt-4">
          <span>© 2026 {APP_METADATA.name} Technologies</span>
          <span>Version {APP_METADATA.version}</span>
        </div>
      </div>

      {/* Right Form Panel — 40% width on Desktop, full screen on Mobile */}
      <div className="flex-1 md:w-[40%] flex flex-col justify-center px-6 py-12 sm:px-12 relative">
        {/* Mobile Header (Top Logo show on mobile) */}
        <div className="md:hidden flex justify-center mb-8">
          <Logo />
        </div>
        
        {/* Children Render Forms */}
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
