"use client";

import { formatDhakaBn } from "@/lib/flashSale";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import TranslateButton from "@/components/admin/TranslateButton";
import ImageUpload from "@/components/admin/ImageUpload";
import { useSearchParams } from "next/navigation";
import { Package, Plus, Search, Archive, RefreshCw, ArrowDown, ArrowUp, History, Tags, Loader2 } from "lucide-react";
import { brandsApi, inventoryApi, type Brand, type InventoryItem, type InventoryMovement } from "@/lib/brandsInventoryApi";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { asArray, asNumber, asObject } from "@/lib/safeData";

type Tab = "inventory" | "brands";

export default function AdminInventoryPage() {
  const toast = useToastStore((s) => s.push);
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "brands" ? "brands" : "inventory");
  const [summary, setSummary] = useState({ products: 0, low_stock: 0, out_of_stock: 0, units: 0 });
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [adjusting, setAdjusting] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [movementType, setMovementType] = useState("adjustment");
  const [brandModal, setBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState({ slug: "", name_en: "", name_bn: "", description_en: "", description_bn: "", logo_url: "", website_url: "", sort_order: 0, is_active: true });
  const [archiveBrand, setArchiveBrand] = useState<Brand | null>(null);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([inventoryApi.summary(), inventoryApi.list({ search: search || undefined, per_page: 100 })]);
      const sum = asObject<typeof summary>(s?.data?.data);
      setSummary({ products: asNumber(sum.products), low_stock: asNumber(sum.low_stock), out_of_stock: asNumber(sum.out_of_stock), units: asNumber(sum.units) });
      setItems(asArray<InventoryItem>(r?.data?.data).filter((p) => p && typeof p === "object"));
    } catch (e) {
      toast("error", apiErrorMessage(e, "স্টক আনা যায়নি"));
    } finally { setLoading(false); }
  };

  const loadBrands = async () => {
    setLoading(true);
    try {
      const r = await brandsApi.list({ search: search || undefined, include_inactive: true, per_page: 100 });
      setBrands(asArray<Brand>(r?.data?.data).filter((b) => b && typeof b === "object"));
    } catch (e) {
      toast("error", apiErrorMessage(e, "ব্র্যান্ড আনা যায়নি"));
    } finally { setLoading(false); }
  };

  const reload = () => (tab === "inventory" ? loadInventory() : loadBrands());
  useEffect(() => { reload(); }, [tab]);
  useEffect(() => { setTab(searchParams.get("tab") === "brands" ? "brands" : "inventory"); }, [searchParams]);

  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const shownItems = useMemo(() => items.filter((p) => stockFilter === "all" ? true : stockFilter === "out" ? p.stock_quantity <= 0 : p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold), [items, stockFilter]);
  const lowStock = useMemo(() => items.filter((p) => p.stock_quantity <= p.low_stock_threshold).length, [items]);

  const openMovements = async (item: InventoryItem) => {
    setSelected(item);
    try {
      const r = await inventoryApi.movements(item.id);
      setMovements(asArray<InventoryMovement>(r?.data?.data));
    } catch (e) {
      toast("error", apiErrorMessage(e, "স্টকের ইতিহাস আনা যায়নি"));
    }
  };

  const submitAdjustment = async () => {
    const amount = Number(delta);
    if (!Number.isInteger(amount) || amount === 0 || !reason.trim() || !selected) return;
    setAdjusting(true);
    try {
      await inventoryApi.adjust(selected.id, { delta: amount, movement_type: movementType, reason: reason.trim() });
      setDelta(""); setReason("");
      await loadInventory();
      const fresh = items.find((p) => p.id === selected.id);
      await openMovements(fresh ? { ...fresh, stock_quantity: fresh.stock_quantity + amount } : selected);
      toast("success", "স্টক আপডেট হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "স্টক বদলানো যায়নি"));
    } finally { setAdjusting(false); }
  };

  const openBrand = (brand?: Brand) => {
    setEditingBrand(brand ?? null);
    setBrandForm(brand ? {
      slug: brand.slug, name_en: brand.name_en, name_bn: brand.name_bn ?? "", description_en: brand.description_en ?? "", description_bn: brand.description_bn ?? "",
      logo_url: brand.logo_url ?? "", website_url: brand.website_url ?? "", sort_order: brand.sort_order, is_active: brand.is_active,
    } : { slug: "", name_en: "", name_bn: "", description_en: "", description_bn: "", logo_url: "", website_url: "", sort_order: 0, is_active: true });
    setBrandModal(true);
  };

  const saveBrand = async () => {
    const payload = { ...brandForm, name_bn: brandForm.name_bn || null, description_en: brandForm.description_en || null, description_bn: brandForm.description_bn || null, logo_url: brandForm.logo_url || null, website_url: brandForm.website_url || null };
    try {
      if (editingBrand) await brandsApi.update(editingBrand.id, payload); else await brandsApi.create(payload);
      setBrandModal(false); await loadBrands();
      toast("success", editingBrand ? "ব্র্যান্ড আপডেট হয়েছে" : "ব্র্যান্ড তৈরি হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "ব্র্যান্ড সেভ হয়নি"));
    }
  };

  const confirmArchive = async () => {
    if (!archiveBrand) return;
    try {
      await brandsApi.archive(archiveBrand.id); setArchiveBrand(null); await loadBrands();
      toast("success", "ব্র্যান্ড আর্কাইভ হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "আর্কাইভ করা যায়নি"));
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader title="Inventory & Product Brands" titleBn="স্টক ও পণ্যের ব্র্যান্ড" description="Real stock balances, movement history, low-stock monitoring and product brands (e.g. Samsung)." descriptionBn="কোন পণ্য কতটা আছে, স্টকের ইতিহাস, আর পণ্যের ব্র্যান্ড (যেমন Samsung, Xiaomi)। হোমপেজের ক্লায়েন্ট/পার্টনার লোগো এখানে নয় — সেটি ‘আমাদের সম্পর্কে ও বিশ্বাস’ পাতায়।" />
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-white/10" role="tablist" aria-label="Inventory sections">
        <button role="tab" aria-selected={tab === "inventory"} className={`min-h-11 shrink-0 px-4 py-2 font-medium ${tab === "inventory" ? "border-b-2 border-brand text-brand" : "text-muted"}`} onClick={() => setTab("inventory")}>স্টক</button>
        <button role="tab" aria-selected={tab === "brands"} className={`min-h-11 shrink-0 px-4 py-2 font-medium ${tab === "brands" ? "border-b-2 border-brand text-brand" : "text-muted"}`} onClick={() => setTab("brands")}>পণ্যের ব্র্যান্ড</button>
      </div>

      {tab === "inventory" ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="মোট পণ্য" value={summary.products} icon={<Package className="w-4 h-4" />} />
            <Stat label="মোট পিস স্টকে" value={summary.units} icon={<Package className="w-4 h-4" />} />
            <Stat label="কম স্টক" value={summary.low_stock} icon={<ArrowDown className="w-4 h-4" />} />
            <Stat label="স্টক শেষ" value={summary.out_of_stock} icon={<ArrowDown className="w-4 h-4" />} />
          </div>
          <AdminToolbar>
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><input className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f1a2e]" placeholder="পণ্য, SKU বা ব্র্যান্ড খুঁজুন" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadInventory()} /></div>
            <button className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 p-2 dark:border-white/10" onClick={loadInventory} aria-label="রিফ্রেশ"><RefreshCw className="w-4 h-4" /></button>
          </AdminToolbar>
          <div className="flex gap-1.5 overflow-x-auto">
            {([["all", "সব"], ["low", `⚠️ কম স্টক (${lowStock})`], ["out", `⛔ স্টক শেষ (${items.filter((p) => p.stock_quantity <= 0).length})`]] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setStockFilter(k)} className={`shrink-0 rounded-full border px-3 min-h-10 text-sm ${stockFilter === k ? "bg-brand-600 text-white border-brand-600 font-semibold" : "border-gray-200 dark:border-white/10"}`}>{label}</button>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
            <div className="space-y-3 p-3 min-[641px]:hidden">
              {shownItems.map((p) => {
                const isOut = p.stock_quantity <= 0;
                const isLow = !isOut && p.stock_quantity <= p.low_stock_threshold;
                return (
                  <article key={p.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f1a2e]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-heading">{p.name_bn || p.name_en}</h3>
                        {p.name_bn && <p className="mt-0.5 break-words text-xs text-muted">{p.name_en}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${isOut ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : isLow ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>
                        {isOut ? "স্টক শেষ" : isLow ? "কম স্টক" : "স্টকে আছে"}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                      <div className="min-w-0"><dt className="text-[11px] font-medium uppercase tracking-wide text-muted">SKU</dt><dd className="mt-1 break-words text-sm">{p.sku || "—"}</dd></div>
                      <div className="min-w-0"><dt className="text-[11px] font-medium uppercase tracking-wide text-muted">ব্র্যান্ড</dt><dd className="mt-1 break-words text-sm">{p.brand || "—"}</dd></div>
                      <div><dt className="text-[11px] font-medium uppercase tracking-wide text-muted">স্টকে আছে</dt><dd className="mt-1 text-lg font-bold text-heading">{p.stock_quantity}</dd></div>
                      <div><dt className="text-[11px] font-medium uppercase tracking-wide text-muted">এর নিচে নামলে সতর্কতা</dt><dd className="mt-1 text-sm">{p.low_stock_threshold}</dd></div>
                    </dl>
                    <button className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium dark:border-white/10" onClick={() => openMovements(p)}><History className="h-4 w-4" /> স্টক বদলান / ইতিহাস</button>
                  </article>
                );
              })}
            </div>
            <div className="hidden min-[641px]:block overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead><tr className="border-b border-gray-200 text-left dark:border-white/10"><th className="p-3">পণ্য</th><th className="p-3">SKU</th><th className="p-3">ব্র্যান্ড</th><th className="p-3">স্টক</th><th className="p-3">সতর্কতা সীমা</th><th className="p-3"></th></tr></thead>
                <tbody>{shownItems.map((p) => <tr key={p.id} className="border-b border-gray-100 dark:border-white/10"><td className="p-3"><div className="font-medium">{p.name_en}</div><div className="text-xs text-muted">{p.name_bn}</div></td><td className="p-3">{p.sku || "—"}</td><td className="p-3">{p.brand || "—"}</td><td className="p-3"><span className="font-semibold">{p.stock_quantity}</span></td><td className="p-3">{p.low_stock_threshold}</td><td className="p-3"><button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10" onClick={() => openMovements(p)}><History className="h-3.5 w-3.5" /> স্টক বদলান</button></td></tr>)}</tbody>
              </table>
            </div>
            {loading && <div className="flex items-center justify-center gap-2 p-8 text-muted"><Loader2 className="h-4 w-4 animate-spin" /> লোড হচ্ছে…</div>}
            {!items.length && !loading && <div className="p-4"><AdminEmptyState icon={Package} title="কোনো পণ্য নেই" description="আগে পণ্য যোগ করুন — স্টক এখানে নিজে থেকে দেখাবে।" /></div>}
          </div>

          {selected && <div className="admin-overlay admin-overlay--panel fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={() => setSelected(null)}><div role="dialog" aria-modal="true" aria-label="স্টক বদলান" onClick={(e) => e.stopPropagation()} className="admin-sheet admin-sheet--m w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#0f1a2e] border border-gray-200 dark:border-white/10 p-4 space-y-4">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="font-semibold break-words">{selected.name_bn || selected.name_en}</h2><p className="text-sm text-muted">এখন স্টকে আছে: <b className="text-heading text-base">{selected.stock_quantity}</b> পিস</p></div><button className="min-h-11 min-w-11 rounded-lg border border-gray-200 dark:border-white/10 px-3 text-sm" onClick={() => setSelected(null)}>বন্ধ</button></div>
            <div className="flex flex-wrap gap-1.5">{[["purchase", "📦 নতুন মাল এসেছে", 1], ["adjustment", "🛒 দোকানে বিক্রি", -1], ["return", "↩️ গ্রাহক ফেরত দিয়েছে", 1], ["damage", "💔 নষ্ট/ক্ষতিগ্রস্ত", -1], ["correction", "🔢 গুনে ঠিক করা", 0]].map(([t, label, sign]) => (
              <button key={String(label)} type="button" onClick={() => { setMovementType(String(t)); setReason(String(label).replace(/^\S+\s/, "")); if (sign) setDelta((d) => { const n = Math.abs(Number(d) || 1); return String(Number(sign) * n); }); }}
                className={`rounded-full border px-3 min-h-10 text-xs ${reason === String(label).replace(/^\S+\s/, "") ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200 font-semibold" : "border-gray-200 dark:border-white/10"}`}>{String(label)}</button>
            ))}</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select className="rounded-lg border border-gray-200 dark:border-white/10 p-2 bg-white dark:bg-[#0f1a2e]" value={movementType} onChange={(e) => setMovementType(e.target.value)}><option value="adjustment">সাধারণ পরিবর্তন / বিক্রি</option><option value="purchase">নতুন মাল কেনা</option><option value="return">ফেরত</option><option value="damage">নষ্ট/ক্ষতি</option><option value="correction">গণনা ঠিক করা</option></select>
              <input className="rounded-lg border border-gray-200 dark:border-white/10 p-2 bg-white dark:bg-[#0f1a2e]" type="number" step="1" placeholder="কত পিস (যোগ +, কমাতে −)" inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value)} />
              <input className="rounded-lg border border-gray-200 dark:border-white/10 p-2 bg-white dark:bg-[#0f1a2e] md:col-span-2" placeholder="কারণ লিখুন (আবশ্যক)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button className="md:col-span-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 text-white py-2 disabled:opacity-50" disabled={adjusting} onClick={submitAdjustment}>{Number(delta) >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />} {adjusting ? "সেভ হচ্ছে…" : Number(delta) < 0 ? `${Math.abs(Number(delta))} পিস কমান` : Number(delta) > 0 ? `${Number(delta)} পিস যোগ করুন` : "স্টক বদলান"}</button>
            </div>
            <div className="max-h-64 overflow-auto border border-gray-200 dark:border-white/10 rounded-lg"><table className="w-full text-xs"><thead><tr className="border-b border-gray-200 dark:border-white/10 text-left"><th className="p-2">সময়</th><th className="p-2">ধরন</th><th className="p-2">পরিবর্তন</th><th className="p-2">এরপর স্টক</th><th className="p-2">কারণ</th></tr></thead><tbody>{movements.map((m) => <tr key={m.id} className="border-b border-gray-200 dark:border-white/10/50"><td className="p-2">{m.created_at ? formatDhakaBn(new Date(m.created_at)) : "—"}</td><td className="p-2">{m.movement_type}</td><td className="p-2">{m.quantity_delta > 0 ? "+" : ""}{m.quantity_delta}</td><td className="p-2">{m.quantity_after}</td><td className="p-2">{m.reason || "—"}</td></tr>)}</tbody></table></div>
          </div></div>}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <AdminToolbar><div className="relative w-full sm:min-w-[260px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" /><input className="min-h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 dark:border-white/10 dark:bg-[#0f1a2e]" placeholder="পণ্যের ব্র্যান্ড খুঁজুন" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadBrands()} /></div></AdminToolbar>
            <button className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-white sm:w-auto" onClick={() => openBrand()}><Plus className="h-4 w-4" /> নতুন পণ্যের ব্র্যান্ড</button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
            {brands.map((b) => (
              <article key={b.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f1a2e]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {b.logo_url ? <img src={b.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 bg-white object-contain p-1 dark:border-white/10 dark:bg-[#0f1a2e]" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"><Tags className="h-5 w-5 text-muted" /></div>}
                    <div className="min-w-0"><h3 className="break-words font-semibold text-heading">{b.name_en}</h3><p className="mt-0.5 break-words text-xs text-muted">{b.name_bn || b.slug}</p></div>
                  </div>
                  <StatusBadge status={b.is_active ? "active" : "inactive"} />
                </div>
                <dl className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-sm dark:bg-white/5">
                  <div className="min-w-0"><dt className="text-[11px] font-medium uppercase tracking-wide text-muted">ওয়েব ঠিকানা</dt><dd className="mt-1 break-words">{b.slug}</dd></div>
                  <div><dt className="text-[11px] font-medium uppercase tracking-wide text-muted">পণ্য</dt><dd className="mt-1 font-semibold">{b.product_count}</dd></div>
                </dl>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium dark:border-white/10" onClick={() => openBrand(b)}>সম্পাদনা</button>
                  <button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-500/30" onClick={() => setArchiveBrand(b)}><Archive className="h-4 w-4" /> Archive</button>
                </div>
              </article>
            ))}
          </div>
          {loading && <div className="p-8 flex items-center justify-center gap-2 text-muted"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>}
          {!brands.length && !loading && (
            <AdminEmptyState icon={Tags} title="কোনো পণ্যের ব্র্যান্ড নেই" description="পণ্য কোন কোম্পানির (যেমন Samsung) তা দেখাতে প্রথম ব্র্যান্ড যোগ করুন। ক্লায়েন্ট/পার্টনার লোগো ‘আমাদের সম্পর্কে ও বিশ্বাস’ পাতায়।" action={<button className="btn btn-brand btn-sm" onClick={() => openBrand()}>নতুন পণ্যের ব্র্যান্ড</button>} />
          )}
        </>
      )}

      {brandModal && <div className="admin-overlay admin-overlay--panel fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 max-[640px]:items-end max-[640px]:p-0"><div className="admin-sheet admin-sheet--m w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0f1a2e] p-5 shadow-xl space-y-4"><h2 className="text-lg font-semibold">{editingBrand ? "পণ্যের ব্র্যান্ড সম্পাদনা" : "নতুন পণ্যের ব্র্যান্ড"}</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[["slug","Slug"],["name_en","Name (English)"],["name_bn","Name (বাংলা)"],["website_url","Website URL"],["sort_order","Sort order"]].map(([key,label]) => <label key={key} className="text-sm space-y-1"><span>{label}</span><input className="min-h-11 w-full rounded-lg border border-gray-200 dark:border-white/10 p-2 bg-white dark:bg-[#0f1a2e]" value={key === "sort_order" ? (brandForm.sort_order || "") : (brandForm as Record<string, unknown>)[key] as string | number} placeholder={key === "sort_order" ? "0" : undefined} onChange={(e) => setBrandForm((v) => ({ ...v, [key]: key === "sort_order" ? Number(e.target.value) : e.target.value }))} disabled={key === "slug" && !!editingBrand} /></label>)}</div><div className="text-sm space-y-1"><span>ব্র্যান্ডের লোগো</span><ImageUpload value={brandForm.logo_url} onChange={(url) => setBrandForm((v) => ({ ...v, logo_url: url }))} folder="abo-enterprise/brands" purpose="brand-logo" previewSize="sm" /></div><div className="flex justify-end gap-2 flex-wrap"><TranslateButton bn={brandForm.name_bn} onResult={(t) => setBrandForm((v) => ({ ...v, name_en: t }))} en={brandForm.name_en} onResultBn={(t) => setBrandForm((v) => ({ ...v, name_bn: t }))} label="→ English (নাম)" /></div><label className="text-sm space-y-1 block"><span className="flex items-center justify-between gap-2">Description (English)<TranslateButton bn={brandForm.description_bn} onResult={(t) => setBrandForm((v) => ({ ...v, description_en: t }))} en={brandForm.description_en} onResultBn={(t) => setBrandForm((v) => ({ ...v, description_bn: t }))} /></span><textarea className="min-h-11 w-full rounded-lg border border-gray-200 dark:border-white/10 p-2 bg-white dark:bg-[#0f1a2e]" value={brandForm.description_en} onChange={(e) => setBrandForm((v) => ({ ...v, description_en: e.target.value }))} /></label><label className="text-sm space-y-1 block"><span>Description (বাংলা)</span><textarea className="min-h-11 w-full rounded-lg border border-gray-200 dark:border-white/10 p-2 bg-white dark:bg-[#0f1a2e]" value={brandForm.description_bn} onChange={(e) => setBrandForm((v) => ({ ...v, description_bn: e.target.value }))} /></label><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={brandForm.is_active} onChange={(e) => setBrandForm((v) => ({ ...v, is_active: e.target.checked }))} /> Active</label><div className="flex justify-end gap-2 flex-wrap"><button className="px-3 py-2 rounded border border-gray-200 dark:border-white/10" onClick={() => setBrandModal(false)}>Cancel</button><button className="px-3 py-2 rounded bg-brand-600 text-white" onClick={saveBrand}>Save</button></div></div></div>}
      <ConfirmDialog open={!!archiveBrand} title="ব্র্যান্ড আর্কাইভ করবেন?" description="ব্র্যান্ডটি লুকানো হবে — মুছবে না, পণ্যের তথ্যও ঠিক থাকবে।" confirmLabel="আর্কাইভ" onConfirm={confirmArchive} onCancel={() => setArchiveBrand(null)} />
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 flex items-center justify-between"><div><div className="text-xs text-muted">{label}</div><div className="text-2xl font-semibold">{asNumber(value).toLocaleString()}</div></div>{icon}</div>;
}
