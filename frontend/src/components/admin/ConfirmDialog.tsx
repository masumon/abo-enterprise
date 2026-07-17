"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const focusables = () =>
      dialogRef.current
        ? Array.from(
            dialogRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute("disabled"))
        : [];

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      // Trap Tab inside the dialog while it's open — screen-reader users
      // shouldn't be able to tab into the layout behind the overlay.
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  const colors = {
    danger: { icon: "text-red-500 bg-red-50", btn: "bg-red-600 hover:bg-red-700 text-white" },
    warning: { icon: "text-amber-500 bg-amber-50", btn: "bg-amber-600 hover:bg-amber-700 text-white" },
    info: { icon: "text-brand-500 bg-brand-50", btn: "bg-brand-600 hover:bg-brand-700 text-white" },
  }[variant];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div ref={dialogRef} className="w-full max-w-md animate-scale-in rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="pointer-events-none -mx-6 -mt-6 mb-4 h-px bg-gradient-to-r from-transparent via-brand-300/60 to-transparent" />
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border flex-shrink-0 ${colors.icon}`}>
            {variant === "danger" ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-title" className="text-base font-semibold text-gray-900 mb-1 text-balance">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-1 border-t border-gray-100">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="btn btn-outline btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`btn btn-sm px-5 ${colors.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
