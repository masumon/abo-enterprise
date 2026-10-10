"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pencil, Trash2, Loader2, Package, Copy, Download, FileText, Upload, Check, EyeOff, Star, StarOff, Tags, FilterX } from "lucide-react";
import { productsApi, categoriesApi, adminApi, downloadCsv, downloadPdf } from "@/lib/api";
import { productAdminApi, bnNum, type DupMatch, type MissingFilter, type ProductStockFilter } from "@/lib/catalogAdminApi";
import AiPhotoProductsModal from "@/components/admin/AiPhotoProductsModal";
import { apiErrorMessage } from "@/lib/apiError";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import AddEntryChoices from "@/components/admin/catalog/AddEntryChoices";
import BulkActionBar from "@/components/admin/catalog/BulkActionBar";
import InlineNumber from "@/components/admin/catalog/InlineNumber";
import ActiveSwitch from "@/components/admin/catalog/ActiveSwitch";
import { useBnEn } from "@/components/admin/catalog/useBnEn";
import { useToastStore } from "@/store/toast";
import type { Product, Category } from "@/types";
import { cn } from "@/lib/utils";
import ProductFormModal, { type ProductFormMode, type CategoryOpt } from "./ProductFormModal";

// Values are the backend product-category slugs (do not change).
const CATEGORIES: { value: string; label: string }[] = [
  { value: "accessories", label: "Mobile Accessories" },
  { value: "gadgets", label: "Premium Gadgets" },
  { value: "electronics", label: "Electronics" },
  { value: "computer", label: "Computer Accessories" },
];
const PER_PAGE = 20;

