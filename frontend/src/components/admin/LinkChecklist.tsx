"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

export interface LinkOption {
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * A searchable checklist used to wire many-to-many links in the admin panel
 * (a product/service picks its blog posts; a blog picks its products &
 * services). Clicking a row toggles it and shows a tick — the visual the
 * client asked for. Purely controlled: the parent owns `selected` and applies
 * the change in `onToggle`.
 */
export default function LinkChecklist({
  options,
  selected,
  onToggle,
  loading = false,
  emptyText = "None available",
  searchPlaceholder = "Search…",
  maxHeight = "16rem",
}: {
  options: LinkOption[];
  selected: string[];
  onToggle: (id: string) => void;
  loading?: boolean;
  emptyText?: string;
  searchPlaceholder?: string;
  maxHeight?: string;
}) {
  const [q, setQ] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        (o.sublabel ?? "").toLowerCase().includes(term)
    );
  }, [options, q]);

  return (
    <div className="rounded-xl border border-[var(--line,#e5e7eb)] overflow-hidden bg-white dark:bg-white/5">
      <div className="relative border-b border-[var(--line,#e5e7eb)]">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-transparent outline-none"
        />
      </div>

      <div className="overflow-y-auto divide-y divide-[var(--line,#f1f1f4)]" style={{ maxHeight }}>
        {loading ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">{emptyText}</p>
        ) : (
          filtered.map((o) => {
            const checked = selectedSet.has(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onToggle(o.id)}
                aria-pressed={checked}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  checked ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors ${
                    checked
                      ? "bg-brand-600 border-brand-600 text-white"
                      : "border-gray-300 dark:border-white/20 text-transparent"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-heading truncate">{o.label}</span>
                  {o.sublabel && (
                    <span className="block text-xs text-[var(--ink-muted,#6b7280)] truncate">{o.sublabel}</span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      {selected.length > 0 && (
        <div className="px-3 py-2 text-xs text-[var(--ink-muted,#6b7280)] border-t border-[var(--line,#e5e7eb)] bg-gray-50/60 dark:bg-white/5">
          {selected.length} selected
        </div>
      )}
    </div>
  );
}
