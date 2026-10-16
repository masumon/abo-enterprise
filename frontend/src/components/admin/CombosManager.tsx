"use client";

import LivePreview from "@/components/admin/LivePreview";
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
import { useLanguageStore } from "@/store/language";

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

/** Combo packs manager — lives in Offers (Coupons, Flash Sale, Combos). `embedded`
 * swaps the page header for a compact toolbar. Rule: the homepage combo section
 * shows only when at least one combo is active. */
export default function CombosManager({ embedded = false }: { embedded?: boolean } = {}) {
  const toast = useToastStore((s) => s.push);
  const lang = useLanguageStore((s) => s.lang);
  const bn = lang === "bn";
  const tx = useCallback((english: string, bangla: string) => (bn ? bangla : english), [bn]);
  const productName = useCallback((p?: ProdLite | null): string => {
    if (!p) return tx("Product", "পণ্য");
    const name = bn ? (p.name_bn || p.name_en) : (p.name_en || p.name_bn);
    return name || tx("Product", "পণ্য");
  }, [bn, tx]);
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
      toast("error", apiErrorMessage(e, tx("Could not load products", "পণ্য লোড করা যায়নি")));
    }
  }, [toast, tx]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await combosApi.adminList();
      setCombos(c.data.data ?? []);
    } catch (e) {
      toast("error", apiErrorMessage(e, tx("Could not load combo packs. Try again later.", "কম্বো লোড করা যায়নি — একটু পরে আবার চেষ্টা করুন, সমস্যা থাকলে ডেভেলপারকে জানান।")));
    } finally {
      setLoading(false);
    }
    await loadProducts();
  }, [toast, loadProducts, tx]);

  useEffect(() => { load(); }, [load]);

  const prodName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(p.id, productName(p));
    return m;
  }, [products, productName]);

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
    if (products.length === 0) { toast("error", tx("No products found — create a product first", "কোনো পণ্য পাওয়া যায়নি — আগে পণ্য তৈরি করুন")); return; }
    const first = products.find((p) => !form.items.some((i) => i.product_id === p.id));
    if (!first) { toast("info", tx("All products have already been added", "সব পণ্য ইতিমধ্যে যোগ করা হয়েছে")); return; }
    set("items", [...form.items, { product_id: first.id, quantity: 1 }]);
  };
  const setLine = (idx: number, patch: Partial<Line>) =>
    set("items", form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeLine = (idx: number) => set("items", form.items.filter((_, i) => i !== idx));

  const save = async () => {
    if (!form.title_en.trim() && !form.title_bn.trim()) { toast("error", tx("Enter a title (Bangla can be translated automatically)", "শিরোনাম দিন (বাংলা লিখলে অটো-অনুবাদ হবে)")); return; }
    if (!form.combo_price || Number(form.combo_price) <= 0) { toast("error", tx("Enter a combo price", "কম্বো দাম দিন")); return; }
    if (form.items.length === 0) { toast("error", tx("Add at least one product", "অন্তত একটি পণ্য যোগ করুন")); return; }
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
      toast("error", tx("Automatic translation failed — enter English manually or use Translate to English", "অটো-অনুবাদ ব্যর্থ — English নিজে লিখুন বা → English চাপুন"));
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
      toast("success", form.id ? tx("Combo pack updated", "কম্বো আপডেট হয়েছে") : tx("Combo pack created", "কম্বো তৈরি হয়েছে"));
      setOpen(false);
      load();
    } catch (e) {
      toast("error", apiErrorMessage(e, tx("Could not save changes", "সেভ করা যায়নি")));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!delId) return;
    try {
      await combosApi.delete(delId);
      toast("success", tx("Combo pack deleted", "কম্বো মুছে ফেলা হয়েছে"));
      setCombos((cs) => cs.filter((c) => c.id !== delId));
    } catch (e) {
      toast("error", apiErrorMessage(e, tx("Could not delete combo pack", "মুছে ফেলা যায়নি")));
    } finally {
      setDelId(null);
    }
  };

  return (
    <div className={embedded ? "space-y-4" : "admin-page"}>
      {embedded ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openNew} className="btn btn-brand btn-sm min-h-11 gap-1.5"><Plus className="w-4 h-4" aria-hidden /> {tx("New combo", "নতুন কম্বো")}</button>
          <p className="text-sm text-muted">{tx("Bundle products at one price. The homepage combo section appears when at least one combo is active.", "কয়েকটি পণ্য একসাথে এক দামে। অন্তত ১টি কম্বো চালু থাকলে হোমপেজে “কম্বো প্যাক” অংশ দেখাবে।")}</p>
        </div>
      ) : <AdminPageHeader
        title="Combo Packs"
        titleBn="কম্বো প্যাক"
        description="Sell several products together at one combo price — shown on the homepage"
        descriptionBn="একাধিক পণ্য একসাথে একটি কম্বো দামে বিক্রি করুন — হোমপেজে দেখাবে"
        actions={
          <button type="button" onClick={openNew} className="btn btn-brand btn-sm">
            <Plus className="w-4 h-4" /> {tx("New combo", "নতুন কম্বো")}
          </button>
        }
     />}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : combos.length === 0 ? (
        <div className="enterprise-card p-10 text-center text-muted">
          <Package className="w-8 h-8 mx-auto mb-3 text-brand-400" />
          {tx("No combo packs yet. Start by creating a new combo.", "এখনো কোনো কম্বো নেই। “নতুন কম্বো” দিয়ে শুরু করুন।")}
        </div>
      ) : (
        <div className="admin-fill-grid grid grid-cols-1 gap-4">
          {combos.map((c) => (
            <div key={c.id} className="enterprise-card min-w-0 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="w-14 h-14 rounded-lg bg-brand-50 dark:bg-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                  ) : <Package className="w-6 h-6 text-brand-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="break-words font-bold text-heading">{bn ? c.title_bn || c.title_en : c.title_en || c.title_bn}</p>
                  <p className="text-xs text-muted">{c.items?.length ?? 0} {tx("products", "টি পণ্য")} · <b className="text-heading">{formatPrice(c.combo_price)}</b>{c.compare_at_price ? <> · <s>{formatPrice(c.compare_at_price)}</s></> : null}</p>
                  <p className="mt-0.5 break-words text-[11px] text-muted">{(c.items ?? []).map((i) => `${prodName.get(i.product_id) ?? tx("Product", "পণ্য")}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(" + ")}</p>
                  <div className="flex gap-1.5 mt-1">
                    {!c.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-muted">{tx("Inactive", "নিষ্ক্রিয়")}</span>}
                    {c.free_delivery && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{tx("Free delivery", "ফ্রি ডেলিভারি")}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => openEdit(c)} className="btn btn-outline btn-sm min-h-11 min-w-0 flex-1 basis-28"><Pencil className="w-3.5 h-3.5" /> {tx("Edit", "সম্পাদনা")}</button>
                <button type="button" onClick={() => setDelId(c.id)} aria-label={tx("Delete combo pack", "কম্বো মুছুন")} className="btn btn-outline btn-sm min-h-11 min-w-11 text-red-600 border-red-200"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="admin-overlay admin-overlay--panel fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 max-[640px]:items-end max-[640px]:p-0">
          <div className="admin-sheet admin-sheet--l my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-[var(--surface-card)] max-[640px]:my-0 max-[640px]:max-h-[94dvh] max-[640px]:max-w-none max-[640px]:overflow-y-auto max-[640px]:rounded-b-none max-[640px]:rounded-t-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] sticky top-0 bg-inherit rounded-t-2xl">
              <h2 className="break-words font-bold text-heading">{form.id ? tx("Edit combo pack", "কম্বো সম্পাদনা") : tx("New combo pack", "নতুন কম্বো")}</h2>
              <button aria-label={tx("Close", "বন্ধ করুন")} type="button" onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="min-w-0 space-y-4 p-4 sm:p-5">
              <LivePreview showDevice={false}>
                <div className="pointer-events-none rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 overflow-hidden max-w-xs mx-auto">
                  {form.image_url ? <img src={form.image_url} alt="" className="w-full h-32 object-cover" /> : <div className="h-32 bg-brand-50 dark:bg-white/5" />}
                  <div className="p-3 space-y-1">
                    {(form.badge_bn || form.badge_en) && <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-500 text-[#14182b]">{bn ? form.badge_bn || form.badge_en : form.badge_en || form.badge_bn}</span>}
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{(bn ? form.title_bn || form.title_en : form.title_en || form.title_bn) || "কম্বোর নাম এখানে দেখাবে"}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{form.items.length.toLocaleString("bn-BD")}টি পণ্য</p>
                    <p className="font-bold text-brand-700 dark:text-brand-300">৳{Number(form.combo_price || 0).toLocaleString("bn-BD")} {form.compare_at_price && <span className="text-xs font-normal text-gray-500 line-through">৳{Number(form.compare_at_price).toLocaleString("bn-BD")}</span>}</p>
                  </div>
                </div>
              </LivePreview>
              <BnEnText label={tx("Combo name", "কম্বোর নাম")} required bn={form.title_bn} en={form.title_en} onBn={(v) => set("title_bn", v)} onEn={(v) => set("title_en", v)} placeholderBn={tx("e.g. Charger + cable combo", "যেমন: চার্জার + কেবল কম্বো")} />
              <BnEnText label={tx("Description (optional)", "বিবরণ (ঐচ্ছিক)")} rows={2} bn={form.description_bn} en={form.description_en} onBn={(v) => set("description_bn", v)} onEn={(v) => set("description_en", v)} />
              <ImageUpload value={form.image_url} onChange={(u) => set("image_url", u)} label={tx("Combo image", "কম্বো ছবি")} folder="combos" purpose="combo" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="form-label">{tx("Combo price (৳)", "কম্বো দাম (৳)")} *</label><input type="number" className="input" value={form.combo_price} onChange={(e) => set("combo_price", e.target.value)} /></div>
                <div><label className="form-label">{tx("Compare-at price (৳)", "তুলনা দাম (৳)")} <span className="text-muted font-normal text-xs">— {tx("shown crossed out", "কেটে দেখাবে")}</span></label><input type="number" className="input" value={form.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} placeholder={tx("Blank = sum of product prices", "খালি = পণ্যের যোগফল")} /></div>
              </div>
              <BnEnText label={tx("Badge (small text on image — optional)", "ব্যাজ (ছবির কোণে ছোট লেখা — ঐচ্ছিক)")} bn={form.badge_bn} en={form.badge_en} onBn={(v) => set("badge_bn", v)} onEn={(v) => set("badge_en", v)} placeholderBn={tx("e.g. Save ৳500", "যেমন: ৳৫০০ সাশ্রয়")} />
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm min-h-11"><input type="checkbox" className="w-5 h-5" checked={form.free_delivery} onChange={(e) => set("free_delivery", e.target.checked)} /> 🚚 {tx("Free delivery", "ফ্রি ডেলিভারি")}</label>
                <label className="flex items-center gap-2 text-sm min-h-11"><input type="checkbox" className="w-5 h-5" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} /> {tx("Visible on site", "সাইটে দেখাবে")}</label>
                <div className="flex items-center gap-2 text-sm">{tx("Sort order", "ক্রম")} <input type="number" className="input w-20 py-1" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} /></div>
              </div>

              {/* Product lines — search to add (no long dropdown on phones) */}
              <div className="space-y-2">
                <label className="form-label !mb-0">{tx("Combo products", "কম্বোর পণ্য")} *</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={pick} onChange={(e) => setPick(e.target.value)} className="input w-full pl-9" placeholder={tx("Search product names to add…", "পণ্যের নাম লিখে খুঁজুন ও যোগ করুন…")} aria-label={tx("Search products", "পণ্য খুঁজুন")} />
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
                          <span className="flex-1 min-w-0 truncate">{productName(p)}</span>
                          <span className="text-xs text-muted">{p.price != null ? `৳${p.price}` : ""}</span>
                          <span className="text-xs font-semibold text-brand-600">{has ? tx("Added", "যোগ আছে") : tx("+ Add", "+ যোগ")}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.items.length === 0 ? (
                  <p className="text-xs text-muted">{tx("Search above and add at least one product.", "উপরে পণ্যের নাম লিখে অন্তত একটি পণ্য যোগ করুন।")}</p>
                ) : (
                  <div className="space-y-2">
                    {form.items.map((it, idx) => {
                      const p = products.find((x) => x.id === it.product_id);
                      return (
                        <div key={idx} className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] p-2 sm:flex-nowrap">
                          <span className="min-w-0 flex-1 text-sm"><span className="block truncate font-medium">{productName(p)}</span><span className="text-xs text-muted">{p?.price != null ? `৳${p.price} × ${it.quantity}` : ""}</span></span>
                          <button type="button" aria-label={tx("Decrease quantity", "কমান")} onClick={() => setLine(idx, { quantity: Math.max(1, it.quantity - 1) })} className="min-h-10 min-w-10 rounded-lg border border-[var(--line)] flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                          <span className="w-6 shrink-0 text-center font-semibold">{it.quantity}</span>
                          <button type="button" aria-label={tx("Increase quantity", "বাড়ান")} onClick={() => setLine(idx, { quantity: it.quantity + 1 })} className="min-h-10 min-w-10 rounded-lg border border-[var(--line)] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                          <button type="button" aria-label={tx("Remove product", "সরান")} onClick={() => removeLine(idx)} className="min-h-10 min-w-10 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      );
                    })}
                    {(() => {
                      const sum = form.items.reduce((s2, it) => s2 + (products.find((x) => x.id === it.product_id)?.price || 0) * it.quantity, 0);
                      const price = Number(form.combo_price) || 0;
                      const save = sum - price;
                      return (
                        <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 text-sm space-y-2">
                          <p>{tx("Total purchased separately:", "আলাদা কিনলে মোট:")} <b>{formatPrice(sum)}</b>{price > 0 && <> · {tx("Combo price:", "কম্বো দাম:")} <b>{formatPrice(price)}</b></>}</p>
                          {price > 0 && save > 0 && <p className="text-emerald-700 dark:text-emerald-300">🎉 {tx("Customer saves:", "গ্রাহকের সাশ্রয়:")} <b>{formatPrice(save)}</b> ({Math.round((save / sum) * 100)}%)</p>}
                          {price > 0 && save <= 0 && <p className="text-amber-700">⚠️ {tx("The combo price is equal to or higher than the separate total; customers will not save.", "কম্বো দাম আলাদা দামের সমান বা বেশি — গ্রাহক সাশ্রয় পাবেন না।")}</p>}
                          <div className="flex flex-wrap gap-2">
                            {sum > 0 && <button type="button" onClick={() => set("compare_at_price", String(sum))} className="btn btn-outline btn-sm min-h-10 text-xs">{tx("Use separate total as compare-at price", "আলাদা দাম “তুলনা দাম”-এ বসান")}</button>}
                            {price > 0 && save > 0 && <button type="button" onClick={() => { set("badge_bn", `৳${Math.round(save).toLocaleString("bn-BD")} সাশ্রয়`); set("badge_en", `Save ৳${Math.round(save)}`); }} className="btn btn-outline btn-sm min-h-10 text-xs">{tx("Create savings badge", "“সাশ্রয়” ব্যাজ বানান")}</button>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 flex gap-2 border-t border-[var(--line)] bg-inherit px-5 py-4 rounded-b-2xl">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline btn-md min-h-11 min-w-0 flex-1">{tx("Cancel", "বাতিল")}</button>
              <button type="button" onClick={save} disabled={saving} className="btn btn-brand btn-md flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {tx("Save", "সেভ করুন")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!delId}
        onCancel={() => setDelId(null)}
        onConfirm={doDelete}
        title={tx("Delete combo pack?", "কম্বো মুছবেন?")}
        message={tx("This combo pack will be deleted.", "এই কম্বোটি মুছে ফেলা হবে।")}
        confirmLabel={tx("Delete", "মুছুন")}
        variant="danger"
      />
    </div>
  );
}