function ProductThumb({ src, alt, size = 40 }: { src?: string | null; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box = size === 40 ? "w-10 h-10" : "w-16 h-16";
  if (!src || failed) {
    return <div className={cn(box, "rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0")}><Package className="w-4 h-4 text-gray-400" /></div>;
  }
  return <Image src={src} alt={alt} width={size} height={size} onError={() => setFailed(true)} className={cn(box, "rounded-lg object-contain border border-gray-100 flex-shrink-0 bg-white")} />;
}

type Filters = { category: string; status: "" | "active" | "draft"; stock: ProductStockFilter; missing: MissingFilter };
const NO_FILTERS: Filters = { category: "", status: "", stock: "", missing: "" };

export default function AdminProductsPage() {
  const t = useBnEn();
  const toast = useToastStore((s) => s.push);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [form, setForm] = useState<ProductFormMode | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [taxonomy, setTaxonomy] = useState<Category[]>([]);
  const [aiPhotoOpen, setAiPhotoOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blogRailEnabled, setBlogRailEnabled] = useState(true);
  const [blogRailSaving, setBlogRailSaving] = useState(false);

  // Flattened taxonomy for the form's tree picker and the category options.
  const treeOptions: { id: string; label: string }[] = [];
  const categoryOptions: CategoryOpt[] = CATEGORIES.map((c) => ({ slug: c.value, label: c.label }));
  type Node = { id: string; slug: string; name_en: string; name_bn?: string | null; subcategories?: Node[] };
  const walk = (nodes: Node[], depth: number) => {
    for (const n of nodes) {
      const label = `${"— ".repeat(depth)}${n.name_bn || n.name_en}`;
      treeOptions.push({ id: n.id, label });
      const known = categoryOptions.find((o) => o.slug === n.slug);
      if (known) known.id = known.id ?? n.id; else categoryOptions.push({ slug: n.slug, id: n.id, label });
      walk(n.subcategories ?? [], depth + 1);
    }
  };
  walk(taxonomy as unknown as Node[], 0);
  const catLabel = (slug: string) => categoryOptions.find((o) => o.slug === slug)?.label.replace(/^(— )+/, "") ?? slug;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await productAdminApi.list({
        page, per_page: PER_PAGE, search: query || undefined, category: filters.category || undefined,
        is_active: filters.status === "" ? undefined : filters.status === "active",
        stock: filters.stock || undefined, missing: filters.missing || undefined,
      });
      setProducts(r.data.data ?? []);
      setTotal(r.data.meta?.total ?? 0);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, query, filters]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    categoriesApi.list({ applies_to: "product" }).then((r) => setTaxonomy(r.data.data ?? [])).catch(() => setTaxonomy([]));
    adminApi.getSettings().then((r) => setBlogRailEnabled((r.data.data?.feature_blog_product_rail ?? "true") !== "false")).catch(() => {});
  }, []);

  const onSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); setQuery(v.trim()); }, 400);
  };
  const setFilter = (patch: Partial<Filters>) => { setPage(1); setSelected(new Set()); setFilters((f) => ({ ...f, ...patch })); };
  const hasFilters = !!(query || filters.category || filters.status || filters.stock || filters.missing);

  const openForm = (m: ProductFormMode) => { setForm(m); setFormKey((k) => k + 1); };
  const openExisting = async (m: DupMatch) => {
    try {
      const r = await productAdminApi.list({ search: m.slug || m.name_en || "", per_page: 20 });
      const p = (r.data.data ?? []).find((x) => x.id === m.id);
      if (p) openForm({ type: "edit", product: p });
    } catch { toast("error", t("পণ্যটি খোলা যায়নি", "Could not open that product")); }
  };

  // /sumon/products?edit=<id> opens that product's editor (links from the content-health page).
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("new") === "1") { setForm({ type: "new" }); setFormKey((k) => k + 1); return; }
    const id = qs.get("edit");
    if (!id) return;
    (async () => {
      for (let pg = 1; pg <= 10; pg++) {
        const r = await productAdminApi.list({ page: pg, per_page: 100 });
        const hit = (r.data.data ?? []).find((x) => x.id === id);
        if (hit) { setForm({ type: "edit", product: hit }); setFormKey((k) => k + 1); return; }
        if (pg * 100 >= (r.data.meta?.total ?? 0)) return;
      }
    })().catch(() => {});
  }, []);

  const toggleBlogRail = async () => {
    const next = !blogRailEnabled;
    setBlogRailEnabled(next);
    setBlogRailSaving(true);
    try {
      await adminApi.upsertSettings([{ key: "feature_blog_product_rail", value: next ? "true" : "false", data_type: "boolean", description: "Show a product rail at the end of blog posts" }]);
    } catch {
      setBlogRailEnabled(!next);
      toast("error", t("সেটিং সেভ হয়নি", "Could not save this setting"));
    } finally { setBlogRailSaving(false); }
  };

  const patchOne = async (p: Product, patch: Partial<Product>) => {
    setBusyId(p.id ?? null);
    try {
      await productsApi.update(p.id!, patch);
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
      toast("success", t("সেভ হয়েছে", "Saved"));
    } catch (e) {
      toast("error", apiErrorMessage(e, t("সেভ হয়নি", "Save failed")));
      throw e;
    } finally { setBusyId(null); }
  };
  const setStock = async (p: Product, next: number) => {
    const delta = next - (p.stock_quantity ?? 0);
    if (!delta) return;
    try {
      await productAdminApi.adjustStock(p.id!, delta, "পণ্য তালিকা থেকে দ্রুত সংশোধন (quick edit)");
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, stock_quantity: next } : x)));
      toast("success", t("স্টক আপডেট হয়েছে (ইনভেন্টরি হিস্টরিতে আছে)", "Stock updated (kept in inventory history)"));
    } catch (e) {
      toast("error", apiErrorMessage(e, t("স্টক বদলানো যায়নি", "Stock change failed")));
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await productsApi.delete(deleteId);
      setDeleteId(null);
      toast("success", t("পণ্য মুছে ফেলা হয়েছে", "Product deleted"));
      await load();
    } catch (e) { toast("error", apiErrorMessage(e, t("মুছতে পারিনি", "Failed to delete product"))); }
  };

  const pageIds = products.map((p) => p.id).filter((id): id is string => !!id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((s) => { const n = new Set(s); pageIds.forEach((id) => (allOnPage ? n.delete(id) : n.add(id))); return n; });

  const runBulk = async (patch: Partial<Product>, doneBn: string, doneEn: string) => {
    setBulkLoading(true);
    try {
      await Promise.all(Array.from(selected).map((id) => productsApi.update(id, patch)));
      toast("success", t(`${bnNum(selected.size)}টি পণ্য ${doneBn}`, `${selected.size} product(s) ${doneEn}`));
      setSelected(new Set());
      await load();
    } catch (e) { toast("error", apiErrorMessage(e, t("একসাথে বদলানো যায়নি", "Bulk update failed"))); }
    finally { setBulkLoading(false); }
  };
  const runBulkDelete = async () => {
    setBulkLoading(true);
    try {
      await Promise.all(Array.from(selected).map((id) => productsApi.delete(id)));
      toast("success", t(`${bnNum(selected.size)}টি পণ্য মুছে ফেলা হয়েছে`, `${selected.size} product(s) deleted`));
      setSelected(new Set());
      setBulkDeleteConfirm(false);
      await load();
    } catch (e) { toast("error", apiErrorMessage(e, t("মুছতে পারিনি", "Bulk delete failed"))); }
    finally { setBulkLoading(false); }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const { created, updated, errors } = (await productsApi.importCsv(file)).data.data;
      toast("success", t(`ইমপোর্ট: ${created}টি নতুন, ${updated}টি আপডেট${errors.length ? `, ${errors.length}টি সারিতে সমস্যা` : ""}`, `Import: ${created} created, ${updated} updated${errors.length ? `, ${errors.length} row error(s)` : ""}`));
      await load();
    } catch (err) { toast("error", apiErrorMessage(err, t("ইমপোর্ট ব্যর্থ", "Import failed"))); }
    finally { setImporting(false); }
  };

  const rowActions = (p: Product) => (
    <div className="flex items-center justify-end gap-1 flex-wrap">
      <button type="button" onClick={() => openForm({ type: "clone", product: p })} title={t("কপি করে নতুন বানান", "Copy as new")} aria-label={t("কপি করে নতুন বানান", "Copy as new")}
        className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10"><Copy className="w-4 h-4" /></button>
      <button type="button" onClick={() => openForm({ type: "edit", product: p })} title={t("সম্পাদনা", "Edit")} aria-label={t("সম্পাদনা", "Edit")}
        className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10"><Pencil className="w-4 h-4" /></button>
      <button type="button" onClick={() => setDeleteId(p.id ?? null)} title={t("মুছুন", "Delete")} aria-label={t("মুছুন", "Delete")}
        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
    </div>
  );
  const stockCell = (p: Product) => {
    const low = (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5);
    return <InlineNumber value={p.stock_quantity} label={t("স্টক", "Stock")} onSave={(v) => setStock(p, v)}
      className={cn("text-sm", (p.stock_quantity ?? 0) <= 0 ? "text-red-600 font-semibold" : low ? "text-amber-600 font-semibold" : "text-gray-700 dark:text-gray-300")} />;
  };
  const sel = "admin-input !py-1.5 text-sm w-auto";

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Products"
        titleBn="পণ্য ব্যবস্থাপনা"
        description={`${total} products — add, edit, stock & pricing`}
        descriptionBn={`${bnNum(total)}টি পণ্য — যোগ, সম্পাদনা, স্টক ও দাম`}
        actions={
          <>
            <input ref={importInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
            <button type="button" onClick={() => importInputRef.current?.click()} disabled={importing} className="admin-btn-secondary" title={t("পুরনো সাধারণ CSV (slug, name_en, name_bn, price…)", "Legacy quick CSV import")}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {t("দ্রুত CSV", "Quick CSV")}
            </button>
            <button type="button" onClick={() => downloadCsv("/api/v1/admin/bulk/export/products", "products.csv").catch((e) => toast("error", apiErrorMessage(e, "Export failed")))} className="admin-btn-secondary">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button type="button" onClick={() => downloadPdf("/api/v1/admin/bulk/export/products/pdf", "products.pdf").catch((e) => toast("error", apiErrorMessage(e, "Export failed")))} className="admin-btn-secondary">
              <FileText className="w-4 h-4" /> PDF
            </button>
          </>
        }
      />

      {(total > 0 || hasFilters || loading) && (
        <AddEntryChoices thing={{ bn: "পণ্য", en: "product" }} onForm={() => openForm({ type: "new" })} onAi={() => setAiPhotoOpen(true)} excelHref="/sumon/products/import" />
      )}

      <AdminToolbar searchValue={search} onSearchChange={onSearch} searchPlaceholder={t("নাম, slug বা SKU দিয়ে খুঁজুন…", "Search name, slug or SKU…")}>
        <select aria-label={t("ক্যাটাগরি", "Category")} value={filters.category} onChange={(e) => setFilter({ category: e.target.value })} className={sel}>
          <option value="">{t("সব ক্যাটাগরি", "All categories")}</option>
          {categoryOptions.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
        </select>
        <select aria-label={t("অবস্থা", "Status")} value={filters.status} onChange={(e) => setFilter({ status: e.target.value as Filters["status"] })} className={sel}>
          <option value="">{t("সব অবস্থা", "Any status")}</option>
          <option value="active">{t("প্রকাশিত", "Live")}</option>
          <option value="draft">{t("খসড়া / লুকানো", "Draft / hidden")}</option>
        </select>
        <select aria-label={t("স্টক", "Stock")} value={filters.stock} onChange={(e) => setFilter({ stock: e.target.value as ProductStockFilter })} className={sel}>
          <option value="">{t("সব স্টক", "Any stock")}</option>
          <option value="low">{t("স্টক কম", "Low stock")}</option>
          <option value="out">{t("স্টক শেষ", "Out of stock")}</option>
        </select>
        <select aria-label={t("যা নেই", "Missing")} value={filters.missing} onChange={(e) => setFilter({ missing: e.target.value as MissingFilter })} className={sel}>
          <option value="">{t("সব তথ্য", "Anything")}</option>
          <option value="image">{t("ছবি নেই", "No photo")}</option>
          <option value="price">{t("দাম নেই", "No price")}</option>
          <option value="description">{t("বিবরণ নেই", "No description")}</option>
        </select>
        {hasFilters && (
          <button type="button" onClick={() => { setSearch(""); setQuery(""); setFilter(NO_FILTERS); }} className="btn btn-ghost btn-sm gap-1"><FilterX className="w-4 h-4" /> {t("ফিল্টার মুছুন", "Clear")}</button>
        )}
      </AdminToolbar>

      <BulkActionBar
        count={selected.size}
        busy={bulkLoading}
        onClear={() => setSelected(new Set())}
        actions={[
          { bn: "প্রকাশ করুন", en: "Publish", icon: Check, onClick: () => runBulk({ is_active: true }, "প্রকাশ হয়েছে", "published") },
          { bn: "লুকান", en: "Hide", icon: EyeOff, onClick: () => runBulk({ is_active: false }, "লুকানো হয়েছে", "hidden") },
          { bn: "ফিচার", en: "Feature", icon: Star, onClick: () => runBulk({ is_featured: true }, "ফিচার হয়েছে", "featured") },
          { bn: "ফিচার বাদ", en: "Unfeature", icon: StarOff, onClick: () => runBulk({ is_featured: false }, "ফিচার থেকে বাদ", "unfeatured") },
          { bn: "মুছুন", en: "Delete", icon: Trash2, danger: true, onClick: () => setBulkDeleteConfirm(true) },
        ]}
      >
        <span className="inline-flex items-center gap-1">
          <select aria-label={t("ক্যাটাগরি বদলান", "Change category")} value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} className={sel}>
            <option value="">{t("ক্যাটাগরি বদলান…", "Change category…")}</option>
            {categoryOptions.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
          <button type="button" disabled={!bulkCategory || bulkLoading} className="btn btn-outline btn-sm gap-1"
            onClick={() => { const c = categoryOptions.find((o) => o.slug === bulkCategory); runBulk({ category: bulkCategory as Product["category"], ...(c?.id ? { category_id: c.id } : {}) }, "ক্যাটাগরি বদলেছে", "moved"); setBulkCategory(""); }}>
            <Tags className="w-3.5 h-3.5" /> {t("বদলান", "Apply")}
          </button>
        </span>
      </BulkActionBar>

      {loadError && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{t("পণ্য লোড হয়নি — পেজ রিফ্রেশ করুন।", "Failed to load products.")}</p>}

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : products.length === 0 ? (
          hasFilters ? (
            <AdminEmptyState icon={FilterX} title={t("এই খোঁজ/ফিল্টারে কোনো পণ্য নেই", "No products match")} description={t("ফিল্টার মুছে আবার দেখুন।", "Clear the filters to see everything.")}
              action={<button type="button" onClick={() => { setSearch(""); setQuery(""); setFilter(NO_FILTERS); }} className="btn btn-outline btn-sm">{t("ফিল্টার মুছুন", "Clear filters")}</button>} />
          ) : (
            <div className="p-5 sm:p-8">
              <AdminEmptyState icon={Package} title={t("এখনো কোনো পণ্য নেই", "No products yet")} description={t("নিচের যেকোনো একভাবে প্রথম পণ্য যোগ করুন।", "Add your first product one of these ways.")} />
              <AddEntryChoices large thing={{ bn: "পণ্য", en: "product" }} onForm={() => openForm({ type: "new" })} onAi={() => setAiPhotoOpen(true)} excelHref="/sumon/products/import" />
            </div>
          )
        ) : (
          <>
            {/* Phone: thumbnail cards */}
            <ul className="md:hidden divide-y divide-gray-100 dark:divide-white/10">
              <li className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
                <input type="checkbox" checked={allOnPage} onChange={toggleAll} className="rounded" aria-label={t("এই পাতার সব বাছুন", "Select all on page")} /> {t("সব বাছুন", "Select all")}
              </li>
              {products.map((p) => (
                <li key={p.id} className="flex gap-3 px-3 py-3">
                  <input type="checkbox" checked={!!p.id && selected.has(p.id)} onChange={() => p.id && toggle(p.id)} className="rounded mt-1" aria-label={p.name_bn || p.name_en} />
                  <button type="button" onClick={() => openForm({ type: "edit", product: p })} className="flex-shrink-0"><ProductThumb src={p.image_url} alt={p.name_en} size={64} /></button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <button type="button" onClick={() => openForm({ type: "edit", product: p })} className="block text-left font-medium text-heading line-clamp-2">{p.name_bn || p.name_en}</button>
                    <p className="text-xs text-muted truncate">{catLabel(p.category)}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <InlineNumber value={p.price} prefix="৳" label={t("দাম", "Price")} onSave={(v) => patchOne(p, { price: v })} className="font-semibold" />
                      <span className="inline-flex items-center gap-1 text-xs text-muted">{t("স্টক", "Stock")}: {stockCell(p)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <ActiveSwitch active={!!p.is_active} busy={busyId === p.id} onChange={(v) => patchOne(p, { is_active: v }).catch(() => {})} />
                      {rowActions(p)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {/* Tablet / desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th className="w-10 px-3"><input type="checkbox" aria-label={t("এই পাতার সব বাছুন", "Select all on page")} checked={allOnPage} onChange={toggleAll} className="rounded" /></th>
                    <th>{t("পণ্য", "Product")}</th>
                    <th className="hidden lg:table-cell">{t("ক্যাটাগরি", "Category")}</th>
                    <th>{t("দাম", "Price")}</th>
                    <th>{t("স্টক", "Stock")}</th>
                    <th>{t("অবস্থা", "Status")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-brand-50/30 dark:hover:bg-white/[0.03]">
                      <td className="px-3 py-3"><input type="checkbox" aria-label={p.name_bn || p.name_en} checked={!!p.id && selected.has(p.id)} onChange={() => p.id && toggle(p.id)} className="rounded" /></td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openForm({ type: "edit", product: p })} className="flex items-center gap-3 text-left min-w-0">
                          <ProductThumb src={p.image_url} alt={p.name_en} />
                          <span className="min-w-0">
                            <span className="block font-medium text-heading truncate max-w-[280px]">{p.name_bn || p.name_en}</span>
                            <span className="block text-xs text-gray-400 truncate max-w-[280px]">{p.sku || p.slug}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 hidden lg:table-cell">{catLabel(p.category)}</td>
                      <td className="px-4 py-3 font-semibold"><InlineNumber value={p.price} prefix="৳" label={t("দাম", "Price")} onSave={(v) => patchOne(p, { price: v })} /></td>
                      <td className="px-4 py-3">{stockCell(p)}</td>
                      <td className="px-4 py-3"><ActiveSwitch active={!!p.is_active} busy={busyId === p.id} onChange={(v) => patchOne(p, { is_active: v }).catch(() => {})} /></td>
                      <td className="px-4 py-3">{rowActions(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {total > PER_PAGE && (
        <div className="flex justify-center items-center gap-3">
          <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-outline btn-sm">{t("আগের", "Previous")}</button>
          <span className="text-sm text-gray-600">{t(`পাতা ${bnNum(page)} / ${bnNum(Math.ceil(total / PER_PAGE))}`, `Page ${page} of ${Math.ceil(total / PER_PAGE)}`)}</span>
          <button type="button" disabled={page * PER_PAGE >= total} onClick={() => setPage((p) => p + 1)} className="btn btn-outline btn-sm">{t("পরের", "Next")}</button>
        </div>
      )}

      <label className="flex items-center gap-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 cursor-pointer w-fit">
        <button type="button" role="switch" aria-checked={blogRailEnabled} disabled={blogRailSaving} onClick={toggleBlogRail}
          className={cn("relative w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50", blogRailEnabled ? "bg-brand-600" : "bg-gray-300")}>
          <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform", blogRailEnabled && "translate-x-4")} />
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {t("ব্লগ পোস্টের নিচে প্রোডাক্ট কার্ড দেখান", "Show a product rail at the end of blog posts")}
        </span>
      </label>

      {form && (
        <ProductFormModal key={formKey} mode={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }}
          categoryOptions={categoryOptions} treeOptions={treeOptions} onOpenExisting={openExisting} />
      )}

      <AiPhotoProductsModal open={aiPhotoOpen} onClose={() => setAiPhotoOpen(false)} categoryOptions={categoryOptions} onSaved={() => load()} />

      <ConfirmDialog open={deleteId !== null} title={t("পণ্যটি মুছবেন?", "Delete product?")} message={t("সাইট থেকে সরে যাবে। অর্ডারের পুরনো তথ্য থাকবে।", "It will be removed from the site. Past orders keep their data.")}
        confirmLabel={t("মুছুন", "Delete")} variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <ConfirmDialog open={bulkDeleteConfirm} title={t(`${bnNum(selected.size)}টি পণ্য মুছবেন?`, `Delete ${selected.size} product(s)?`)} message={t("সাইট থেকে সরে যাবে।", "They will be removed from the site.")}
        confirmLabel={t("মুছুন", "Delete")} variant="danger" onConfirm={runBulkDelete} onCancel={() => setBulkDeleteConfirm(false)} />
    </div>
  );
}
