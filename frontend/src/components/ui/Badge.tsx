import { cn } from "@/lib/utils";

type BadgeVariant = "hot" | "new" | "sale" | "default" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  hot: "badge-hot",
  new: "badge-new",
  sale: "badge-sale",
  default: "bg-gray-100 text-gray-700 ring-1 ring-gray-200/60",
  outline: "bg-white/90 text-gray-600 border border-gray-200",
};

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn("badge", VARIANT_CLASSES[variant], className)}>
      {children}
    </span>
  );
}

export function badgeVariantFromProduct(badge?: string | null): BadgeVariant {
  if (badge === "HOT") return "hot";
  if (badge === "NEW") return "new";
  if (badge === "SALE") return "sale";
  return "default";
}
