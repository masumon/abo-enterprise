"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, Package, Minus, Search } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImageUpload from "@/components/admin/ImageUpload";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import BnEnText from "@/components/admin/catalog/BnEnText";
import { combosApi, productsApi, type Combo } from "@/lib/api";
import { translateBnToEn } from "@/lib/translate";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { formatPrice } from "@/lib/utils";

interface ProdLite { id: string; name_en: string; name_bn?: string; price?: number; image_url?: string | null }
interface Line { product_id: string; quantity: number }
interface Form {
  id?: string;
  title_en: string; title_bn: string;
  description_en: string; description_bn: string;
  image_url: string;
  combo_price: string; compare_at_price: string;
  badge_en: string; badge_bn: string;
  free_delivery: boolean; is_active: boolean; sort_order: string;
  items: Line[];
}

const EMPTY: Form = {
  title_en: "", title_bn: "", description_en: "", description_bn: "", image_url: "",
  combo_price: "", compare_at_price: "", badge_en: "", badge_bn: "",
  free_delivery: false, is_active: true, sort_order: "0", items: [],
};

export default function AdminCombosPage() {
  const toast = useToastStore((s) => s.push);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<ProdLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [delId, setDelId] = useState<string | null>(null);
  const [pick, setPick] = useState("");

  // Products fill the combo picker and MUST load even if the combos fetch
  // fails (e.g. the combos table isn't migrated yet), so the two are fetched
  // independently — a failure in one never blanks the other.
  const loadProducts = useCallback(async () => {
    try {
      // The admin products endpoint caps per_page at 100 (Query le=100); asking
      // for more returns 422 and left the picker empty. Page through instead so
      // every product is selectable regardless of catalogue size.
      const acc: ProdLite[] = [];
      let page = 1;
      for (;;) {
        const r = await productsApi.adminList({ page, per_page: 100 });
        acc.push(...((r.data.data ?? []) as ProdLite[]));
        const totalPages = r.data.meta?.total_pages ?? 1;
        if (page >= totalPages || (r.data.data ?? []).length === 0) break;
        page += 1;
      }
      setProducts(acc);
    } catch (e) {
      toast("error", apiErrorMessage(e, "পণ্য লোড করা যায়নি"));
    }
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await combosApi.adminList();
      setCombos(c.data.data ?? []);
    } catch (e) {
      toast("error", apiErrorMessage(e, "কম্বো লোড করা যায়নি — একটু পরে আবার চেষ্টা করুন, সমস্যা থাকলে ডেভেলপারকে জানান।"));
    } finally {
      setLoading(false);
    }
    await loadProducts();
  }, [toast, loadProducts]);

  useEffect(() => { load(); }, [load]);

  const prodName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(p.id, p.name_bn || p.name_en);
    return m;
  }, [products]);

  const openNew = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (c: Combo) => {
    setForm({
      id: c.id,
      title_en: c.title_en, title_bn: c.title_bn,
      description_en: c.description_en ?? "", description_bn: c.description_bn ?? "",
      image_url: c.image_url ?? "",
      combo_price: String(c.combo_price ?? ""),
      compare_at_price: c.compare_at_price != null ? String(c.compare_at_price) : "",
      badge_en: c.badge_en ?? "", badge_bn: c.badge_bn ?? "",
      free_delivery: c.free_delivery, is_active: c.is_active, sort_order: String(c.sort_order ?? 0),
      items: (c.items ?? []).map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    });
    setOpen(true);
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const addLine = () => {
    if (products.length === 0) { toast("error", "কোনো পণ্য পাওয়া যায়নি — আগে পণ্য তৈরি করুন"); return; }
    const first = products.find((p) => !form.items.some((i) => i.product_id === p.id));
    if (!first) { toast("info", "সব পণ্য ইতিমধ্যে যোগ করা হয়েছে"); return; }
    set("items", [...form.items, { product_id: first.id, quantity: 1 }]);
  };
  const setLine = (idx: number, patch: Partial<Line>) =>
    set("items", form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeLine = (idx: number) => set("items", form.items.filter((_, i) => i !== idx));

  const save = async () => {
    if (!form.title_en.trim() && !form.title_bn.trim()) { toast("error", "শিরোনাম দিন (বাংলা লিখলে অটো-অনুবাদ হবে)"); return; }
    if (!form.combo_price || Number(form.combo_price) <= 0) { toast("error", "কম্বো দাম দিন"); return; }
    if (form.items.length === 0) { toast("error", "অন্তত একটি পণ্য যোগ করুন"); return; }
    setSaving(true);
    // Bangla-first: fill any empty English field from its Bangla sibling so the
    // admin never has to type English by hand.
    let f = form;
    try {
      const patch: Partial<Form> = {};
      if (!f.title_en.trim() && f.title_bn.trim()) patch.title_en = await translateBnToEn(f.title_bn);
      if (!f.description_en.trim() && f.description_bn.trim()) patch.description_en = await translateBnToEn(f.description_bn);
      if (!f.badge_en.trim() && f.badge_bn.trim()) patch.badge_en = await translateBnToEn(f.badge_bn);
      if (Object.keys(patch).length) { f = { ...f, ...patch }; setForm(f); }
    } catch {
      setSaving(false);
      toast("error", "অটো-অনুবাদ ব্যর্থ — English নিজে লিখুন বা → English চাপুন");
      return;
    }
    const payload: Partial<Combo> = {
      title_en: f.title_en.trim(), title_bn: f.title_bn.trim(),
      description_en: f.description_en.trim() || null,
      description_bn: f.description_bn.trim() || null,
      image_url: f.image_url.trim() || null,
      combo_price: Number(f.combo_price),
      compare_at_price: f.compare_at_price ? Number(f.compare_at_price) : null,
      badge_en: f.badge_en.trim() || null, badge_bn: f.badge_bn.trim() || null,
      free_delivery: f.free_delivery, is_active: f.is_active,
      sort_order: Number(f.sort_order) || 0,
      items: f.items.map((i) => ({ product_id: i.product_id, quantity: Math.max(1, i.quantity) })),
    };
    try {
      if (form.id) await combosApi.update(form.id, payload);
      else await combosApi.create(payload);
      toast("success", form.id ? "কম্বো আপডেট হয়েছে" : "কম্বো তৈরি হয়েছে");
      setOpen(false);
      load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "সেভ করা যায়নি"));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!delId) return;
    try {
      await combosApi.delete(delId);
      toast("success", "কম্বো মুছে ফেলা হয়েছে");
      setCombos((cs) => cs.filter((c) => c.id !== delId));
    } catch (e) {
      toast("error", apiErrorMessage(e, "মুছে ফেলা যায়নি"));
    } finally {
      setDelId(null);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Combo Packs"
        titleBn="কম্বো প্যাক"
        description="Sell several products together at one combo price — shown on the homepage"
        descriptionBn="একাধিক পণ্য একসাথে একটি কম্বো দামে বিক্রি করুন — হোমপেজে দেখাবে"
        actions={
          <button type="button" onClick={openNew} className="btn btn-brand btn-sm">
            <Plus className="w-4 h-4" /> নতুন কম্বো
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : combos.length === 0 ? (
        <div className="enterprise-card p-10 text-center text-muted">
          <Package className="w-8 h-8 mx-auto mb-3 text-brand-400" />
          এখনো কোনো কম্বো নেই। “নতুন কম্বো” দিয়ে শুরু করুন।
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {combos.map((c) => (
            <div key={c.id} className="enterprise-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-lg bg-brand-50 dark:bg-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                  ) : <Package className="w-6 h-6 text-brand-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-heading truncate">{c.title_bn || c.title_en}</p>
                  <p className="text-xs text-muted">{c.items?.length ?? 0} টি পণ্য · <b className="text-heading">{formatPrice(c.combo_price)}</b>{c.compare_at_price ? <> · <s>{formatPrice(c.compare_at_price)}</s></> : null}</p>
                  <p className="text-[11px] text-muted line-clamp-2 mt-0.5">{(c.items ?? []).map((i) => `${prodName.get(i.product_id) ?? "পণ্য"}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(" + ")}</p>
                  <div className="flex gap-1.5 mt-1">
                    {!c.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-muted">নিষ্ক্রিয়</span>}
                    {c.free_delivery && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">ফ্রি ডেলিভারি</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => openEdit(c)} className="btn btn-outline btn-sm flex-1 min-h-11"><Pencil className="w-3.5 h-3.5" /> সম্পাদনা</button>
                <button type="button" onClick={() => setDelId(c.id)} aria-label="মুছুন" className="btn btn-outline btn-sm min-h-11 min-w-11 text-red-600 border-red-200"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 max-[640px]:items-end max-[640px]:p-0">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-[var(--surface-card)] max-[640px]:my-0 max-[640px]:max-h-[94dvh] max-[640px]:max-w-none max-[640px]:overflow-y-auto max-[640px]:rounded-b-none max-[640px]:rounded-t-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] sticky top-0 bg-inherit rounded-t-2xl">
              <h2 className="font-bold text-heading">{form.id ? "কম্বো এডিট" : "নতুন কম্বো"}</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <BnEnText label="কম্বোর নাম" required bn={form.title_bn} en={form.title_en} onBn={(v) => set("title_bn", v)} onEn={(v) => set("title_en", v)} placeholderBn="যেমন: চার্জার + কেবল কম্বো" />
              <BnEnText label="বিবরণ (ঐচ্ছিক)" rows={2} bn={form.description_bn} en={form.description_en} onBn={(v) => set("description_bn", v)} onEn={(v) => set("description_en", v)} />
              <ImageUpload value={form.image_url} onChange={(u) => set("image_url", u)} label="কম্বো ছবি" folder="combos" purpose="combo" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="form-label">কম্বো দাম (৳) *</label><input type="number" className="input" value={form.combo_price} onChange={(e) => set("combo_price", e.target.value)} /></div>
                <div><label className="form-label">তুলনা দাম (৳) <span className="text-gray-400 font-normal text-xs">— কেটে দেখাবে</span></label><input type="number" className="input" value={form.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} placeholder="খালি = পণ্যের যোগফল" /></div>
              </div>
              <BnEnText label="ব্যাজ (ছবির কোণে ছোট লেখা — ঐচ্ছিক)" bn={form.badge_bn} en={form.badge_en} onBn={(v) => set("badge_bn", v)} onEn={(v) => set("badge_en", v)} placeholderBn="যেমন: ৳৫০০ সাশ্রয়" />
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm min-h-11"><input type="checkbox" className="w-5 h-5" checked={form.free_delivery} onChange={(e) => set("free_delivery", e.target.checked)} /> 🚚 ফ্রি ডেলিভারি</label>
                <label className="flex items-center gap-2 text-sm min-h-11"><input type="checkbox" className="w-5 h-5" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /> সাইটে দেখাবে</label>
                <div className="flex items-center gap-2 text-sm">ক্রম <input type="number" className="input w-20 py-1" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} /></div>
              </div>

              {/* Product lines — search to add (no long dropdown on phones) */}
              <div className="space-y-2">
                <label className="form-label !mb-0">কম্বোর পণ্য *</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={pick} onChange={(e) => setPick(e.target.value)} className="input w-full pl-9" placeholder="পণ্যের নাম লিখে খুঁজুন ও যোগ করুন…" aria-label="পণ্য খুঁজুন" />
                </div>
                {pick.trim() && (
                  <div className="rounded-xl border border-[var(--line)] divide-y divide-[var(--line)] max-h-60 overflow-y-auto">
                    {products.filter((p) => `${p.name_bn ?? ""} ${p.name_en}`.toLowerCase().includes(pick.trim().toLowerCase())).slice(0, 10).map((p) => {
                      const has = form.items.some((i) => i.product_id === p.id);
                      return (
                        <button key={p.id} type="button" disabled={has} onClick={() => { set("items", [...form.items, { product_id: p.id, quantity: 1 }]); setPick(""); }}
                          className="w-full flex items-center gap-2 px-3 min-h-11 text-left text-sm hover:bg-brand-50 dark:hover:bg-white/5 disabled:opacity-50">
                          {p.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover bg-white" />
                          ) : <Package className="w-5 h-5 text-gray-400" />}
                          <span className="flex-1 min-w-0 truncate">{p.name_bn || p.name_en}</span>
                          <span className="text-xs text-muted">{p.price != null ? `৳${p.price}` : ""}</span>
                          <span className="text-xs font-semibold text-brand-600">{has ? "যোগ আছে" : "+ যোগ"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.items.length === 0 ? (
                  <p className="text-xs text-muted">উপরে পণ্যের নাম লিখে অন্তত একটি পণ্য যোগ করুন।</p>
                ) : (
                  <div className="space-y-2">
                    {form.items.map((it, idx) => {
                      const p = products.find((x) => x.id === it.product_id);
                      return (
                        <div key={idx} className="flex items-center gap-2 rounded-xl border border-[var(--line)] p-2">
                          <span className="flex-1 min-w-0 text-sm"><span className="block truncate font-medium">{p ? (p.name_bn || p.name_en) : "পণ্য"}</span><span className="text-xs text-muted">{p?.price != null ? `৳${p.price} × ${it.quantity}` : ""}</span></span>
                          <button type="button" aria-label="কমান" onClick={() => setLine(idx, { quantity: Math.max(1, it.quantity - 1) })} className="min-h-10 min-w-10 rounded-lg border border-[var(--line)] flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                          <span className="w-6 text-center font-semibold">{it.quantity}</span>
                          <button type="button" aria-label="বাড়ান" onClick={() => setLine(idx, { quantity: it.quantity + 1 })} className="min-h-10 min-w-10 rounded-lg border border-[var(--line)] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                          <button type="button" aria-label="সরান" onClick={() => removeLine(idx)} className="min-h-10 min-w-10 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      );
                    })}
                    {(() => {
                      const sum = form.items.reduce((s2, it) => s2 + (products.find((x) => x.id === it.product_id)?.price || 0) * it.quantity, 0);
                      const price = Number(form.combo_price) || 0;
                      const save = sum - price;
                      return (
                        <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 text-sm space-y-2">
                          <p>আলাদা কিনলে মোট: <b>{formatPrice(sum)}</b>{price > 0 && <> · কম্বো দাম: <b>{formatPrice(price)}</b></>}</p>
                          {price > 0 && save > 0 && <p className="text-emerald-700 dark:text-emerald-300">🎉 গ্রাহকের সাশ্রয়: <b>{formatPrice(save)}</b> ({Math.round((save / sum) * 100)}%)</p>}
                          {price > 0 && save <= 0 && <p className="text-amber-700">⚠️ কম্বো দাম আলাদা দামের সমান বা বেশি — গ্রাহক সাশ্রয় পাবেন না।</p>}
                          <div className="flex flex-wrap gap-2">
                            {sum > 0 && <button type="button" onClick={() => set("compare_at_price", String(sum))} className="btn btn-outline btn-sm min-h-10 text-xs">আলাদা দাম “তুলনা দাম”-এ বসান</button>}
                            {price > 0 && save > 0 && <button type="button" onClick={() => { set("badge_bn", `৳${Math.round(save).toLocaleString("bn-BD")} সাশ্রয়`); set("badge_en", `Save ৳${Math.round(save)}`); }} className="btn btn-outline btn-sm min-h-10 text-xs">“সাশ্রয়” ব্যাজ বানান</button>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-[var(--line)] sticky bottom-0 bg-inherit rounded-b-2xl">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline btn-md flex-1">বাতিল</button>
              <button type="button" onClick={save} disabled={saving} className="btn btn-brand btn-md flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!delId}
        onCancel={() => setDelId(null)}
        onConfirm={doDelete}
        title="কম্বো মুছবেন?"
        message="এই কম্বোটি মুছে ফেলা হবে।"
        confirmLabel="মুছুন"
        variant="danger"
      />
    </div>
  );
}
