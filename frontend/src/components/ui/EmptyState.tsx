import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("enterprise-card p-10 text-center max-w-md mx-auto", className)}>
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-brand-500" />
      </div>
      <h3 className="text-lg font-bold text-heading mb-2">{title}</h3>
      {description && <p className="text-sm text-muted mb-6">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn-brand btn-md">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button type="button" onClick={onAction} className="btn btn-brand btn-md">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
