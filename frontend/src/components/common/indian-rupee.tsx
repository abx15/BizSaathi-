import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface IndianRupeeProps {
  amount: number;
  className?: string;
  colored?: boolean; // Highlight green if positive/zero, red if negative
}

export function IndianRupee({ amount, className, colored = false }: IndianRupeeProps) {
  const formatted = formatINR(amount);
  
  const isPositive = amount >= 0;
  const colorClass = colored 
    ? (isPositive ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-rose-600 dark:text-rose-400 font-semibold")
    : "";

  return (
    <span className={cn("font-mono font-medium tracking-tight select-all", colorClass, className)}>
      {formatted}
    </span>
  );
}
