"use client";

import Link from "next/link";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

/**
 * The kit draws one toast: a dark ink bar sitting just above the tab bar, its
 * action in marigold at the right edge. Only the icon changes with the type.
 *
 * It used to be a pale card pinned to the top-right — the far corner from the
 * thumb, above the fold the visitor was already looking at, and styled like the
 * page's own alerts, so a toast and an inline error read as the same thing.
 * Bottom-anchored and inverted, it reads as system feedback and its undo is
 * reachable without moving the hand.
 */
const ICON_TONE = {
  success: "text-emerald-400",
  error: "text-red-400",
  info: "text-brand-300",
};

export default function ToastProvider() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      /* Above the mobile tab bar, and clear of it entirely on desktop where
         there is no tab bar to avoid. */
      className="fixed inset-x-0 z-[100] flex flex-col gap-2 px-3 pointer-events-none lg:left-auto lg:right-6 lg:bottom-6 lg:px-0 lg:max-w-sm"
      style={{ bottom: "calc(var(--mobile-chrome-bottom) + 12px)" }}
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2.5 px-3 py-2.5 rounded-lg shadow-glass-strong motion-safe:animate-slide-up"
            style={{ backgroundColor: "var(--ink)", color: "var(--surface-light)" }}
            role="alert"
          >
            <Icon className={cn("w-4 h-4 flex-shrink-0", ICON_TONE[toast.type])} />
            <p className="flex-1 min-w-0 text-sm">{toast.message}</p>
            {/* GAP-29 — an action may navigate (href) or run a callback
                (onClick, e.g. undo). Existing href callers are unchanged. */}
            {toast.action?.href && (
              <Link
                href={toast.action.href}
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 text-sm font-bold text-accent-400 hover:text-accent-300"
              >
                {toast.action.label}
              </Link>
            )}
            {toast.action && !toast.action.href && toast.action.onClick && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick?.();
                  dismiss(toast.id);
                }}
                className="flex-shrink-0 text-sm font-bold text-accent-400 hover:text-accent-300"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
