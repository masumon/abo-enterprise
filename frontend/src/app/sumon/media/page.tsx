"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Save,
  Loader2,
  Check,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  X,
  ImageOff,
  Upload,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImageUpload from "@/components/admin/ImageUpload";
import LivePreview from "@/components/admin/LivePreview";
import BannerDevicePreview, { BannerGuide } from "@/components/admin/BannerDevicePreview";
import AutoVideo from "@/components/ui/AutoVideo";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { isVideoUrl } from "@/lib/media";
import {
  adminApi,
  adminBlogApi,
  productsApi,
  servicesAdminApi,
  type MediaAssetRecord,
  type MediaUse,
} from "@/lib/api";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import {
  BRAND_IMAGE_SLOTS,
  HERO_IMAGE_SLOTS,
  HERO_SLOT_KEYS,
  PAGE_BANNER_SLOTS,
  CATALOG_IMAGE_SECTIONS,
  MEDIA_UPLOAD_FOLDER,
  type ImageSlotDef,
} from "@/lib/imageRegistry";
import type { Product, Service, BlogPost } from "@/types";

type TabId = "brand" | "banners" | "catalog" | "library";
type SettingValues = Record<string, string>;

const TABS: { id: TabId; label: string; labelBn: string }[] = [
  { id: "brand", label: "Brand & Site", labelBn: "ব্র্যান্ড" },
  { id: "banners", label: "Page Banners", labelBn: "পেজ ব্যানার" },
  { id: "catalog", label: "Catalog", labelBn: "ক্যাটালগ" },
  { id: "library", label: "Media Library", labelBn: "মিডিয়া লাইব্রেরি" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaEl({ url, className }: { url: string; className?: string }) {
  if (isVideoUrl(url)) return <AutoVideo src={url} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element -- live admin context preview
  return <img src={url} alt="" className={className} />;
}

/** Hero images are edited only in "হোমপেজ সাজান" — here they are shown
 * read-only with a link, so nothing is edited in two places. */
function HeroMovedNotice({ values }: { values: SettingValues }) {
  return (
    <div className="px-4 sm:px-6 py-4 border-b border-gray-50">
      <Link
        href="/sumon/homepage#hero"
        className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 dark:border-brand-400/30 bg-brand-50/60 dark:bg-brand-500/10 p-3 hover:border-brand-400 transition-colors"
      >
        <div className="flex gap-1.5 flex-none">
          {HERO_IMAGE_SLOTS.map((slot) => (
            <span key={slot.key} className="w-14 h-9 rounded-md overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center" title={slot.labelBn}>
              {values[slot.key] ? <MediaEl url={values[slot.key]} className="w-full h-full object-cover" /> : <ImageOff className="w-3.5 h-3.5 text-white/70" />}
            </span>
          ))}
        </div>
        <span className="min-w-0 flex-1 text-xs">
          <span className="block text-sm font-semibold text-brand-800 dark:text-brand-200">হিরো ব্যানার এখন &quot;হোমপেজ সাজান&quot;-এ</span>
          <span className="block text-gray-500 dark:text-gray-400">ডেস্কটপ ব্যানার, মোবাইল ব্যানার ও প্রোমো মিডিয়া — লেখা ও প্রিভিউসহ এক জায়গায় বদলান।</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
          খুলুন <ExternalLink className="w-3.5 h-3.5" />
        </span>
      </Link>
    </div>
  );
}

/** "As it appears on the website" context for the well-known brand slots. */
function SlotContextPreview({ slotKey, value }: { slotKey: string; value: string }) {
  if (!value) return null;
  let content: React.ReactNode = null;
  if (slotKey === "logo_url") {
    content = (
      <div className="flex items-center gap-2 bg-white dark:bg-[#0b1f3a] rounded-full px-4 py-2 shadow border border-gray-100 dark:border-white/10 w-fit">
        <MediaEl url={value} className="w-8 h-8 rounded-full object-contain" />
        <span className="font-bold text-heading text-sm">ABO Enterprise</span>
      </div>
    );
  } else if (slotKey === "favicon_url" || slotKey === "app_icon_url") {
    content = (
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/10 rounded-t-lg px-3 py-1.5 w-fit">
        <MediaEl url={value} className="w-4 h-4 object-contain rounded" />
        <span className="text-xs text-heading">aboenterprise.com</span>
      </div>
    );
  } else if (slotKey === "default_og_image_url") {
    content = (
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 max-w-sm">
        <div className="aspect-[1.91/1] bg-gray-100 dark:bg-white/5"><MediaEl url={value} className="w-full h-full object-cover" /></div>
        <div className="p-3 bg-white dark:bg-white/5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">aboenterprise.com</p>
          <p className="font-semibold text-sm text-heading">ABO Enterprise — Simple Solution</p>
        </div>
      </div>
    );
  } else if (slotKey.includes("hero") || slotKey.includes("login_bg") || slotKey.startsWith("banner_")) {
    content = (
      <div className="relative rounded-xl overflow-hidden aspect-video max-w-sm bg-gradient-to-br from-brand-700 to-brand-950">
        <MediaEl url={value} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute bottom-2 left-3 text-white font-bold text-sm drop-shadow">ABO Enterprise</div>
      </div>
    );
  } else {
    return null;
  }
  return (
    <div className="mt-3">
      <LivePreview showDevice={false}>
        <div className="pointer-events-none">{content}</div>
      </LivePreview>
    </div>
  );
}

/** Module-scope (not nested in AdminMediaPage) so its identity is stable
 * across renders — nesting it caused React to remount the whole subtree
 * (including the search <input> passed via `extra`) on every keystroke,
 * which dismissed the on-screen keyboard on mobile after one character. */
function SectionHeader({
  title,
  titleBn,
  sectionId,
  onSave,
  saving,
  saved,
  extra,
}: {
  title: string;
  titleBn: string;
  sectionId: string;
  onSave: () => void;
  saving: string | null;
  saved: string | null;
  extra?: React.ReactNode;
}) {
  const isSaving = saving === sectionId;
  const isSaved = saved === sectionId;
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 gap-3 flex-wrap">
      <div>
        <h2 className="text-sm font-semibold text-gray-800">{titleBn}</h2>
        <p className="text-xs text-gray-400">{title}</p>
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
}

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
        purpose={slot.purpose}
        previewSize="lg"
        accept="both"
      />
      {slot.kind ? (
        <>
          <BannerGuide kind={slot.kind} />
          <BannerDevicePreview kind={slot.kind} value={value} title={slot.kind === "page-banner" ? slot.label.replace(/ Banner$/, "") : undefined} />
        </>
      ) : (
        <SlotContextPreview slotKey={slot.key} value={value} />
      )}
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

  const [libraryAssets, setLibraryAssets] = useState<MediaAssetRecord[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryTotalPages, setLibraryTotalPages] = useState(1);
  const [librarySearch, setLibrarySearch] = useState("");
  const [editingAsset, setEditingAsset] = useState<MediaAssetRecord | null>(null);
  const [editAltText, setEditAltText] = useState("");
  const [editTags, setEditTags] = useState("");
  const [savingAsset, setSavingAsset] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaAssetRecord | null>(null);
  // Where-used, unused filter and bulk delete.
  const [usage, setUsage] = useState<Record<string, MediaUse[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unusedIds, setUnusedIds] = useState<Set<string> | null>(null);
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [unusedLoading, setUnusedLoading] = useState(false);
  const [bulkIds, setBulkIds] = useState<string[] | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState(false);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const bulkFileRef = useRef<HTMLInputElement>(null);

  // Every image the live site is actually using, gathered from data already
  // loaded on this page (brand/banner settings + product/service/blog/review
  // images). Shown read-only in the Library so the admin can see the site's
  // real images even when nothing was uploaded through the admin.
  const siteImages = useMemo(() => {
    const out: { url: string; label: string }[] = [];
    const seen = new Set<string>();
    const add = (url: unknown, label: string) => {
      if (typeof url !== "string") return;
      const u = url.trim();
      if (!u || seen.has(u)) return;
      seen.add(u);
      out.push({ url: u, label });
    };
    for (const slot of BRAND_IMAGE_SLOTS) add(values[slot.key] || slot.fallback, slot.label);
    for (const slot of PAGE_BANNER_SLOTS) add(values[slot.key], slot.label);
    for (const p of products) { add(p.image_url, p.name_en || "Product"); (p.images ?? []).forEach((im) => add(im, p.name_en || "Product")); add(p.og_image, p.name_en || "Product"); }
    for (const s of services) { add(s.featured_image_url, s.name_en || "Service"); add(s.icon_url, s.name_en || "Service"); add(s.og_image, s.name_en || "Service"); }
    for (const post of posts) { add(post.featured_image_url, post.title_en || "Blog"); add(post.og_image, post.title_en || "Blog"); }
    for (const r of reviews) add(r.photo_url, r.customer_name || "Review");
    return out.slice(0, 120);
  }, [values, products, services, posts, reviews]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Only settings load up front — the heavy catalog lists (products,
      // services, blog, reviews) are fetched lazily when the Catalog tab opens.
      const settingsRes = await adminApi.getSettings();
      const s = settingsRes.data.data ?? {};
      setValues(s);
    } catch (e) {
      toast("error", apiErrorMessage(e, "ছবি/ফাইল আনা যায়নি"));
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
      toast("error", apiErrorMessage(e, "ক্যাটালগের ছবি আনা যায়নি"));
    } finally {
      setCatalogLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep link: /sumon/media?tab=catalog (used by "কনটেন্ট স্বাস্থ্য").
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && TABS.some((x) => x.id === t)) setTab(t as TabId);
  }, []);

  // Fetch catalog lists the first time the Catalog tab is opened.
  useEffect(() => {
    if (tab === "catalog" && !catalogLoaded && !catalogLoading) void loadCatalog();
  }, [tab, catalogLoaded, catalogLoading, loadCatalog]);

  const loadLibrary = useCallback(async (page: number, search: string) => {
    setLibraryLoading(true);
    try {
      const res = await adminApi.listMedia({ page, per_page: 40, search: search.trim() || undefined });
      setLibraryAssets(res.data.data ?? []);
      setLibraryTotalPages(res.data.meta?.total_pages ?? 1);
      setLibraryLoaded(true);
    } catch (e) {
      toast("error", apiErrorMessage(e, "মিডিয়া লাইব্রেরি আনা যায়নি"));
    } finally {
      setLibraryLoading(false);
    }
  }, [toast]);

  /** Bulk-upload one or more files straight into the library (not tied to any
   * product/service field) — used by the dropzone below. */
  const bulkUpload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setBulkUploading(true);
    setBulkProgress({ done: 0, total: list.length });
    let failed = 0;
    for (const file of list) {
      try {
        await adminApi.uploadImage(file, MEDIA_UPLOAD_FOLDER);
      } catch {
        failed += 1;
      } finally {
        setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    }
    setBulkUploading(false);
    if (failed > 0) toast("error", `${list.length}টির মধ্যে ${failed}টি ফাইল আপলোড হয়নি`);
    else toast("success", `${list.length}টি ফাইল আপলোড হয়েছে`);
    setLibraryPage(1);
    await loadLibrary(1, librarySearch);
  };

  // Fetch the asset library the first time its tab is opened. Also pull the
  // catalog once, so the "used on the site" gallery can include product /
  // service / blog / review images (not just brand & banner settings).
  useEffect(() => {
    if (tab === "library" && !libraryLoaded && !libraryLoading) void loadLibrary(1, "");
    if (tab === "library" && !catalogLoaded && !catalogLoading) void loadCatalog();
  }, [tab, libraryLoaded, libraryLoading, loadLibrary, catalogLoaded, catalogLoading, loadCatalog]);

  const openEditAsset = (asset: MediaAssetRecord) => {
    setEditingAsset(asset);
    setEditAltText(asset.alt_text ?? "");
    setEditTags((asset.tags ?? []).join(", "));
  };

  const saveAssetEdit = async () => {
    if (!editingAsset) return;
    setSavingAsset(true);
    try {
      const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean);
      await adminApi.updateMediaAsset(editingAsset.id, { alt_text: editAltText.trim(), tags });
      setLibraryAssets((prev) =>
        prev.map((a) => (a.id === editingAsset.id ? { ...a, alt_text: editAltText.trim(), tags } : a))
      );
      toast("success", "ফাইল আপডেট হয়েছে");
      setEditingAsset(null);
    } catch (e) {
      toast("error", apiErrorMessage(e, "ফাইল আপডেট করা যায়নি"));
    } finally {
      setSavingAsset(false);
    }
  };

  // Load "where used" for the files on this page.
  useEffect(() => {
    const ids = libraryAssets.map((a) => a.id).filter((id) => !(id in usage));
    if (!ids.length) return;
    let alive = true;
    adminApi.mediaUsage(ids)
      .then((r) => { if (alive) setUsage((u) => ({ ...u, ...(r.data.data ?? {}) })); })
      .catch(() => { /* badge just stays hidden */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryAssets]);

  const toggleUnused = async () => {
    if (unusedOnly) { setUnusedOnly(false); return; }
    setUnusedLoading(true);
    try {
      const r = await adminApi.mediaUnused();
      setUnusedIds(new Set(r.data.data?.ids ?? []));
      setUnusedOnly(true);
    } catch (e) {
      toast("error", apiErrorMessage(e, "অব্যবহৃত ফাইল খোঁজা যায়নি"));
    } finally {
      setUnusedLoading(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (!bulkIds?.length) return;
    setBulkDeleting(true);
    try {
      const r = await adminApi.mediaBulkDelete(bulkIds);
      const d = r.data.data;
      const gone = new Set(d?.deleted ?? []);
      setLibraryAssets((prev) => prev.filter((a) => !gone.has(a.id)));
      setSelected(new Set());
      setUnusedIds((u) => (u ? new Set([...u].filter((id) => !gone.has(id))) : u));
      toast("success", `${gone.size}টি ফাইল মুছে ফেলা হয়েছে (Cloudinary থেকেও)` + ((d?.skipped_in_use.length ?? 0) ? ` · ব্যবহৃত ${d?.skipped_in_use.length}টি রাখা হয়েছে` : ""));
      setBulkIds(null);
    } catch (e) {
      toast("error", apiErrorMessage(e, "মুছে ফেলা যায়নি"));
    } finally {
      setBulkDeleting(false);
    }
  };

  const shownAssets = unusedOnly && unusedIds ? libraryAssets.filter((a) => unusedIds.has(a.id)) : libraryAssets;

  const confirmDeleteAsset = async () => {
    if (!deleteTarget) return;
    setDeletingAsset(true);
    try {
      await adminApi.deleteMediaAsset(deleteTarget.id);
      setLibraryAssets((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast("success", "ফাইল মুছে ফেলা হয়েছে (Cloudinary থেকেও)");
      setDeleteTarget(null);
    } catch (e) {
      toast("error", apiErrorMessage(e, "ফাইল মুছে ফেলা যায়নি"));
    } finally {
      setDeletingAsset(false);
    }
  };

  const saveSettings = async (sectionId: string, items: { key: string; value: string; data_type?: string }[]) => {
    setSaving(sectionId);
    setSaved(null);
    try {
      await adminApi.upsertSettings(items);
      setSaved(sectionId);
      toast("success", "ছবি সংরক্ষিত হয়েছে");
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      toast("error", apiErrorMessage(e, "সংরক্ষণ করা যায়নি"));
    } finally {
      setSaving(null);
    }
  };

  const saveBrand = () =>
    saveSettings(
      "brand",
      // Hero keys are owned by /sumon/homepage — never re-save a stale copy here.
      BRAND_IMAGE_SLOTS.filter((slot) => !HERO_SLOT_KEYS.has(slot.key)).map((slot) => ({
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
      toast("success", "পণ্যের ছবি আপডেট হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "আপডেট করা যায়নি"));
    }
  };

  const patchService = async (id: string, data: Partial<Service>) => {
    try {
      await servicesAdminApi.update(id, data);
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
      toast("success", "সেবার ছবি আপডেট হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "আপডেট করা যায়নি"));
    }
  };

  const patchBlog = async (id: string, data: Partial<BlogPost>) => {
    try {
      await adminBlogApi.update(id, data);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      toast("success", "ব্লগের ছবি আপডেট হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "আপডেট করা যায়নি"));
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
      toast("success", "রিভিউর ছবি আপডেট হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "আপডেট করা যায়নি"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Image Manager"
        titleBn="ছবি ব্যবস্থাপনা"
        description="Upload, update, or remove brand, banner & catalog images — products, services, blog & reviews."
        descriptionBn="ছবি ও ভিডিওর লাইব্রেরি — ব্র্যান্ড, পেজ ব্যানার, পণ্য, সেবা, ব্লগ ও রিভিউর ছবি এখানে বদলান।"
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
          <Link href="/sumon/settings" className="text-brand-600 font-medium hover:underline">Settings → Trust Assets</Link>-এ,
          প্রজেক্ট ও সফটওয়্যার কার্ড{" "}
          <Link href="/sumon/showcase" className="text-brand-600 font-medium hover:underline">Showcase</Link>-এ, আর হোমপেজের
          হিরো ব্যানার ও স্লাইড{" "}
          <Link href="/sumon/homepage" className="text-brand-600 font-medium hover:underline">হোমপেজ সাজান</Link>-এ
          একসাথে সম্পাদনা হয়।
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
        <div className="admin-surface bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader title="Brand & Site Images" titleBn="ব্র্যান্ড ও সাইট ছবি" sectionId="brand" onSave={saveBrand} saving={saving} saved={saved} />
          <HeroMovedNotice values={values} />
          {BRAND_IMAGE_SLOTS.filter((slot) => !HERO_SLOT_KEYS.has(slot.key)).map((slot) => (
            <SlotEditor
              key={slot.key}
              slot={slot}
              // Show the live fallback (e.g. /logo.png) as the current preview
              // when nothing is saved — display only, so an untouched slot is
              // never written to the DB on save.
              value={values[slot.key] || slot.fallback || ""}
              onChange={(url) => setValues((v) => ({ ...v, [slot.key]: url }))}
            />
          ))}
        </div>
      )}

      {tab === "banners" && (
        <div className="admin-surface bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Page Banner Images"
            titleBn="পেজ ব্যানার ছবি (২৫টি)"
            sectionId="banners"
            onSave={saveBanners}
            saving={saving}
            saved={saved}
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
              <div key={section.id} className="admin-surface bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                              purpose="product-main"
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
                                purpose="product-gallery"
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
                              purpose="product-og"
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
                              purpose="service-image"
                            />
                            <p className="text-xs text-gray-400">Icon image</p>
                            <ImageUpload
                              value={s.icon_url ?? ""}
                              onChange={(url) => patchService(s.id!, { icon_url: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                              purpose="service-icon"
                            />
                            <p className="text-xs text-gray-400">Social share (OG)</p>
                            <ImageUpload
                              value={s.og_image ?? ""}
                              onChange={(url) => patchService(s.id!, { og_image: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                              purpose="og-image"
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
                              purpose="blog-cover"
                            />
                            <p className="text-xs text-gray-400">Social share (OG)</p>
                            <ImageUpload
                              value={post.og_image ?? ""}
                              onChange={(url) => patchBlog(post.id!, { og_image: url })}
                              folder={MEDIA_UPLOAD_FOLDER}
                              previewSize="sm"
                              purpose="og-image"
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
                            purpose="testimonial"
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

      {tab === "library" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setBulkDragOver(true); }}
            onDragLeave={() => setBulkDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setBulkDragOver(false);
              if (e.dataTransfer.files?.length) void bulkUpload(e.dataTransfer.files);
            }}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              bulkDragOver ? "border-brand-500 bg-brand-50/60" : "border-gray-200 hover:border-brand-300"
            }`}
          >
            {bulkUploading ? (
              <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                Uploading {bulkProgress.done} of {bulkProgress.total}…
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Drag & drop images or videos here, or{" "}
                  <button type="button" onClick={() => bulkFileRef.current?.click()} className="text-brand-600 font-semibold hover:underline">
                    browse files
                  </button>
                </p>
                <p className="text-xs text-gray-400 mt-1">Multiple files supported — uploaded straight into the library</p>
              </>
            )}
            <input
              ref={bulkFileRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) void bulkUpload(e.target.files); e.target.value = ""; }}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setLibraryPage(1); void loadLibrary(1, librarySearch); } }}
                placeholder="Search by filename…"
                className="input pl-9 w-full"
              />
            </div>
            <button
              type="button"
              onClick={() => { setLibraryPage(1); void loadLibrary(1, librarySearch); }}
              className="btn btn-outline btn-sm"
            >
              খুঁজুন
            </button>
          </div>

          {/* Read-only: every image the live site is currently using, so the
              Library is never misleadingly empty. */}
          {siteImages.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-800 mb-1">সাইটে ব্যবহৃত ছবি · Currently used on the site</p>
              <p className="text-xs text-gray-400 mb-3">রিড-অনলি — সেটিংস/পণ্য/সেবা/ব্লগ থেকে স্বয়ংক্রিয়ভাবে নেওয়া।</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {siteImages.map((img) => (
                  <div key={img.url} className="admin-surface bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                      <MediaEl url={img.url} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] text-gray-500 truncate px-2 py-1.5" title={img.label}>{img.label}</p>
                  </div>
                ))}
              </div>
              <div className="h-px bg-gray-100 mt-6" />
            </div>
          )}

          {libraryLoading && !libraryLoaded ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="admin-surface flex flex-wrap items-center gap-2 mb-4 rounded-xl border border-[var(--line)] bg-white dark:bg-white/5 p-2">
              <label className="flex items-center gap-2 text-sm px-2 min-h-11 cursor-pointer">
                <input type="checkbox" className="rounded" checked={shownAssets.length > 0 && shownAssets.every((a) => selected.has(a.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(shownAssets.map((a) => a.id)) : new Set())} />
                সব বাছাই
              </label>
              <button type="button" onClick={toggleUnused} disabled={unusedLoading}
                className={`btn btn-sm min-h-11 gap-1.5 ${unusedOnly ? "btn-brand" : "btn-outline"}`}>
                {unusedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} ⚪ শুধু অব্যবহৃত {unusedIds ? `(${unusedIds.size})` : ""}
              </button>
              {selected.size > 0 && (
                <button type="button" onClick={() => setBulkIds([...selected])} className="btn btn-sm min-h-11 gap-1.5 border border-red-300 text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" /> বাছাই করা {selected.size}টি মুছুন
                </button>
              )}
              {unusedOnly && unusedIds && unusedIds.size > 0 && (
                <button type="button" onClick={() => setBulkIds([...unusedIds])} className="btn btn-sm min-h-11 gap-1.5 border border-red-300 text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" /> সব অব্যবহৃত ({unusedIds.size}টি) মুছুন
                </button>
              )}
              <p className="w-full text-[11px] text-muted px-2">মুছলে Cloudinary থেকেও মুছে যায়। একসাথে মোছার সময় সাইটে ব্যবহৃত ফাইল নিজে থেকে বাদ থাকে।</p>
            </div>
          )}
          {libraryLoading && !libraryLoaded ? null : shownAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
              <ImageOff className="w-8 h-8" />
              <p className="text-sm">{siteImages.length > 0 ? "অ্যাডমিন থেকে আপলোড করা আলাদা কোনো ছবি নেই" : "No uploaded assets found"}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {shownAssets.map((asset) => (
                  <div key={asset.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${selected.has(asset.id) ? "border-brand-500 ring-1 ring-brand-500" : "border-gray-100"}`}>
                    <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                      <MediaEl url={asset.url} className="w-full h-full object-cover" />
                      <label className="absolute top-1 left-1 flex items-center justify-center min-h-11 min-w-11 cursor-pointer" aria-label={`বাছাই: ${asset.filename}`}>
                        <input type="checkbox" className="w-5 h-5 rounded shadow" checked={selected.has(asset.id)}
                          onChange={() => setSelected((cur) => { const n = new Set(cur); if (n.has(asset.id)) n.delete(asset.id); else n.add(asset.id); return n; })} />
                      </label>
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="text-xs font-medium text-gray-800 truncate" title={asset.filename}>
                        {asset.filename}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {formatBytes(asset.size)}
                        {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                      </p>
                      {usage[asset.id] && (
                        usage[asset.id].length > 0 ? (
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-snug" title={usage[asset.id].map((u) => `${u.kind}: ${u.name}`).join("\n")}>
                            ✅ ব্যবহৃত: {usage[asset.id][0].admin_url
                              ? <a href={usage[asset.id][0].admin_url!} className="underline">{usage[asset.id][0].kind}{usage[asset.id][0].name ? ` — ${usage[asset.id][0].name}` : ""}</a>
                              : <>{usage[asset.id][0].kind}{usage[asset.id][0].name ? ` — ${usage[asset.id][0].name}` : ""}</>}
                            {usage[asset.id].length > 1 ? ` +${usage[asset.id].length - 1}` : ""}
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-400">⚪ কোথাও ব্যবহার হচ্ছে না</p>
                        )
                      )}
                      {asset.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {asset.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openEditAsset(asset)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600"
                        >
                          <Pencil className="w-3 h-3" /> সম্পাদনা
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(asset)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-gray-200 text-red-500 hover:border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" /> মুছুন
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {libraryTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={libraryPage === 1 || libraryLoading}
                    onClick={() => { const p = libraryPage - 1; setLibraryPage(p); void loadLibrary(p, librarySearch); }}
                    className="btn btn-outline btn-sm disabled:opacity-50"
                  >
                    আগের
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg border border-gray-200">
                    Page {libraryPage} of {libraryTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={libraryPage >= libraryTotalPages || libraryLoading}
                    onClick={() => { const p = libraryPage + 1; setLibraryPage(p); void loadLibrary(p, librarySearch); }}
                    className="btn btn-outline btn-sm disabled:opacity-50"
                  >
                    পরের
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {editingAsset && (
        <div className="admin-overlay admin-overlay--panel fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 max-[640px]:items-end max-[640px]:p-0" onClick={() => setEditingAsset(null)}>
          <div className="admin-sheet admin-sheet--m bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto max-[640px]:max-h-[94dvh] max-[640px]:rounded-b-none max-[640px]:rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-heading">Edit Asset</h3>
              <button aria-label="বন্ধ করুন" type="button" onClick={() => setEditingAsset(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <MediaEl url={editingAsset.url} className="w-full h-40 object-cover rounded-lg bg-gray-50" />
            <div>
              <label htmlFor="asset-alt-text" className="block text-xs font-semibold text-gray-600 mb-1">Alt text</label>
              <input
                id="asset-alt-text"
                type="text"
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                className="input w-full"
                placeholder="Describe this image for accessibility/SEO"
              />
            </div>
            <div>
              <label htmlFor="asset-tags" className="block text-xs font-semibold text-gray-600 mb-1">Tags (comma-separated)</label>
              <input
                id="asset-tags"
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="input w-full"
                placeholder="banner, homepage, promo"
              />
            </div>
            <div className="flex justify-end gap-2 flex-wrap">
              <button type="button" onClick={() => setEditingAsset(null)} className="btn btn-outline btn-sm">বাতিল</button>
              <button type="button" onClick={saveAssetEdit} disabled={savingAsset} className="btn btn-brand btn-sm disabled:opacity-60">
                {savingAsset ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Asset"
        message={deleteTarget && usage[deleteTarget.id]?.length
          ? `সাবধান! “${deleteTarget.filename}” এখন ব্যবহার হচ্ছে: ${usage[deleteTarget.id].map((u) => `${u.kind}${u.name ? ` (${u.name})` : ""}`).join(", ")}। মুছলে সেখানে ছবি ভাঙা দেখাবে, আর Cloudinary থেকেও মুছে যাবে।`
          : `“${deleteTarget?.filename}” মুছবেন? লাইব্রেরি ও Cloudinary — দুই জায়গা থেকেই মুছে যাবে।`}
        confirmLabel={deletingAsset ? "Deleting…" : "Delete"}
        variant="danger"
        onConfirm={confirmDeleteAsset}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!bulkIds}
        title={`${bulkIds?.length ?? 0}টি ফাইল মুছবেন?`}
        message="লাইব্রেরি ও Cloudinary — দুই জায়গা থেকেই মুছে যাবে। সাইটে ব্যবহৃত কোনো ফাইল থাকলে সেটি নিরাপত্তার জন্য রেখে দেওয়া হবে।"
        confirmLabel={bulkDeleting ? "মুছছে…" : "মুছে ফেলুন"}
        variant="danger"
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkIds(null)}
      />
    </div>
  );
}
