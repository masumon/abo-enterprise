"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { aiCatalogApi, productsApi, servicesAdminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";
import { useToastStore } from "@/store/toast";

/** Items whose Bangla/English description is missing or very short. */
const WEAK = 80;
const MAX_PER_RUN = 10; // stays inside the free AI daily cap

type Row = { id: string; name: string; old: string; bn: string; en: string; pick: boolean };
type Raw = { id?: string; name_bn?: string | null; name_en?: string; description_bn?: string | null; description_en?: string | null };

/**
 * "✨ দুর্বল বিবরণ উন্নত করুন" — finds products/services with a missing or very short
 * description, lets AI draft better ones (up to 10 per run), shows them side by side,
 * and saves only the ones the admin keeps ticked. Nothing changes before "সংরক্ষণ".
 */
export default function BulkImproveModal({ kind, onClose, onSaved }: { kind: "product" | "service"; onClose: () => void; onSaved: () => void }) {
  const toast = useToastStore((s) => s.push);
  const [weak, setWeak] = useState<Raw[] | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const load = kind === "product" ? productsApi.adminList({ per_page: 100 }) : servicesAdminApi.list({ per_page: 100 });
    load
      .then((r) => {
        const list = (r.data.data ?? []) as Raw[];
        setWeak(list.filter((p) => p.id && ((p.description_bn ?? "").trim().length < WEAK) && ((p.description_en ?? "").trim().length < WEAK)));
      })
      .catch((e) => { setWeak([]); toast("error", apiErrorMessage(e, "তালিকা আনা যায়নি")); });
  }, [kind, toast]);

  const draft = async () => {
    if (!weak?.length) return;
    setBusy(true); setRows([]); setProgress(0);
    const out: Row[] = [];
    for (const p of weak.slice(0, MAX_PER_RUN)) {
      const name = (p.name_bn || p.name_en || "").trim();
      try {
        const r = await aiCatalogApi.describe({ kind, name, notes: (p.description_bn || p.description_en || "").trim() });
        const d = r.data.data;
        if (d && (d.description_bn || d.description_en)) out.push({ id: p.id!, name, old: (p.description_bn || p.description_en || "").trim(), bn: d.description_bn ?? "", en: d.description_en ?? "", pick: true });
      } catch (e) {
        toast("error", apiErrorMessage(e, `${name}: AI লিখতে পারেনি`));
        if (String((e as { response?: { status?: number } })?.response?.status) === "429") break;
      }
      setProgress((n) => n + 1);
      setRows([...out]);
    }
    setBusy(false);
  };

  const save = async () => {
    const chosen = rows.filter((r) => r.pick);
    if (!chosen.length) return;
    setBusy(true);
    let ok = 0;
    for (const r of chosen) {
      try {
        const patch = { description_bn: r.bn, description_en: r.en };
        if (kind === "product") await productsApi.update(r.id, patch); else await servicesAdminApi.update(r.id, patch);
        ok += 1;
      } catch { /* keep going; reported below */ }
    }
    setBusy(false);
    toast(ok === chosen.length ? "success" : "error", `${ok.toLocaleString("bn-BD")}/${chosen.length.toLocaleString("bn-BD")}টি বিবরণ সংরক্ষিত হয়েছে`);
    onSaved();
    onClose();
  };

  const label = kind === "product" ? "পণ্য" : "সেবা";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={ADMIN_MODAL_BACKDROP_STYLE} onClick={onClose} role="dialog" aria-modal="true" aria-label="দুর্বল বিবরণ উন্নত করুন">
      <div className="rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" style={ADMIN_MODAL_PANEL_STYLE} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-600" aria-hidden /> দুর্বল বিবরণ উন্নত করুন</h2>
          <button type="button" onClick={onClose} aria-label="বন্ধ করুন" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {weak === null ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-500" aria-label="লোড হচ্ছে" /></div>
          ) : weak.length === 0 ? (
            <p className="text-sm text-emerald-700 py-6 text-center">সব {label}র বিবরণ যথেষ্ট ভালো আছে ✅</p>
          ) : (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {weak.length.toLocaleString("bn-BD")}টি {label}র বিবরণ নেই বা খুব ছোট ({WEAK.toLocaleString("bn-BD")} অক্ষরের কম)। একবারে সর্বোচ্চ {MAX_PER_RUN.toLocaleString("bn-BD")}টির খসড়া বানানো হবে — আপনি দেখে টিক রাখা গুলোই সংরক্ষণ হবে।
              </p>
              {rows.length === 0 && (
                <button type="button" onClick={draft} disabled={busy} className="btn btn-brand min-h-11 gap-1.5">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Sparkles className="w-4 h-4" aria-hidden />} AI দিয়ে খসড়া বানাও
                </button>
              )}
              {busy && <p className="text-xs text-gray-500">AI লিখছে… {progress.toLocaleString("bn-BD")}/{Math.min(weak.length, MAX_PER_RUN).toLocaleString("bn-BD")}</p>}
              <ul className="space-y-2">
                {rows.map((r, i) => (
                  <li key={r.id} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-1.5">
                    <label className="flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-gray-100 cursor-pointer min-h-11">
                      <input type="checkbox" className="w-5 h-5" checked={r.pick} onChange={(e) => setRows((l) => l.map((x, j) => (j === i ? { ...x, pick: e.target.checked } : x)))} />
                      {r.name}
                    </label>
                    {r.old && <p className="text-xs text-gray-500 line-through break-words">{r.old}</p>}
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words" dir="auto">{r.bn || r.en}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-white/10">
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm min-h-11">বাতিল</button>
          {rows.length > 0 && (
            <button type="button" onClick={save} disabled={busy || !rows.some((r) => r.pick)} className="btn btn-brand btn-sm min-h-11 gap-1.5">
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} টিক দেওয়াগুলো সংরক্ষণ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
