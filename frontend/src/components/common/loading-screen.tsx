import { Logo } from "./logo";
import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-all duration-300">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Animated Brand Logo */}
        <Logo className="scale-125 duration-1000 animate-pulse" />
        
        {/* Subtle status loader */}
        <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-secondary/50 border border-border text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
          <span>Aapka Saathi taiyar ho raha hai...</span>
        </div>
      </div>
    </div>
  );
}
