"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Save,
  Loader2,
  Check,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  adminApi,
  adminBlogApi,
  productsApi,
  servicesAdminApi,
} from "@/lib/api";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import {
  BRAND_IMAGE_SLOTS,
  PAGE_BANNER_SLOTS,
  CATALOG_IMAGE_SECTIONS,
  MEDIA_UPLOAD_FOLDER,
  type ImageSlotDef,
} from "@/lib/imageRegistry";
import type { Product, Service, BlogPost } from "@/types";

type TabId = "brand" | "banners" | "catalog";
type SettingValues = Record<string, string>;

const TABS: { id: TabId; label: string; labelBn: string }[] = [
  { id: "brand", label: "Brand & Site", labelBn: "ব্র্যান্ড" },
  { id: "banners", label: "Page Banners", labelBn: "পেজ ব্যানার" },
  { id: "catalog", label: "Catalog", labelBn: "ক্যাটালগ" },
];

function SlotEditor({
  slot,
  value,
  onChange,
}: {
  slot: ImageSlotDef;
  value: string;
  onChange: (url: string) => void;
}) {
  return (
    <div className="px-4 sm:px-6 py-4 border-b border-gray-50 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{slot.label}</p>
          <p className="text-xs text-gray-400">{slot.labelBn}{slot.usedOn ? ` · ${slot.usedOn}` : ""}</p>
        </div>
      </div>
      <ImageUpload
        value={value}
        onChange={onChange}
        folder={MEDIA_UPLOAD_FOLDER}
        hint={slot.hint}
        guide={slot.guide}
        previewSize="lg"
        accept="both"
      />
    </div>
  );
}

