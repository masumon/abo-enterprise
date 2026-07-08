"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
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
        .map((i) => ({ ...i, group: g.label }))
    );
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.labelBn ?? "").includes(query.trim()) ||
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Quick navigation"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && items[active]) { e.preventDefault(); go(items[active].href); }
            }}
            placeholder="পেজ খুঁজুন… (Orders, Products, Settings…)"
            className="w-full py-3.5 text-sm outline-none placeholder:text-gray-400"
            aria-label="Search admin pages"
          />
          <kbd className="text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 flex-shrink-0">Esc</kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto py-2" role="listbox">
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
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left",
                    i === active ? "bg-brand-50 text-brand-700" : "text-gray-700"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span className="flex-1">
                    {item.label}
                    {item.labelBn && <span className="text-gray-400 ml-2 text-xs">{item.labelBn}</span>}
                  </span>
                  <span className="text-[10px] text-gray-300 uppercase">{item.group}</span>
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
