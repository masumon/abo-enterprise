"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Package, ChevronDown, Copy } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { productsApi, categoriesApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import ImageUpload from "@/components/admin/ImageUpload";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToastStore } from "@/store/toast";
import type { Product, Category } from "@/types";
import StatusBadge from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";

// Values are the backend product-category slugs (do not change); labels are the
// customer-facing names, kept in sync with the storefront category filters.
const CATEGORIES: { value: string; label: string }[] = [
  { value: "accessories", label: "Mobile Accessories" },
  { value: "gadgets", label: "Premium Gadgets" },
  { value: "electronics", label: "Electronics" },
  { value: "computer", label: "Computer Accessories" },
];
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);
const BADGES = ["", "HOT", "NEW", "SALE"];

const schema = z.object({
  slug: z.string().min(2, "Required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  name_en: z.string().min(1, "Required"),
  name_bn: z.string().min(1, "Required"),
  description_en: z.string().optional(),
  description_bn: z.string().optional(),
  price: z.coerce.number().min(1, "Required"),
  original_price: z.coerce.number().min(0).optional(),
  category: z.string().min(1, "Required"),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  badge: z.string().optional(),
  stock_quantity: z.coerce.number().min(0),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  image_url: z.string().optional(),
  // SEO fields (Sprint A)
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
  canonical_url: z.string().optional(),
  og_image: z.string().optional(),
  // Extended fields (Sprint D)
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  sub_category: z.string().optional(),
  tags: z.string().optional(),
  weight: z.coerce.number().optional(),
  warranty_info: z.string().optional(),
  delivery_info: z.string().optional(),
  is_flash_sale: z.boolean().optional(),
  flash_sale_price: z.coerce.number().optional(),
  flash_sale_ends_at: z.string().optional(),
  low_stock_threshold: z.coerce.number().min(0).optional(),
  is_best_seller: z.boolean().optional(),
  is_bookable: z.boolean().optional(),
}).refine(
  (d) => !d.original_price || d.original_price >= d.price,
  { message: "Original price must be ≥ sale price", path: ["original_price"] }
).refine(
  (d) => !d.flash_sale_price || d.flash_sale_price < d.price,
  { message: "Flash sale price must be less than regular price", path: ["flash_sale_price"] }
);
type FormData = z.infer<typeof schema>;

/** Product thumbnail that falls back to a placeholder icon when the image
 * URL is empty OR fails to load (previously a broken URL showed overflowing
 * alt text in the tiny box). */
function ProductThumb({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Package className="w-4 h-4 text-gray-400" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      onError={() => setFailed(true)}
      className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0 bg-gray-50"
    />
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const toast = useToastStore((s) => s.push);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [extOpen, setExtOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<{ k: string; v: string }[]>([]);
  const [taxonomy, setTaxonomy] = useState<Category[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useFocusTrap(showModal);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true, is_featured: false, stock_quantity: 0, low_stock_threshold: 5, is_flash_sale: false, is_best_seller: false },
  });

  const currentImage = watch("image_url");
  // Flattened tree for the single node picker — "— " per depth level, so the
  // admin can place a product at ANY depth of the unlimited taxonomy.
  const treeOptions: { id: string; label: string }[] = [];
  const flatten = (nodes: { id: string; name_en: string; name_bn?: string | null; subcategories?: unknown[] }[], depth: number) => {
    for (const n of nodes) {
      treeOptions.push({ id: n.id, label: `${"— ".repeat(depth)}${n.name_bn || n.name_en}` });
      flatten((n.subcategories ?? []) as typeof nodes, depth + 1);
    }
  };
  flatten(taxonomy as unknown as { id: string; name_en: string; subcategories?: unknown[] }[], 0);

  const load = async (pageNum = page, search?: string) => {
    setLoading(true);
    setActionError(null);
    try {
      const r = await productsApi.adminList({ page: pageNum, per_page: 20, search: search || undefined });
      setProducts(r.data.data ?? []);
      setTotal(r.data.meta?.total ?? 0);
    } catch {
      setActionError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  // Load the shared taxonomy once (product-applicable categories) for the
  // optional Category/Subcategory selectors. Failure is non-fatal — the form
  // works without it, so existing behaviour is preserved.
  useEffect(() => {
    categoriesApi
      .list({ applies_to: "product" })
      .then((r) => setTaxonomy(r.data.data ?? []))
      .catch(() => setTaxonomy([]));
  }, []);

  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(1, v); }, 400);
  };

  const openCreate = () => {
    setEditing(null);
    reset({
      is_active: true, is_featured: false, stock_quantity: 0, image_url: "",
      seo_title: "", seo_description: "", seo_keywords: "", canonical_url: "", og_image: "",
      low_stock_threshold: 5, is_flash_sale: false, is_best_seller: false,
    });
    setImageUrl("");
    setGalleryImages([]);
    setSpecs([]);
    setSeoOpen(false);
    setExtOpen(false);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    reset({
      slug: p.slug,
      name_en: p.name_en,
      name_bn: p.name_bn,
      description_en: p.description_en ?? "",
      description_bn: p.description_bn ?? "",
      price: p.price,
      original_price: p.original_price ?? undefined,
      category: p.category,
      category_id: p.category_id ?? "",
      subcategory_id: p.subcategory_id ?? "",
      badge: p.badge ?? "",
      stock_quantity: p.stock_quantity,
      is_active: p.is_active,
      is_featured: p.is_featured,
      image_url: p.image_url ?? "",
      seo_title: p.seo_title ?? "",
      seo_description: p.seo_description ?? "",
      seo_keywords: p.seo_keywords ?? "",
      canonical_url: p.canonical_url ?? "",
      og_image: p.og_image ?? "",
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
      brand: p.brand ?? "",
      sub_category: p.sub_category ?? "",
      tags: p.tags?.join(", ") ?? "",
      weight: p.weight ?? undefined,
      warranty_info: p.warranty_info ?? "",
      delivery_info: p.delivery_info ?? "",
      is_flash_sale: p.is_flash_sale ?? false,
      flash_sale_price: p.flash_sale_price ?? undefined,
      flash_sale_ends_at: p.flash_sale_ends_at
        ? new Date(p.flash_sale_ends_at).toISOString().slice(0, 16)
        : "",
      low_stock_threshold: p.low_stock_threshold ?? 5,
      is_best_seller: p.is_best_seller ?? false,
      is_bookable: p.is_bookable ?? false,
    });
    setImageUrl(p.image_url ?? "");
    setGalleryImages(p.images ?? []);
    setSpecs(Object.entries((p.specifications as Record<string, string>) ?? {}).map(([k, v]) => ({ k, v: String(v) })));
    setSeoOpen(false);
    setExtOpen(false);
    setShowModal(true);
  };

  const openClone = (p: Product) => {
    setEditing(null);
    reset({
      slug: `${p.slug}-copy`,
      name_en: `${p.name_en} (Copy)`,
      name_bn: p.name_bn,
      description_en: p.description_en ?? "",
      description_bn: p.description_bn ?? "",
      price: p.price,
      original_price: p.original_price ?? undefined,
      category: p.category,
      badge: p.badge ?? "",
      stock_quantity: 0,
      is_active: false,
      is_featured: false,
      is_bookable: p.is_bookable ?? false,
      image_url: p.image_url ?? "",
      seo_title: "", seo_description: "", seo_keywords: "", canonical_url: "", og_image: "",
      sku: "", barcode: "", brand: p.brand ?? "", sub_category: p.sub_category ?? "",
      tags: p.tags?.join(", ") ?? "",
      weight: p.weight ?? undefined,
      warranty_info: p.warranty_info ?? "", delivery_info: p.delivery_info ?? "",
      is_flash_sale: false, flash_sale_price: undefined, flash_sale_ends_at: "",
      low_stock_threshold: p.low_stock_threshold ?? 5, is_best_seller: false,
    });
    setImageUrl(p.image_url ?? "");
    setGalleryImages([]);
    setSpecs(Object.entries((p.specifications as Record<string, string>) ?? {}).map(([k, v]) => ({ k, v: String(v) })));
    setSeoOpen(false);
    setExtOpen(false);
    setShowModal(true);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const { tags: tagsStr, flash_sale_ends_at, category_id, subcategory_id, is_bookable, ...rest } = data;
      const payload: Partial<Product> = {
        ...rest,
        // Empty selector → null (clears the association); otherwise pass the id.
        category_id: category_id ? category_id : null,
        subcategory_id: subcategory_id ? subcategory_id : null,
        // Cross-capability: checked → also bookable; unchecked → null (default,
        // never sends false so the product's ordering is never disabled).
        is_bookable: is_bookable ? true : null,
        tags: tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [],
        images: galleryImages.filter(Boolean),
        specifications: Object.fromEntries(specs.filter((r) => r.k.trim()).map((r) => [r.k.trim(), r.v.trim()])),
        flash_sale_ends_at: flash_sale_ends_at ? new Date(flash_sale_ends_at).toISOString() : null,
      } as Partial<Product>;
      if (editing) {
        await productsApi.update(editing.id!, payload);
        toast("success", "Product updated");
      } else {
        await productsApi.create(payload);
        toast("success", "Product created");
      }
      setShowModal(false);
      await load(page);
    } catch (e) {
      const msg = apiErrorMessage(e, "Failed to save product");
      setActionError(msg);
      toast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await productsApi.delete(deleteId);
      setDeleteId(null);
      toast("success", "Product deleted");
      await load(page);
    } catch (e) {
      const msg = apiErrorMessage(e, "Failed to delete product");
      setActionError(msg);
      toast("error", msg);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title="Products"
        titleBn="পণ্য ব্যবস্থাপনা"
        description={`${total} products — add, edit, stock & pricing`}
        actions={
          <button onClick={openCreate} className="admin-btn-primary">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        }
      />

      <AdminToolbar
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        searchPlaceholder="পণ্য খুঁজুন…"
      />

      {actionError && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          {actionError}
        </p>
      )}

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <AdminEmptyState icon={Package} title="No products yet" description="Add your first product to start selling." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium min-w-[480px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="hidden sm:table-cell">Category</th>
                  <th>Price</th>
                  <th className="hidden md:table-cell">Stock</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} onClick={() => openEdit(p)} className="cursor-pointer hover:bg-brand-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumb src={p.image_url} alt={p.name_en} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.name_en}</p>
                          <p className="text-xs text-gray-400 truncate">{p.slug}</p>
                          <p className="text-xs text-gray-400 sm:hidden">{CATEGORY_LABELS[p.category] ?? p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">{CATEGORY_LABELS[p.category] ?? p.category}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">৳{p.price}</td>
                    <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{p.stock_quantity}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openClone(p)} title="Duplicate" className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(p.id ?? null)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-3">
          <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600 self-center">Page {page}</span>
          <button type="button" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div ref={modalRef} role="dialog" aria-modal="true" className="rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in" style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Edit Product" : "New Product"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <ImageUpload
                label="Product Image"
                value={currentImage || imageUrl}
                onChange={(url) => { setValue("image_url", url); setImageUrl(url); }}
                folder="abo-enterprise/products"
                previewSize="md"
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Gallery Images</label>
                  <button
                    type="button"
                    onClick={() => setGalleryImages((imgs) => [...imgs, ""])}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    + Add image
                  </button>
                </div>
                {galleryImages.length === 0 ? (
                  <p className="text-xs text-gray-400">No gallery images. Click &quot;Add image&quot; to upload more photos.</p>
                ) : (
                  <div className="space-y-3">
                    {galleryImages.map((url, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="flex-1">
                          <ImageUpload
                            value={url}
                            onChange={(v) => setGalleryImages((imgs) => imgs.map((u, i) => (i === idx ? v : u)))}
                            folder="abo-enterprise/products"
                            previewSize="sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setGalleryImages((imgs) => imgs.filter((_, i) => i !== idx))}
                          className="p-2 text-gray-400 hover:text-red-500 mt-1"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input {...register("slug")} className={cn("input", errors.slug && "input-error")} placeholder="phone-case-black" />
                  {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select {...register("category")} className="input">
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                </div>
                {taxonomy.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ক্যাটালগ গাছের অবস্থান <span className="text-gray-400 font-normal">(যেকোনো গভীরতা)</span>
                    </label>
                    <select
                      {...register("category_id")}
                      className="input"
                      onChange={(e) => { setValue("category_id", e.target.value); setValue("subcategory_id", ""); }}
                    >
                      <option value="">— None —</option>
                      {treeOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
                  <input {...register("name_en")} className={cn("input", errors.name_en && "input-error")} placeholder="Phone Case" />
                  {errors.name_en && <p className="text-red-500 text-xs mt-1">{errors.name_en.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (বাংলা)</label>
                  <input {...register("name_bn")} className={cn("input", errors.name_bn && "input-error")} placeholder="ফোন কেস" />
                  {errors.name_bn && <p className="text-red-500 text-xs mt-1">{errors.name_bn.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (৳)</label>
                  <input {...register("price")} type="number" className={cn("input", errors.price && "input-error")} placeholder="299" />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (৳)</label>
                  <input {...register("original_price")} type="number" className="input" placeholder="399 (optional)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                  <input {...register("stock_quantity")} type="number" className="input" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                  <select {...register("badge")} className="input">
                    {BADGES.map(b => <option key={b} value={b}>{b || "None"}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
                <textarea {...register("description_en")} rows={2} className="input resize-none" placeholder="Product description..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (বাংলা)</label>
                <textarea {...register("description_bn")} rows={2} className="input resize-none" placeholder="পণ্যের বিবরণ..." />
              </div>

              {/* Extended Details */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setExtOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <span className="text-sm font-medium text-gray-700">Extended Details</span>
                  <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", extOpen && "rotate-180")} />
                </button>
                {extOpen && (
                  <div className="px-4 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                        <input {...register("sku")} className="input" placeholder="SKU-001" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Barcode</label>
                        <input {...register("barcode")} className="input" placeholder="8901234567890" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
                        <input {...register("brand")} className="input" placeholder="Samsung, Apple..." />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sub-category</label>
                        <input {...register("sub_category")} className="input" placeholder="Cables, Cases..." />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
                        <input {...register("weight")} type="number" step="0.001" className="input" placeholder="0.250" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Low Stock Alert</label>
                        <input {...register("low_stock_threshold")} type="number" className="input" placeholder="5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Specifications <span className="text-gray-400 font-normal">(shown as a table on the product page)</span>
                      </label>
                      <div className="space-y-2">
                        {specs.map((row, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              value={row.k}
                              onChange={(e) => setSpecs((prev) => prev.map((r, j) => (j === i ? { ...r, k: e.target.value } : r)))}
                              className="input flex-1 text-sm"
                              placeholder="Name (e.g. RAM, Color)"
                            />
                            <input
                              value={row.v}
                              onChange={(e) => setSpecs((prev) => prev.map((r, j) => (j === i ? { ...r, v: e.target.value } : r)))}
                              className="input flex-1 text-sm"
                              placeholder="Value (e.g. 8GB, Black)"
                            />
                            <button
                              type="button"
                              onClick={() => setSpecs((prev) => prev.filter((_, j) => j !== i))}
                              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                              aria-label="Remove specification"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSpecs((prev) => [...prev, { k: "", v: "" }])}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          + Add specification
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                      <input {...register("tags")} className="input" placeholder="phone, accessories, black..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Warranty Info</label>
                      <textarea {...register("warranty_info")} rows={2} className="input resize-none text-sm" placeholder="6 months manufacturer warranty..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Info</label>
                      <textarea {...register("delivery_info")} rows={2} className="input resize-none text-sm" placeholder="Delivered within 2-3 business days..." />
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input {...register("is_flash_sale")} type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                        <span className="text-xs text-gray-700">Flash Sale</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input {...register("is_best_seller")} type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                        <span className="text-xs text-gray-700">Best Seller</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Flash Sale Price (৳)</label>
                      <input {...register("flash_sale_price")} type="number" className="input" placeholder="Leave blank if no flash sale" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Flash Sale Ends At</label>
                      <input {...register("flash_sale_ends_at")} type="datetime-local" className="input text-sm" />
                    </div>
                  </div>
                )}
              </div>

              {/* SEO Section */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setSeoOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <span className="text-sm font-medium text-gray-700">SEO Settings</span>
                  <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", seoOpen && "rotate-180")} />
                </button>
                {seoOpen && (
                  <div className="px-4 py-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">SEO Title <span className="text-gray-400 font-normal">(defaults to product name)</span></label>
                      <input {...register("seo_title")} className="input" placeholder="Custom SEO title..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">SEO Description <span className="text-gray-400 font-normal">(max 160 chars)</span></label>
                      <textarea {...register("seo_description")} rows={2} maxLength={160} className="input resize-none" placeholder="Meta description for search engines..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Keywords <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                      <input {...register("seo_keywords")} className="input" placeholder="phone case, accessories, sylhet..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Canonical URL <span className="text-gray-400 font-normal">(leave blank for default)</span></label>
                      <input {...register("canonical_url")} className="input" placeholder="https://..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">OG Image <span className="text-gray-400 font-normal">(defaults to product image)</span></label>
                      <ImageUpload
                        value={watch("og_image") ?? ""}
                        onChange={(url) => setValue("og_image", url)}
                        folder="abo-enterprise/products"
                        previewSize="sm"
                        showUrlInput
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input {...register("is_active")} type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input {...register("is_featured")} type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-gray-700">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" title="Also let customers book/request this item as a service">
                  <input {...register("is_bookable")} type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-gray-700">Also bookable</span>
                </label>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline btn-md">Cancel</button>
              <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn btn-brand btn-md">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? "Save Changes" : "Create Product")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Product?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
