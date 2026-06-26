"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Upload, X, Loader2, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { productsApi, adminApi } from "@/lib/api";
import type { Product } from "@/types";
import StatusBadge from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";

const CATEGORIES = ["accessories", "gadgets", "electronics", "computer"];
const BADGES = ["", "HOT", "NEW", "SALE"];

const schema = z.object({
  slug: z.string().min(2, "Required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  name_en: z.string().min(1, "Required"),
  name_bn: z.string().min(1, "Required"),
  description_en: z.string().optional(),
  description_bn: z.string().optional(),
  price: z.coerce.number().min(1, "Required"),
  original_price: z.coerce.number().optional(),
  category: z.string().min(1, "Required"),
  badge: z.string().optional(),
  stock_quantity: z.coerce.number().min(0),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  image_url: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true, is_featured: false, stock_quantity: 0 },
  });

  const currentImage = watch("image_url");

  const load = async (pageNum = page) => {
    setLoading(true);
    setActionError(null);
    try {
      const r = await productsApi.list({ page: pageNum, per_page: 20 });
      setProducts(r.data.data ?? []);
      setTotal(r.data.meta?.total ?? 0);
    } catch {
      setActionError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const openCreate = () => {
    setEditing(null);
    reset({ is_active: true, is_featured: false, stock_quantity: 0, image_url: "" });
    setImageUrl("");
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
      badge: p.badge ?? "",
      stock_quantity: p.stock_quantity,
      is_active: p.is_active,
      is_featured: p.is_featured,
      image_url: p.image_url ?? "",
    });
    setImageUrl(p.image_url ?? "");
    setShowModal(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const r = await adminApi.uploadImage(file);
      const url = r.data.data?.url ?? "";
      setValue("image_url", url);
      setImageUrl(url);
    } catch {
      setActionError("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = { ...data } as Partial<Product>;
      if (editing) {
        await productsApi.update(editing.id!, payload);
      } else {
        await productsApi.create(payload);
      }
      setShowModal(false);
      await load(page);
    } catch {
      setActionError("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await productsApi.delete(deleteId);
      setDeleteId(null);
      await load(page);
    } catch {
      setActionError("Failed to delete product");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">{total} items</p>
        </div>
        <button onClick={openCreate} className="btn btn-brand btn-md flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

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
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No products yet</p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name_en} width={40} height={40} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{p.name_en}</p>
                        <p className="text-xs text-gray-400">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{p.category}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">৳{p.price}</td>
                  <td className="px-5 py-3 text-gray-600">{p.stock_quantity}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.is_active ? "active" : "inactive"} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(p.id ?? null)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <div className="rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in" style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Edit Product" : "New Product"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                <div className="flex items-center gap-4">
                  {(currentImage || imageUrl) ? (
                    <Image src={currentImage || imageUrl} alt="Preview" width={64} height={64} className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="btn btn-outline btn-sm flex items-center gap-2">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? "Uploading..." : "Upload Image"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input {...register("slug")} className={cn("input", errors.slug && "input-error")} placeholder="phone-case-black" />
                  {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select {...register("category")} className="input">
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                </div>
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

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input {...register("is_active")} type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input {...register("is_featured")} type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-gray-700">Featured</span>
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

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl w-full max-w-sm p-6 animate-scale-in" style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)" }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product?</h3>
            <p className="text-gray-500 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="btn btn-outline btn-md">Cancel</button>
              <button onClick={handleDelete} className="btn btn-md bg-red-600 hover:bg-red-700 text-white border-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
