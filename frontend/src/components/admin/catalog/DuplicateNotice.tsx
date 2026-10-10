"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, XCircle } from "lucide-react";
import type { DupMatch, DupQuery, DupResult } from "@/lib/catalogAdminApi";
import { useBnEn } from "./useBnEn";

const EMPTY: DupResult = { name_matches: [], slug_taken: null, sku_taken: null };

/**
 * Debounced "does this already exist?" lookup while the admin types a name /
 * slug / SKU. `check` is the page's lookup (server endpoint or a local list).
 * Errors are silent — the server still blocks a duplicate slug/SKU on save.
 */
export function useDuplicateCheck(check: (q: DupQuery) => Promise<DupResult>, q: DupQuery, enabled = true): DupResult {
  const [res, setRes] = useState<DupResult>(EMPTY);
  const key = JSON.stringify(q);
  useEffect(() => {
    if (!enabled) { setRes(EMPTY); return; }
    const query = JSON.parse(key) as DupQuery;
    if (!(query.name?.trim().length ?? 0) && !query.slug?.trim() && !query.sku?.trim()) { setRes(EMPTY); return; }
    let alive = true;
    const timer = setTimeout(() => {
      check(query).then((r) => { if (alive) setRes(r); }).catch(() => { if (alive) setRes(EMPTY); });
    }, 450);
    return () => { alive = false; clearTimeout(timer); };
    // `check` is stable per page; re-run only when the typed values change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return res;
}

const label = (m: DupMatch) => m.name_bn || m.name_en || m.slug || "";

export default function DuplicateNotice({ result, onOpen, show = "name" }: {
  result: DupResult;
  onOpen?: (m: DupMatch) => void;
  /** name = similar-name warning; codes = slug/SKU conflicts. */
  show?: "name" | "codes";
}) {
  const t = useBnEn();
  if (show === "codes") {
    const rows: { key: string; text: string; m: DupMatch }[] = [];
    if (result.slug_taken) rows.push({ key: "slug", m: result.slug_taken, text: result.slug_taken.deleted
      ? t("এই ওয়েব ঠিকানা (slug) আগে মুছে ফেলা একটিতে ব্যবহার হয়েছে — অন্যটি দিন।", "This web address (slug) was used by a deleted item — pick another.")
      : t(`এই ওয়েব ঠিকানা (slug) "${label(result.slug_taken)}"-এর — অন্যটি দিন।`, `This web address (slug) belongs to "${label(result.slug_taken)}" — pick another.`) });
    if (result.sku_taken) rows.push({ key: "sku", m: result.sku_taken,
      text: t(`এই SKU আগে থেকেই "${label(result.sku_taken)}"-এ আছে — অন্যটি দিন।`, `This SKU is already used by "${label(result.sku_taken)}".`) });
    if (!rows.length) return null;
    return (
      <div className="space-y-1.5" role="alert">
        {rows.map((r) => (
          <p key={r.key} className="flex flex-wrap items-center gap-2 text-xs text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-300 rounded-lg px-3 py-2">
            <XCircle className="w-4 h-4 flex-shrink-0" /> {r.text}
            {onOpen && !r.m.deleted && (
              <button type="button" onClick={() => onOpen(r.m)} className="underline font-semibold">{t("খুলুন", "Open")}</button>
            )}
          </p>
        ))}
      </div>
    );
  }
  const exact = result.name_matches.filter((m) => m.exact);
  const close = result.name_matches.filter((m) => !m.exact);
  if (!exact.length && !close.length) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-3 py-2 text-xs space-y-1.5" role="status">
      {exact.length > 0 && (
        <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {t("এটা আগে থেকেই আছে — খুলবেন?", "This already exists — open it?")}
        </p>
      )}
      {exact.length === 0 && (
        <p className="text-amber-900 dark:text-amber-200">{t("মিল আছে এমন নাম আগে থেকে আছে — একই জিনিস দুবার যোগ করছেন না তো?", "Similar names already exist — not adding the same thing twice?")}</p>
      )}
      <ul className="flex flex-wrap gap-1.5">
        {[...exact, ...close].slice(0, 5).map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onOpen?.(m)} disabled={!onOpen}
              className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-white/10 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 hover:border-brand-400">
              {label(m)}{m.is_active === false ? ` (${t("খসড়া", "draft")})` : ""}
              {onOpen && <ExternalLink className="w-3 h-3" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
