import { cn } from "@/lib/utils";
import { Handshake } from "lucide-react";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 font-bold tracking-tight select-none", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all duration-300 hover:scale-105">
        <Handshake className="h-5.5 w-5.5" />
      </div>
      {!iconOnly && (
        <span className="text-xl font-extrabold bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent dark:from-brand-500 dark:to-brand-100">
          Biz<span className="text-foreground font-semibold">Saathi</span>
        </span>
      )}
    </div>
  );
}