export default function AdminMediaPage() {
  const toast = useToastStore((s) => s.push);
  const [tab, setTab] = useState<TabId>("brand");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<SettingValues>({});

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [reviews, setReviews] = useState<{ id: string; customer_name: string; photo_url: string | null }[]>([]);
  const [catalogOpen, setCatalogOpen] = useState<Record<string, boolean>>({});
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Only settings load up front — the heavy catalog lists (products,
      // services, blog, reviews) are fetched lazily when the Catalog tab opens.
      const settingsRes = await adminApi.getSettings();
      const s = settingsRes.data.data ?? {};
      setValues(s);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load media"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [productsRes, servicesRes, blogRes, reviewsRes] = await Promise.all([
        productsApi.adminList({ page: 1, per_page: 100 }),
        servicesAdminApi.list({ page: 1, per_page: 100 }),
        adminBlogApi.list({ page: 1, per_page: 100 }),
        api.get("/api/v1/reviews/admin", { params: { page: 1, per_page: 100 } }),
      ]);
      setProducts(productsRes.data.data ?? []);
      setServices(servicesRes.data.data ?? []);
      setPosts(blogRes.data.data ?? []);
      setReviews((reviewsRes.data.data ?? []) as typeof reviews);
      setCatalogLoaded(true);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load catalog images"));
    } finally {
      setCatalogLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch catalog lists the first time the Catalog tab is opened.
  useEffect(() => {
    if (tab === "catalog" && !catalogLoaded && !catalogLoading) void loadCatalog();
  }, [tab, catalogLoaded, catalogLoading, loadCatalog]);

  const saveSettings = async (sectionId: string, items: { key: string; value: string; data_type?: string }[]) => {
    setSaving(sectionId);
    setSaved(null);
    try {
      await adminApi.upsertSettings(items);
      setSaved(sectionId);
      toast("success", "Images saved");
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Save failed"));
    } finally {
      setSaving(null);
    }
  };

  const saveBrand = () =>
    saveSettings(
      "brand",
      BRAND_IMAGE_SLOTS.map((slot) => ({
        key: slot.key,
        value: values[slot.key] ?? "",
        data_type: "string",
      }))
    );

  const saveBanners = () =>
    saveSettings(
      "banners",
      PAGE_BANNER_SLOTS.map((slot) => ({
        key: slot.key,
        value: values[slot.key] ?? "",
        data_type: "string",
      }))
    );

  const filteredBanners = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PAGE_BANNER_SLOTS;
    return PAGE_BANNER_SLOTS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.labelBn.includes(q) || s.usedOn?.toLowerCase().includes(q)
    );
  }, [search]);

  const patchProduct = async (id: string, data: Partial<Product>) => {
    try {
      await productsApi.update(id, data);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      toast("success", "Product image updated");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Update failed"));
    }
  };

  const patchService = async (id: string, data: Partial<Service>) => {
    try {
      await servicesAdminApi.update(id, data);
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
      toast("success", "Service image updated");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Update failed"));
    }
  };

  const patchBlog = async (id: string, data: Partial<BlogPost>) => {
    try {
      await adminBlogApi.update(id, data);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      toast("success", "Blog image updated");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Update failed"));
    }
  };

  const patchProductImage = (id: string, image_url: string) => patchProduct(id, { image_url });

  const patchServiceImage = (id: string, featured_image_url: string) =>
    patchService(id, { featured_image_url });

  const patchBlogImage = (id: string, featured_image_url: string) =>
    patchBlog(id, { featured_image_url });

  const patchReviewPhoto = async (id: string, photo_url: string) => {
    try {
      await api.patch(`/api/v1/reviews/${id}`, { photo_url: photo_url || null });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, photo_url: photo_url || null } : r)));
      toast("success", "Review photo updated");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Update failed"));
    }
  };

  const SectionHeader = ({
    title,
    titleBn,
    sectionId,
    onSave,
    extra,
  }: {
    title: string;
    titleBn: string;
    sectionId: string;
    onSave: () => void;
    extra?: React.ReactNode;
  }) => {
    const isSaving = saving === sectionId;
    const isSaved = saved === sectionId;
    return (
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-400">{titleBn}</p>
        </div>
        <div className="flex items-center gap-2">
          {extra}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isSaved ? "bg-green-500 text-white" : "bg-brand-600 text-white hover:bg-brand-700"
            } disabled:opacity-60`}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? "Saving…" : isSaved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Image Manager"
        titleBn="ছবি ব্যবস্থাপনা"
        description="Upload, update, or remove brand, banner & catalog images — products, services, blog & reviews."
      />

      <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-xs text-gray-600 leading-relaxed">
        <p className="font-semibold text-brand-800 mb-0.5">📸 ব্র্যান্ড, ব্যানার ও ক্যাটালগ ছবির জায়গা</p>
        <p>
          এখানে ছবি বদলালে <strong>মূল ওয়েবসাইটে সাথে সাথে পরিবর্তন হয়</strong> · সাপোর্টেড: JPG, PNG, WebP (সর্বোচ্চ 5MB) ·
          আপলোডের সময় <strong>অটো-অপ্টিমাইজ</strong> হয় (কোয়ালিটি ও ফরম্যাট) · আপলোডের আগে প্রিভিউ দেখে নিশ্চিত করুন ·
          প্রতিটি অপশনের নিচে সুপারিশকৃত সাইজ ও ফরম্যাট দেওয়া আছে।
        </p>
        <p className="mt-1.5 text-gray-500">
          টিম, ক্লায়েন্ট ও রিভিউ ছবি (বর্ণনা সহ) এখন{" "}
          <Link href="/admin/settings" className="text-brand-600 font-medium hover:underline">Settings → Trust Assets</Link>-এ,
          আর প্রজেক্ট ও সফটওয়্যার কার্ড{" "}
          <Link href="/admin/showcase" className="text-brand-600 font-medium hover:underline">Showcase</Link>-এ একসাথে সম্পাদনা হয়।
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-brand-300"
            }`}
          >
            {t.label}
            <span className="hidden sm:inline text-white/70 ml-1">/ {t.labelBn}</span>
          </button>
        ))}
      </div>

      {tab === "brand" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader title="Brand & Site Images" titleBn="ব্র্যান্ড ও সাইট ছবি" sectionId="brand" onSave={saveBrand} />
          {BRAND_IMAGE_SLOTS.map((slot) => (
            <SlotEditor
              key={slot.key}
              slot={slot}
              value={values[slot.key] ?? ""}
              onChange={(url) => setValues((v) => ({ ...v, [slot.key]: url }))}
            />
          ))}
        </div>
      )}

      {tab === "banners" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Page Banner Images"
            titleBn="পেজ ব্যানার ছবি (২৫টি)"
            sectionId="banners"
            onSave={saveBanners}
            extra={
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search page…"
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-40 sm:w-52"
                />
              </div>
            }
          />
          {filteredBanners.map((slot) => (
            <SlotEditor
              key={slot.key}
              slot={slot}
              value={values[slot.key] ?? ""}
              onChange={(url) => setValues((v) => ({ ...v, [slot.key]: url }))}
            />
          ))}
        </div>
      )}

      {tab === "catalog" && catalogLoading && !catalogLoaded && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        </div>
      )}

      {tab === "catalog" && catalogLoaded && (
        <div className="space-y-4">
          {CATALOG_IMAGE_SECTIONS.map((section) => {
            const open = catalogOpen[section.id] ?? true;
            const count =
              section.id === "products"
                ? products.length
                : section.id === "services"
                  ? services.length
                  : section.id === "blog"
                    ? posts.length
                    : reviews.length;

            return (
              <div key={section.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCatalogOpen((o) => ({ ...o, [section.id]: !open }))}
                  className="w-full flex items-center justify-between px-4 sm:px-6 py-4 bg-gray-50/50 hover:bg-gray-50"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">{section.label} ({count})</p>
                    <p className="text-xs text-gray-400">{section.labelBn}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={section.adminHref}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                    >
                      Full editor <ExternalLink className="w-3 h-3" />
                    </Link>
                    {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {open && (
                  <div className="divide-y divide-gray-50">
                    {section.id === "products" &&
                      products.map((p) =>
                        p.id ? (
                          <div key={p.id} className="px-4 sm:px-6 py-4 space-y-3">
                            <p className="text-sm font-medium text-gray-800">{p.name_en}</p>
                            <p className="text-xs text-gray-400">Main image</p>
                            <ImageUpload
                              value={p.image_url ?? ""}
                              onChange={(url) => patchProductImage(p.id!, url)}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="md"
                            />
                            <p className="text-xs text-gray-400">Gallery images</p>
                            {(p.images ?? []).map((img, gi) => (
                              <ImageUpload
                                key={gi}
                                value={img}
                                onChange={(url) => {
                                  const next = [...(p.images ?? [])];
                                  next[gi] = url;
                                  patchProduct(p.id!, { images: next.filter(Boolean) });
                                }}
                                folder={MEDIA_UPLOAD_FOLDER}
                                previewSize="sm"
                              />
                            ))}
                            <button
                              type="button"
                              onClick={() => patchProduct(p.id!, { images: [...(p.images ?? []), ""] })}
                              className="text-xs text-brand-600 hover:underline"
                            >
                              + Add gallery image
                            </button>
                            <p className="text-xs text-gray-400">Social share (OG)</p>
                            <ImageUpload
                              value={p.og_image ?? ""}
                              onChange={(url) => patchProduct(p.id!, { og_image: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                            />
                          </div>
                        ) : null
                      )}

                    {section.id === "services" &&
                      services.map((s) =>
                        s.id ? (
                          <div key={s.id} className="px-4 sm:px-6 py-4 space-y-3">
                            <p className="text-sm font-medium text-gray-800">{s.name_en}</p>
                            <p className="text-xs text-gray-400">Featured image</p>
                            <ImageUpload
                              value={s.featured_image_url ?? ""}
                              onChange={(url) => patchServiceImage(s.id!, url)}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="md"
                            />
                            <p className="text-xs text-gray-400">Icon image</p>
                            <ImageUpload
                              value={s.icon_url ?? ""}
                              onChange={(url) => patchService(s.id!, { icon_url: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                            />
                            <p className="text-xs text-gray-400">Social share (OG)</p>
                            <ImageUpload
                              value={s.og_image ?? ""}
                              onChange={(url) => patchService(s.id!, { og_image: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                            />
                          </div>
                        ) : null
                      )}

                    {section.id === "blog" &&
                      posts.map((post) =>
                        post.id ? (
                          <div key={post.id} className="px-4 sm:px-6 py-4 space-y-3">
                            <p className="text-sm font-medium text-gray-800">{post.title_en}</p>
                            <p className="text-xs text-gray-400">Featured image</p>
                            <ImageUpload
                              value={post.featured_image_url ?? ""}
                              onChange={(url) => patchBlogImage(post.id!, url)}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="md"
                            />
                            <p className="text-xs text-gray-400">Social share (OG)</p>
                            <ImageUpload
                              value={post.og_image ?? ""}
                              onChange={(url) => patchBlog(post.id!, { og_image: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                            />
                          </div>
                        ) : null
                      )}

                    {section.id === "reviews" &&
                      reviews.map((r) => (
                        <div key={r.id} className="px-4 sm:px-6 py-4">
                          <p className="text-sm font-medium text-gray-800 mb-2">{r.customer_name}</p>
                          <ImageUpload
                            value={r.photo_url ?? ""}
                            onChange={(url) => patchReviewPhoto(r.id, url)}
                            folder={MEDIA_UPLOAD_FOLDER}
                            previewSize="sm"
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
