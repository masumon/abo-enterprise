import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color?: "brand" | "accent" | "green" | "amber";
  loading?: boolean;
}

const COLOR_MAP = {
  brand:  { bg: "bg-brand-50",  icon: "text-brand-600",  ring: "border-brand-100" },
  accent: { bg: "bg-accent-50", icon: "text-accent-600", ring: "border-accent-100" },
  green:  { bg: "bg-green-50",  icon: "text-green-600",  ring: "border-green-100"  },
  amber:  { bg: "bg-amber-50",  icon: "text-amber-600",  ring: "border-amber-100"  },
};

export default function StatsCard({ title, value, sub, icon: Icon, color = "brand", loading }: Props) {
  const c = COLOR_MAP[color];
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>
          {loading ? (
            <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          )}
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border", c.bg, c.ring)}>
          <Icon className={cn("w-5 h-5", c.icon)} />
        </div>
      </div>
    </div>
  );
}
