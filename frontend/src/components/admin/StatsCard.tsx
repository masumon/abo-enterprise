import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color?: "brand" | "accent" | "green" | "amber";
  loading?: boolean;
  alert?: boolean;
  /** When set, the whole card becomes a link to this admin page. */
  href?: string;
}

const COLOR_MAP = {
  brand:  {
    bg: "bg-gradient-to-br from-brand-50 to-brand-100/60",
    icon: "text-brand-600",
    ring: "border-brand-100",
    glow: "shadow-brand-100",
    value: "text-brand-700",
  },
  accent: {
    bg: "bg-gradient-to-br from-accent-50 to-accent-100/60",
    icon: "text-accent-600",
    ring: "border-accent-100",
    glow: "shadow-accent-100",
    value: "text-accent-700",
  },
  green:  {
    bg: "bg-gradient-to-br from-green-50 to-emerald-100/60",
    icon: "text-green-600",
    ring: "border-green-100",
    glow: "shadow-green-100",
    value: "text-green-700",
  },
  amber:  {
    bg: "bg-gradient-to-br from-amber-50 to-yellow-100/60",
    icon: "text-amber-600",
    ring: "border-amber-100",
    glow: "shadow-amber-100",
    value: "text-amber-700",
  },
};

export default function StatsCard({ title, value, sub, icon: Icon, color = "brand", loading, alert, href }: Props) {
  const c = COLOR_MAP[color];
  const cardClassName = cn(
    "admin-card p-5 group hover:-translate-y-0.5 transition-all duration-200",
    href && "block cursor-pointer hover:shadow-md"
  );

  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{title}</p>
          {alert && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
        </div>
        {loading ? (
          <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <p className={cn("text-3xl font-bold tracking-tight", c.value)}>{value}</p>
        )}
        {sub && <p className="text-xs text-gray-400 mt-1.5 font-medium">{sub}</p>}
      </div>
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center border flex-shrink-0",
        "shadow-md transition-transform duration-200 group-hover:scale-110",
        c.bg, c.ring, c.glow
      )}>
        <Icon className={cn("w-6 h-6", c.icon)} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
