"use client";

import AiTextMenu from "@/components/admin/catalog/AiTextMenu";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Save, Search, Trash2, Zap } from "lucide-react";
import { adminApi, productsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { parseBoolSetting, parseDhakaDateTime, storedToDhakaInput } from "@/lib/flashSale";
import { useToastStore } from "@/store/toast";
import type { Product } from "@/types";
import FlashSaleAdminStatus from "@/components/admin/FlashSaleAdminStatus";
import PromoSlidesManager from "@/components/admin/PromoSlidesManager";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

/** Every flash-sale control in one place (moved from Homepage, Site Settings
 * and Promo Slides — same setting keys, same product fields). */
const KEYS = ["feature_flash_sale", "flash_sale_title_bn", "flash_sale_title_en", "flash_sale_icon", "flash_sale_size", "flash_sale_start", "flash_sale_end"] as const;
const SIZES = [["sm", "ছোট"], ["md", "মাঝারি (সাধারণ)"], ["lg", "বড়"], ["xl", "খুব বড়"]] as const;
const bn = (n: number) => Math.round(n).toLocaleString("bn-BD");

type Row = { id: string; name: string; price: number; flash: string; ends: string; image?: string };
const toRow = (p: Product): Row => ({
  id: p.id ?? "", name: p.name_bn || p.name_en, price: Number(p.price) || 0,
  flash: p.flash_sale_price != null ? String(p.flash_sale_price) : "",
  ends: p.flash_sale_ends_at ? storedToDhakaInput(p.flash_sale_ends_at) : "",
  image: p.image_url || p.images?.[0],
});

export default function FlashSalePanel() {
  const toast = useToastStore((s) => s.push);
  const [vals, setVals] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [rowBusy, setRowBusy] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Product[]>([]);
  const [removeTarget, setRemoveTarget] = useState<Row | null>(null);

  useEffect(() => {
    adminApi.getSettings()
      .then((r) => {
        const s = r.data.data ?? {};
        setVals({
          ...Object.fromEntries(KEYS.map((k) => [k, s[k] ?? ""])),
          // A never-saved switch is ON on the website — show it ON here too.
          feature_flash_sale: parseBoolSetting(s.feature_flash_sale, true) ? "true" : "false",
          flash_sale_start: storedToDhakaInput(s.flash_sale_start),
          flash_sale_end: storedToDhakaInput(s.flash_sale_end),
        });
      })
      .catch((e) => { toast("error", apiErrorMessage(e, "ফ্ল্যাশ সেলের তথ্য আনা যায়নি")); setVals(Object.fromEntries(KEYS.map((k) => [k, ""]))); });
  }, [toast]);

  const loadRows = useCallback(async () => {
    try {
      const r = await productsApi.adminList({ flash_sale: true, per_page: 100 });
      setRows((r.data.data ?? []).filter((p) => !!p.id).map(toRow));
    } catch (e) {
      setRows([]);
      toast("error", apiErrorMessage(e, "ফ্ল্যাশ সেলের পণ্য আনা যায়নি"));
    }
  }, [toast]);
  useEffect(() => { loadRows(); }, [loadRows]);

  // Product search (debounced) to add more products to the sale.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setFound([]); return; }
    const t = setTimeout(() => {
      productsApi.adminList({ search: term, per_page: 8 })
        .then((r) => setFound(r.data.data ?? []))
        .catch(() => setFound([]));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const set = (k: string, v: string) => setVals((m) => ({ ...(m ?? {}), [k]: v }));

  const saveSettings = async () => {
    if (!vals) return;
    const start = parseDhakaDateTime(vals.flash_sale_start);
    const end = parseDhakaDateTime(vals.flash_sale_end);
    if (start && end && end.getTime() <= start.getTime()) {
      toast("error", "শেষের সময় শুরুর সময়ের পরে হতে হবে");
      return;
    }
    setSaving(true);
    try {
      await adminApi.upsertSettings(KEYS.map((k) => ({ key: k, value: (vals[k] ?? "").trim(), data_type: k === "feature_flash_sale" ? "boolean" : "string" })));
      toast("success", "ফ্ল্যাশ সেল সংরক্ষিত হয়েছে — ওয়েবসাইটে ১ মিনিটের মধ্যে দেখাবে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "সংরক্ষণ করা যায়নি"));
    } finally {
      setSaving(false);
    }
  };

  const saveRow = async (r: Row) => {
    const flash = Number(r.flash);
    if (!r.flash || !(flash > 0)) { toast("error", `${r.name}: ফ্ল্যাশ দাম দিন`); return; }
    if (flash >= r.price) { toast("error", `${r.name}: ফ্ল্যাশ দাম আসল দামের (৳${bn(r.price)}) চেয়ে কম হতে হবে`); return; }
    setRowBusy(r.id);
    try {
      await productsApi.update(r.id, {
        flash_sale_price: flash,
        flash_sale_ends_at: r.ends ? (parseDhakaDateTime(r.ends) ?? new Date(r.ends)).toISOString() : null,
      });
      toast("success", `${r.name} — সংরক্ষিত`);
    } catch (e) {
      toast("error", apiErrorMessage(e, "সংরক্ষণ করা যায়নি"));
    } finally {
      setRowBusy("");
    }
  };

  const addProduct = async (p: Product) => {
    if (!p.id) return;
    setRowBusy(p.id);
    try {
      await productsApi.update(p.id, { is_flash_sale: true });
      setQ(""); setFound([]);
      await loadRows();
      toast("success", `${p.name_bn || p.name_en} যোগ হয়েছে — এখন ফ্ল্যাশ দাম দিন`);
    } catch (e) {
      toast("error", apiErrorMessage(e, "যোগ করা যায়নি"));
    } finally {
      setRowBusy("");
    }
  };

  const removeProduct = async () => {
    const r = removeTarget;
    setRemoveTarget(null);
    if (!r) return;
    setRowBusy(r.id);
    try {
      await productsApi.update(r.id, { is_flash_sale: false });
      setRows((list) => (list ?? []).filter((x) => x.id !== r.id));
      toast("success", `${r.name} ফ্ল্যাশ সেল থেকে বাদ দেওয়া হয়েছে`);
    } catch (e) {
      toast("error", apiErrorMessage(e, "বাদ দেওয়া যায়নি"));
    } finally {
      setRowBusy("");
    }
  };

  if (!vals) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" aria-label="লোড হচ্ছে" /></div>;
  const on = vals.feature_flash_sale === "true";

  return (
    <div className="space-y-4">
      {/* 1. switch, texts, timing */}
      <section className="admin-card p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Zap className="w-4 h-4 text-accent-600" aria-hidden /> কাউন্টডাউন ব্যানার</h2>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 min-h-11 cursor-pointer">
          <span className="text-sm font-medium">{on ? "✅ ফ্ল্যাশ সেল চালু" : "⏸️ ফ্ল্যাশ সেল বন্ধ"}</span>
          <input type="checkbox" className="w-5 h-5 accent-brand-600" checked={on} onChange={(e) => set("feature_flash_sale", e.target.checked ? "true" : "false")} />
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm block"><span className="flex items-center justify-between gap-2">শিরোনাম (বাংলা)<AiTextMenu compact text={vals.flash_sale_title_bn} onApply={(t) => set("flash_sale_title_bn", t)} context="flash sale countdown banner title (short, exciting)" /></span>
            <input className="input w-full min-h-11 text-base" placeholder="আজকের দুর্দান্ত অফার" value={vals.flash_sale_title_bn} onChange={(e) => set("flash_sale_title_bn", e.target.value)} />
          </label>
          <label className="text-sm block"><span className="flex items-center justify-between gap-2">শিরোনাম (ইংরেজি — ঐচ্ছিক)<AiTextMenu compact text={vals.flash_sale_title_en} onApply={(t) => set("flash_sale_title_en", t)} context="flash sale countdown banner title (short, exciting)" /></span>
            <input className="input w-full min-h-11 text-base" placeholder="Today's Best Offer" value={vals.flash_sale_title_en} onChange={(e) => set("flash_sale_title_en", e.target.value)} />
          </label>
          <label className="text-sm block">শুরু — বাংলাদেশ সময় (ঐচ্ছিক)
            <input type="datetime-local" className="input w-full min-h-11 text-base" value={vals.flash_sale_start} onChange={(e) => set("flash_sale_start", e.target.value)} />
            <span className="block text-xs text-gray-500 mt-1">খালি = এখনই শুরু</span>
          </label>
          <label className="text-sm block">শেষ — বাংলাদেশ সময়
            <input type="datetime-local" className="input w-full min-h-11 text-base" value={vals.flash_sale_end} onChange={(e) => set("flash_sale_end", e.target.value)} />
            <span className="block text-xs text-gray-500 mt-1">এই সময়ে নিজে থেকেই লুকাবে। খালি = এই সপ্তাহের শেষ (রবিবার রাত ১১:৫৯)</span>
          </label>
          <label className="text-sm block">আইকন (একটি ইমোজি)
            <input className="input w-full min-h-11 text-base" placeholder="⚡" value={vals.flash_sale_icon} onChange={(e) => set("flash_sale_icon", e.target.value)} />
            <span className="block text-xs text-gray-500 mt-1">যেমন ⚡ 🔥 🎁 💥 ⏰ — খালি রাখলে ⚡</span>
          </label>
          <label className="text-sm block">লেখা ও ঘড়ির আকার
            <select className="input w-full min-h-11 text-base" value={vals.flash_sale_size || "md"} onChange={(e) => set("flash_sale_size", e.target.value)}>
              {SIZES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        <FlashSaleAdminStatus values={vals} />
        <button type="button" onClick={saveSettings} disabled={saving} className="btn btn-brand min-h-11 px-5 gap-1.5 w-full sm:w-auto justify-center">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />} সংরক্ষণ করুন
        </button>
      </section>

      {/* 2. products in the sale */}
      <section className="admin-card p-4 sm:p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-900">ফ্ল্যাশ সেলের পণ্য</h2>
          <p className="text-xs text-gray-600">ফ্ল্যাশ দাম আসল দামের চেয়ে কম হতে হবে। অন্তত একটি পণ্য না থাকলে হোমপেজে ফ্ল্যাশ সেল দেখাবে না।</p>
        </div>
        <label className="relative block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="পণ্য খুঁজে যোগ করুন…" aria-label="পণ্য খুঁজুন" className="input pl-9 min-h-11 w-full text-base" />
        </label>
        {found.length > 0 && (
          <ul className="rounded-xl border border-gray-200 divide-y divide-gray-100">
            {found.map((p) => {
              const already = rows?.some((r) => r.id === p.id);
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="flex-1 min-w-0 text-sm break-words">{p.name_bn || p.name_en} <span className="text-gray-500">· ৳{bn(Number(p.price) || 0)}</span></span>
                  <button type="button" disabled={already || rowBusy === p.id} onClick={() => addProduct(p)} className="btn btn-outline btn-sm min-h-11 gap-1 flex-none">
                    {rowBusy === p.id ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />} {already ? "আছে" : "যোগ"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {rows === null ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500" aria-label="লোড হচ্ছে" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">এখনো কোনো পণ্য ফ্ল্যাশ সেলে নেই — উপরে খুঁজে যোগ করুন।</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((r) => {
              const flash = Number(r.flash);
              const off = r.price > 0 && flash > 0 && flash < r.price ? Math.round((1 - flash / r.price) * 100) : 0;
              return (
                <article key={r.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    {r.image ? <img src={r.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-none bg-gray-100" /> : <span className="w-12 h-12 rounded-lg bg-gray-100 flex-none" aria-hidden />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 break-words">{r.name}</p>
                      <p className="text-xs text-gray-600">আসল দাম ৳{bn(r.price)}{off > 0 && <> · <b className="text-emerald-700">{bn(off)}% ছাড়</b></>}{!r.flash && <span className="text-amber-700"> · ফ্ল্যাশ দাম দেওয়া নেই</span>}</p>
                    </div>
                    <button type="button" onClick={() => setRemoveTarget(r)} disabled={rowBusy === r.id} aria-label={`${r.name} বাদ দিন`} title="ফ্ল্যাশ সেল থেকে বাদ" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs block">ফ্ল্যাশ দাম (৳)
                      <input type="number" min={1} inputMode="numeric" className="input w-full min-h-11 text-base" value={r.flash}
                        onChange={(e) => setRows((list) => (list ?? []).map((x) => (x.id === r.id ? { ...x, flash: e.target.value } : x)))} />
                    </label>
                    <label className="text-xs block">এই পণ্যের শেষ (ঐচ্ছিক)
                      <input type="datetime-local" className="input w-full min-h-11 text-sm" value={r.ends}
                        onChange={(e) => setRows((list) => (list ?? []).map((x) => (x.id === r.id ? { ...x, ends: e.target.value } : x)))} />
                    </label>
                  </div>
                  <button type="button" onClick={() => saveRow(r)} disabled={rowBusy === r.id} className="btn btn-outline btn-sm min-h-11 gap-1.5 w-full justify-center">
                    {rowBusy === r.id ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />} এই পণ্য সংরক্ষণ
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. banners under the countdown (same promo slides table) */}
      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900 px-1">ফ্ল্যাশ সেল ব্যানার</h2>
        <PromoSlidesManager only="flash_sale" embedded />
      </section>

      <ConfirmDialog
        open={!!removeTarget}
        title="ফ্ল্যাশ সেল থেকে বাদ দেবেন?"
        message={removeTarget ? `${removeTarget.name} আর ফ্ল্যাশ সেলে দেখাবে না। পণ্যটি দোকানে আগের মতোই থাকবে।` : ""}
        confirmLabel="বাদ দিন"
        variant="warning"
        onConfirm={() => void removeProduct()}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
