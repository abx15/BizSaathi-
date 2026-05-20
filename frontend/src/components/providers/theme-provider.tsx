'use client';

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import Lenis from 'lenis';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  
  // Set up Lenis smooth scroll globally on mount
  React.useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
