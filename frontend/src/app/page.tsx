'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { LoadingScreen } from '@/components/common/loading-screen';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, BarChart3, FileText, Users, MessageSquare, Zap, Shield, TrendingUp } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const { isAuthenticated, isOnboarded } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    isOnboarded: state.isOnboarded,
  }));

  useEffect(() => {
    setMounted(true);
    
    // Smooth instant redirection based on auth status
    if (isAuthenticated) {
      if (isOnboarded) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, isOnboarded, router]);

  // Always show a gorgeous branded loading splash during hydration and redirect
  return <LoadingScreen />;
}
