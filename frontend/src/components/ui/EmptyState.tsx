import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GAP-28 — an empty state that offers no next action is a dead end, and the
 * component previously allowed one to be built by accident. The action is now
 * required at the type level: supply a label plus either a destination
 * (actionHref) or a handler (onAction). Guidance in a document does not
 * survive future development; a required prop does.
 */
type EmptyStateAction =
  | { actionLabel: string; actionHref: string; onAction?: never }
  | { actionLabel: string; actionHref?: never; onAction: () => void };

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
} & EmptyStateAction;

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
