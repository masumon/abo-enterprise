"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, X } from "lucide-react";
import { ADMIN_NAV_GROUPS, canSeeNavItem, type AdminRole } from "@/lib/adminNav";
import { cn } from "@/lib/utils";

interface Props {
  role?: string;
}

/** Ctrl+K / Cmd+K quick navigation across all admin pages. Purely additive —
 * renders nothing until opened, so it cannot affect existing page behavior. */
export default function AdminCommandPalette({ role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const all = ADMIN_NAV_GROUPS.flatMap((g) =>
      g.items
        .filter((i) => !i.external && canSeeNavItem(i, role as AdminRole | undefined))
        .map((i) => ({ ...i, group: g.labelBn ?? g.label }))
    );
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.labelBn ?? "").includes(query.trim()) ||
        (i.keywords ?? "").toLowerCase().includes(q) ||
        (i.descBn ?? "").includes(query.trim()) ||
        i.href.toLowerCase().includes(q)
    );
  }, [query, role]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    // The top-bar search button (works on phones, where there is no Ctrl+K) fires this.
    const onOpen = () => { setOpen(true); setQuery(""); setActive(0); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("abo-admin-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("abo-admin-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-stretch sm:items-start justify-center sm:pt-[15vh] sm:px-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Quick navigation"
    >
      <div className="bg-white dark:bg-gray-900 flex flex-col h-dvh sm:h-auto rounded-none sm:rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 w-full max-w-lg overflow-hidden">
        <div className="sm:hidden flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100">কোথায় যেতে চান?</p>
          <button type="button" onClick={() => setOpen(false)} aria-label="বন্ধ করুন" className="min-h-11 min-w-11 -mr-2 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-2 px-4 border-b border-gray-100 dark:border-white/10 max-sm:mx-3 max-sm:mb-2 max-sm:rounded-2xl max-sm:border max-sm:border-brand-200 max-sm:bg-brand-50/60 dark:max-sm:bg-white/5">
          <Search className="w-5 h-5 text-brand-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && items[active]) { e.preventDefault(); go(items[active].href); }
            }}
            placeholder="কী করতে চান? লিখুন — যেমন: ব্যানার, ছবি, অর্ডার, লোগো…"
            className="w-full py-4 text-base sm:text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            aria-label="Search admin pages"
          />
          <kbd className="hidden sm:inline text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 flex-shrink-0">Esc</kbd>
        </div>
        <ul className="flex-1 min-h-0 sm:flex-none sm:max-h-72 overflow-y-auto py-2" role="listbox">
          {items.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-gray-400">কিছু পাওয়া যায়নি</li>
          )}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.href} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onClick={() => go(item.href)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-left min-h-12 sm:min-h-0",
                    i === active ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200" : "text-gray-700 dark:text-gray-200"
                  )}
                >
                  <span className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center flex-none"><Icon className="w-5 h-5 sm:w-4 sm:h-4 text-brand-600 dark:text-brand-300" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{item.labelBn ?? item.label}</span>
                    {item.descBn && <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{item.descBn}</span>}
                  </span>
                  <span className="hidden min-[400px]:inline-block text-[10px] font-semibold text-brand-600 dark:text-brand-200 bg-brand-50 dark:bg-white/10 rounded-full px-2 py-0.5 max-w-[6.5rem] truncate">{item.group}</span>
                  {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-brand-400" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
