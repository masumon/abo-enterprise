"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Package, Percent, Plus, Save, Trash2, Zap } from "lucide-react";
import { adminApi, couponsApi, type AdminCoupon } from "@/lib/api";
import { parseBoolSetting } from "@/lib/flashSale";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FlashSalePanel from "./FlashSalePanel";
import CombosManager from "@/components/admin/CombosManager";

interface Coupon {
  id?: string;
  code: string;
  discount_percent: number;
  min_subtotal: number;
  active: boolean;
}

/** Bulk-edit table over the real coupons table (alembic/manual_sql 0023).
 *  Same UI as before; Save now diffs rows against what loaded and issues
 *  create/update/delete calls instead of overwriting one Settings blob. */
export default function AdminCouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [original, setOriginal] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToastStore((s) => s.push);
  // Three tabs; #flash / #combos open that tab directly (deep links).
  type Tab = "coupons" | "flash" | "combos";
  const [tab, setTab] = useState<Tab>("coupons");
  useEffect(() => {
    const sync = () => setTab(window.location.hash === "#flash" ? "flash" : window.location.hash === "#combos" ? "combos" : "coupons");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const switchTab = (t: Tab) => { setTab(t); history.replaceState(null, "", t === "coupons" ? window.location.pathname : `#${t}`); };
  const [removeIdx, setRemoveIdx] = useState<number | null>(null);
  // Checkout coupon box on/off (moved here from Site Settings → Site Features).
  const [couponsOn, setCouponsOn] = useState<boolean | null>(null);
  useEffect(() => {
    adminApi.getSettings().then((r) => setCouponsOn(parseBoolSetting(r.data.data?.feature_coupons, true))).catch(() => setCouponsOn(null));
  }, []);
  const toggleCoupons = async (on: boolean) => {
    try {
      await adminApi.upsertSettings([{ key: "feature_coupons", value: on ? "true" : "false", data_type: "boolean" }]);
      setCouponsOn(on);
      toast("success", on ? "চেকআউটে কুপনের ঘর চালু" : "চেকআউটে কুপনের ঘর বন্ধ");
    } catch (e) {
      toast("error", apiErrorMessage(e, "বদলানো যায়নি"));
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await couponsApi.adminList();
      const list = res.data.data ?? [];
      setOriginal(list);
      setRows(
        list.map((c) => ({
          id: c.id,
          code: c.code,
          discount_percent: c.discount_percent,
          min_subtotal: c.min_subtotal,
          active: c.is_active,
        }))
      );
    } catch (err) {
      toast("error", apiErrorMessage(err, "কুপন আনা যায়নি"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRow = (idx: number, patch: Partial<Coupon>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [...prev, { code: "", discount_percent: 10, min_subtotal: 0, active: true }]);

  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    const seen = new Set<string>();
    for (const r of rows) {
      const code = r.code.trim().toUpperCase();
      if (!code) {
        toast("error", "প্রতিটি কুপনের কোড দিন");
        return;
      }
      if (seen.has(code)) {
        toast("error", `একই কোড দুবার: ${code}`);
        return;
      }
      seen.add(code);
      if (r.discount_percent < 0 || r.discount_percent > 100) {
        toast("error", `${code}: ছাড় ০–১০০% এর মধ্যে দিন`);
        return;
      }
      if (r.min_subtotal < 0) {
        toast("error", `${code}: ন্যূনতম অর্ডার ঋণাত্মক হতে পারে না`);
        return;
      }
    }
    setSaving(true);
    try {
      const currentIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
      const removed = original.filter((o) => !currentIds.has(o.id));
      await Promise.all(removed.map((o) => couponsApi.adminDelete(o.id)));

      await Promise.all(
        rows.map((r) => {
          const payload = {
            code: r.code.trim().toUpperCase(),
            discount_percent: Math.round(r.discount_percent),
            min_subtotal: Math.round(r.min_subtotal),
            is_active: r.active,
          };
          return r.id ? couponsApi.adminUpdate(r.id, payload) : couponsApi.adminCreate(payload);
        })
      );
      toast("success", "কুপন সেভ হয়েছে");
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "সেভ হয়নি"));
    } finally {
      setSaving(false);
    }
  };

  const bnNum = (n: number) => Math.round(n).toLocaleString("bn-BD");
  const dirty = JSON.stringify(rows) !== JSON.stringify(original.map((c) => ({ id: c.id, code: c.code, discount_percent: c.discount_percent, min_subtotal: c.min_subtotal, active: c.is_active })));
  const randomCode = () => `ABO${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return (
    <div className="admin-page pb-24">
      <AdminPageHeader
        title="Offers"
        titleBn="অফার"
        description="Coupon codes, the homepage flash sale and combo packs"
        descriptionBn="ছাড়ের কোড (কুপন), হোমপেজের ফ্ল্যাশ সেল আর কম্বো প্যাক — সব অফার এক পাতায়"
      />

      <div role="tablist" aria-label="অফারের ধরন" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button type="button" role="tab" aria-selected={tab === "coupons"} onClick={() => switchTab("coupons")} className={`btn btn-sm min-h-11 gap-1.5 ${tab === "coupons" ? "btn-brand" : "btn-outline"}`}><Percent className="w-4 h-4" aria-hidden /> কুপন</button>
        <button type="button" role="tab" aria-selected={tab === "flash"} onClick={() => switchTab("flash")} className={`btn btn-sm min-h-11 gap-1.5 ${tab === "flash" ? "btn-brand" : "btn-outline"}`}><Zap className="w-4 h-4" aria-hidden /> ফ্ল্যাশ সেল</button>
        <button type="button" role="tab" aria-selected={tab === "combos"} onClick={() => switchTab("combos")} className={`btn btn-sm min-h-11 gap-1.5 whitespace-nowrap ${tab === "combos" ? "btn-brand" : "btn-outline"}`}><Package className="w-4 h-4" aria-hidden /> কম্বো প্যাক</button>
      </div>

      {tab === "flash" ? <FlashSalePanel /> : tab === "combos" ? <CombosManager embedded /> : (<>
      {couponsOn !== null && (
        <label className="admin-card flex items-center justify-between gap-3 px-4 min-h-14 cursor-pointer">
          <span className="text-sm"><b>{couponsOn ? "✅ কুপন চালু" : "⏸️ কুপন বন্ধ"}</b> <span className="text-gray-600">— চেকআউটে “কুপন কোড” ঘর {couponsOn ? "দেখাচ্ছে" : "লুকানো"}</span></span>
          <input type="checkbox" className="w-5 h-5 accent-brand-600" checked={couponsOn} onChange={(e) => void toggleCoupons(e.target.checked)} />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={addRow} className="btn btn-brand btn-sm min-h-11 gap-1.5"><Plus className="w-4 h-4" /> নতুন কুপন</button>
        <p className="text-sm text-gray-600">{bnNum(rows.length)}টি কুপন — বদলের পর নিচের “সেভ করুন” চাপুন।</p>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <AdminEmptyState icon={Percent} title="এখনো কোনো কুপন নেই" description="“নতুন কুপন” চেপে একটি ছাড়ের কোড বানান — যেমন ABO10 দিলে ১০% ছাড়।" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((r, i) => (
            <article key={r.id ?? `new-${i}`} className={`rounded-2xl border p-4 space-y-3 bg-white dark:bg-white/5 ${r.active ? "border-gray-200 dark:border-white/10" : "border-dashed border-gray-300 opacity-80"}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <label className="text-[11px] font-semibold text-muted">কুপন কোড</label>
                  <div className="flex gap-1.5 mt-1">
                    <input value={r.code} onChange={(e) => updateRow(i, { code: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                      className="input flex-1 uppercase font-mono text-base font-bold tracking-wider" placeholder="ABO10" aria-label="কুপন কোড" />
                    {!r.code && <button type="button" onClick={() => updateRow(i, { code: randomCode() })} className="btn btn-outline btn-sm min-h-11 text-xs">নিজে বানাও</button>}
                  </div>
                </div>
                <button type="button" onClick={() => { if (!r.id) removeRow(i); else setRemoveIdx(i); }}
                  className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 mt-5" aria-label={`মুছুন ${r.code || "কুপন"}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted">কত % ছাড়</label>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {[5, 10, 15, 20, 25].map((n) => (
                    <button key={n} type="button" onClick={() => updateRow(i, { discount_percent: n })}
                      className={`rounded-full border px-3 min-h-10 text-sm ${r.discount_percent === n ? "bg-brand-600 text-white border-brand-600 font-semibold" : "border-gray-200 dark:border-white/10"}`}>{bnNum(n)}%</button>
                  ))}
                  <input type="number" min={0} max={100} inputMode="numeric" value={r.discount_percent} onChange={(e) => updateRow(i, { discount_percent: Number(e.target.value) })}
                    className="input w-20 text-sm" aria-label="ছাড় %" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted">কমপক্ষে কত টাকার অর্ডারে (০ = যেকোনো)</label>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {[0, 500, 1000, 2000].map((n) => (
                    <button key={n} type="button" onClick={() => updateRow(i, { min_subtotal: n })}
                      className={`rounded-full border px-3 min-h-10 text-sm ${r.min_subtotal === n ? "bg-brand-600 text-white border-brand-600 font-semibold" : "border-gray-200 dark:border-white/10"}`}>{n ? `৳${bnNum(n)}` : "যেকোনো"}</button>
                  ))}
                  <input type="number" min={0} inputMode="numeric" value={r.min_subtotal} onChange={(e) => updateRow(i, { min_subtotal: Number(e.target.value) })}
                    className="input w-24 text-sm" aria-label="ন্যূনতম অর্ডার ৳" />
                </div>
              </div>
              <label className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 dark:bg-white/5 px-3 min-h-11 cursor-pointer">
                <span className="text-sm">{r.active ? "✅ চালু — গ্রাহক ব্যবহার করতে পারবেন" : "⏸️ বন্ধ"}</span>
                <input type="checkbox" checked={r.active} onChange={(e) => updateRow(i, { active: e.target.checked })} className="w-5 h-5 accent-brand-600" />
              </label>
              {r.code && (
                <p className="text-xs text-muted">
                  🧾 গ্রাহক <b className="font-mono text-heading">{r.code}</b> লিখলে {r.min_subtotal ? `৳${bnNum(r.min_subtotal)} বা বেশি দামের অর্ডারে ` : ""}<b className="text-heading">{bnNum(r.discount_percent)}% ছাড়</b> পাবেন।
                  <button type="button" onClick={() => { void navigator.clipboard?.writeText(r.code); toast("success", "কোড কপি হয়েছে"); }} className="ml-1 text-brand-600 underline">কপি</button>
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {(dirty || saving) && (
        <div className="admin-savebar fixed bottom-0 left-0 right-0 lg:left-64 z-30 border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-gray-900/95 backdrop-blur pl-4 pr-24 py-3 flex items-center justify-between gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-sm text-amber-700 dark:text-amber-300">⚠️ সেভ করা হয়নি এমন পরিবর্তন আছে</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} disabled={saving} className="btn btn-outline btn-sm min-h-11">বাতিল</button>
            <button type="button" onClick={save} disabled={saving} className="btn btn-brand btn-sm min-h-11 gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} সেভ করুন
            </button>
          </div>
        </div>
      )}
      </>)}

      <ConfirmDialog
        open={removeIdx !== null}
        title={`কুপন ${removeIdx !== null ? rows[removeIdx]?.code ?? "" : ""} মুছবেন?`}
        message="“সেভ করুন” চাপলে স্থায়ীভাবে মুছে যাবে।"
        confirmLabel="মুছুন"
        variant="danger"
        onConfirm={() => { if (removeIdx !== null) removeRow(removeIdx); setRemoveIdx(null); }}
        onCancel={() => setRemoveIdx(null)}
      />
    </div>
  );
}
