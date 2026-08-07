"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, Package } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImageUpload from "@/components/admin/ImageUpload";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { combosApi, productsApi, type Combo } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { formatPrice } from "@/lib/utils";

interface ProdLite { id: string; name_en: string; name_bn?: string; price?: number }
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        combosApi.adminList(),
        productsApi.adminList({ per_page: 200 }),
      ]);
      setCombos(c.data.data ?? []);
      setProducts((p.data.data ?? []) as ProdLite[]);
    } catch (e) {
      toast("error", apiErrorMessage(e, "লোড করা যায়নি"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const prodName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(p.id, p.name_en);
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
    const first = products.find((p) => !form.items.some((i) => i.product_id === p.id));
    if (!first) { toast("info", "সব পণ্য যোগ করা হয়েছে"); return; }
    set("items", [...form.items, { product_id: first.id, quantity: 1 }]);
  };
  const setLine = (idx: number, patch: Partial<Line>) =>
    set("items", form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeLine = (idx: number) => set("items", form.items.filter((_, i) => i !== idx));

  const save = async () => {
    if (!form.title_en.trim() || !form.title_bn.trim()) { toast("error", "শিরোনাম (EN ও BN) দিন"); return; }
    if (!form.combo_price || Number(form.combo_price) <= 0) { toast("error", "কম্বো দাম দিন"); return; }
    if (form.items.length === 0) { toast("error", "অন্তত একটি পণ্য যোগ করুন"); return; }
    setSaving(true);
    const payload: Partial<Combo> = {
      title_en: form.title_en.trim(), title_bn: form.title_bn.trim(),
      description_en: form.description_en.trim() || null,
      description_bn: form.description_bn.trim() || null,
      image_url: form.image_url.trim() || null,
      combo_price: Number(form.combo_price),
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      badge_en: form.badge_en.trim() || null, badge_bn: form.badge_bn.trim() || null,
      free_delivery: form.free_delivery, is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      items: form.items.map((i) => ({ product_id: i.product_id, quantity: Math.max(1, i.quantity) })),
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
    <div>
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
                  <p className="text-xs text-muted">{c.items?.length ?? 0} টি পণ্য · {formatPrice(c.combo_price)}</p>
                  <div className="flex gap-1.5 mt-1">
                    {!c.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-muted">নিষ্ক্রিয়</span>}
                    {c.free_delivery && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">ফ্রি ডেলিভারি</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => openEdit(c)} className="btn btn-outline btn-sm flex-1"><Pencil className="w-3.5 h-3.5" /> এডিট</button>
                <button type="button" onClick={() => setDelId(c.id)} className="btn btn-outline btn-sm text-red-600 border-red-200"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="w-full max-w-2xl my-8 rounded-2xl bg-white dark:bg-[var(--surface-card)] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] sticky top-0 bg-inherit rounded-t-2xl">
              <h2 className="font-bold text-heading">{form.id ? "কম্বো এডিট" : "নতুন কম্বো"}</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">শিরোনাম (EN) *</label><input className="input" value={form.title_en} onChange={(e) => set("title_en", e.target.value)} /></div>
                <div><label className="form-label">শিরোনাম (বাংলা) *</label><input className="input" value={form.title_bn} onChange={(e) => set("title_bn", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">বিবরণ (EN)</label><textarea className="input" rows={2} value={form.description_en} onChange={(e) => set("description_en", e.target.value)} /></div>
                <div><label className="form-label">বিবরণ (বাংলা)</label><textarea className="input" rows={2} value={form.description_bn} onChange={(e) => set("description_bn", e.target.value)} /></div>
              </div>
              <ImageUpload value={form.image_url} onChange={(u) => set("image_url", u)} label="কম্বো ছবি" folder="combos" />
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">কম্বো দাম (৳) *</label><input type="number" className="input" value={form.combo_price} onChange={(e) => set("combo_price", e.target.value)} /></div>
                <div><label className="form-label">তুলনা দাম (৳)</label><input type="number" className="input" value={form.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} placeholder="খালি = পণ্যের যোগফল" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">ব্যাজ (EN)</label><input className="input" value={form.badge_en} onChange={(e) => set("badge_en", e.target.value)} placeholder="Save ৳500" /></div>
                <div><label className="form-label">ব্যাজ (বাংলা)</label><input className="input" value={form.badge_bn} onChange={(e) => set("badge_bn", e.target.value)} placeholder="৳৫০০ সাশ্রয়" /></div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.free_delivery} onChange={(e) => set("free_delivery", e.target.checked)} /> ফ্রি ডেলিভারি</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /> সক্রিয়</label>
                <div className="flex items-center gap-2 text-sm">ক্রম <input type="number" className="input w-20 py-1" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} /></div>
              </div>

              {/* Product lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label !mb-0">কম্বোর পণ্য *</label>
                  <button type="button" onClick={addLine} className="btn btn-outline btn-sm"><Plus className="w-3.5 h-3.5" /> পণ্য যোগ</button>
                </div>
                {form.items.length === 0 ? (
                  <p className="text-xs text-muted">অন্তত একটি পণ্য যোগ করুন।</p>
                ) : (
                  <div className="space-y-2">
                    {form.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select className="input flex-1" value={it.product_id} onChange={(e) => setLine(idx, { product_id: e.target.value })}>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name_en}{p.price != null ? ` — ৳${p.price}` : ""}</option>)}
                        </select>
                        <input type="number" min={1} className="input w-20" value={it.quantity} onChange={(e) => setLine(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                        <button type="button" onClick={() => removeLine(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted">পণ্যের যোগফল: {formatPrice(form.items.reduce((s, it) => { const p = products.find((x) => x.id === it.product_id); return s + (p?.price || 0) * it.quantity; }, 0))} {prodName.size ? "" : ""}</p>
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
