import { parseISO } from "date-fns";

// INR formatter — Indian number system
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Compact INR for charts
export function formatINRCompact(amount: number): string {
  const absolute = Math.abs(amount);
  let formatted = "";
  if (absolute >= 10000000) {
    formatted = `₹${(amount / 10000000).toFixed(1)}Cr`;
  } else if (absolute >= 100000) {
    formatted = `₹${(amount / 100000).toFixed(1)}L`;
  } else if (absolute >= 1000) {
    formatted = `₹${(amount / 1000).toFixed(1)}K`;
  } else {
    formatted = `₹${amount}`;
  }
  return formatted.replace(".0L", "L").replace(".0Cr", "Cr").replace(".0K", "K");
}

// Date formatters (Indian style)
export function formatDate(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(d);
}

export function formatDateShort(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short'
  }).format(d);
}

// Relative time (Hinglish)
export function timeAgo(date: string | Date): string {
  if (!date) return "Kuch samay pehle";
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isNaN(d.getTime())) return "Kuch samay pehle";

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Abhi abhi";
  if (diffMin === 1) return "1 minute pehle";
  if (diffMin < 60) return `${diffMin} minute pehle`;
  if (diffHours === 1) return "1 ghanta pehle";
  if (diffHours < 24) return `${diffHours} ghante pehle`;
  if (diffDays === 1) return "Kal";
  if (diffDays < 30) return `${diffDays} din pehle`;

  return formatDate(d);
}

// Phone formatter: 9876543210 → "+91 98765 43210"
export function formatPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// Invoice status badge color
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground border-muted',
    SENT: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    PAID: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    PARTIAL: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    OVERDUE: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    CANCELLED: 'bg-muted text-muted-foreground opacity-60 border-muted',
  };
  return map[status.toUpperCase()] || 'bg-muted text-muted-foreground border-muted';
}
