"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, Loader2, Languages, Save, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";
import { productsApi, adminBlogApi, type AiDescription } from "@/lib/api";
import { productAdminApi, toSlug, shortId, type DupMatch } from "@/lib/catalogAdminApi";
import { apiErrorMessage } from "@/lib/apiError";
import { parseDhakaDateTime, storedToDhakaInput } from "@/lib/flashSale";
import { translateBnToEn } from "@/lib/translate";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toast";
import type { Product } from "@/types";
import AiDescribeButton from "@/components/admin/AiDescribeButton";
import ImageUpload from "@/components/admin/ImageUpload";
import TranslateButton from "@/components/admin/TranslateButton";
import LivePreview from "@/components/admin/LivePreview";
import LinkChecklist, { type LinkOption } from "@/components/admin/LinkChecklist";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ProductCard from "@/components/features/ProductCard";
import StepForm from "@/components/admin/catalog/StepForm";
import PublishChecklist from "@/components/admin/catalog/PublishChecklist";
import AdvancedSection from "@/components/admin/catalog/AdvancedSection";
import DuplicateNotice, { useDuplicateCheck } from "@/components/admin/catalog/DuplicateNotice";
import { useBnEn } from "@/components/admin/catalog/useBnEn";

const BADGES = ["", "HOT", "NEW", "SALE"];

const schema = z.object({
  // Filled from the English name on save when left blank.
  slug: z.string().regex(/^[a-z0-9-]*$/, "ছোট হাতের ইংরেজি, সংখ্যা ও - চিহ্ন (lowercase, numbers, hyphens)").optional(),
  name_en: z.string().min(1, "আবশ্যক (Required)"),
  name_bn: z.string().min(1, "আবশ্যক (Required)"),
  description_en: z.string().optional(),
  description_bn: z.string().optional(),
  // 0 is allowed for a draft; publishing needs a real price (checked on save).
  price: z.coerce.number().min(0, "আবশ্যক (Required)"),
  original_price: z.coerce.number().min(0).optional(),
  cost_price: z.coerce.number().min(0).optional(),
  category: z.string().min(1, "ক্যাটাগরি বাছুন (Required)"),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  badge: z.string().optional(),
  stock_quantity: z.coerce.number().min(0),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  image_url: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
  canonical_url: z.string().optional(),
  og_image: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  sub_category: z.string().optional(),
  tags: z.string().optional(),
  weight: z.coerce.number().optional(),
  warranty_info: z.string().optional(),
  delivery_info: z.string().optional(),
  delivery_charge: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0).optional()),
  requires_advance: z.boolean().optional(),
  is_flash_sale: z.boolean().optional(),
  flash_sale_price: z.coerce.number().optional(),
  flash_sale_ends_at: z.string().optional(),
  low_stock_threshold: z.coerce.number().min(0).optional(),
  is_best_seller: z.boolean().optional(),
  is_bookable: z.boolean().optional(),
}).refine(
  (d) => !d.original_price || d.original_price >= d.price,
  { message: "আগের দাম বিক্রয়মূল্যের সমান বা বেশি হতে হবে (Original price must be ≥ sale price)", path: ["original_price"] }
).refine(
  (d) => !d.flash_sale_price || d.flash_sale_price < d.price,
  { message: "ফ্ল্যাশ সেলের দাম আসল দামের চেয়ে কম হতে হবে", path: ["flash_sale_price"] }
);
type FormData = z.infer<typeof schema>;

export type ProductFormMode = { type: "new" } | { type: "edit"; product: Product } | { type: "clone"; product: Product };

export interface CategoryOpt { slug: string; label: string; id?: string }

const NEW_DEFAULTS: Partial<FormData> = {
  is_active: true, is_featured: false, stock_quantity: 0, image_url: "", slug: "",
  seo_title: "", seo_description: "", seo_keywords: "", canonical_url: "", og_image: "",
  low_stock_threshold: 5, is_flash_sale: false, is_best_seller: false, requires_advance: false,
};

function fromProduct(p: Product, clone: boolean): Partial<FormData> {
  return {
    slug: clone ? `${p.slug}-copy-${shortId()}` : p.slug,
    name_en: clone ? `${p.name_en} (Copy)` : p.name_en,
    name_bn: p.name_bn,
    description_en: p.description_en ?? "",
    description_bn: p.description_bn ?? "",
    price: p.price,
    original_price: p.original_price ?? undefined,
    cost_price: p.cost_price ?? undefined,
    category: p.category,
    category_id: p.category_id ?? "",
    subcategory_id: p.subcategory_id ?? "",
    badge: p.badge ?? "",
    stock_quantity: clone ? 0 : p.stock_quantity,
    is_active: clone ? false : p.is_active,
    is_featured: clone ? false : p.is_featured,
    image_url: p.image_url ?? "",
    seo_title: clone ? "" : p.seo_title ?? "",
    seo_description: clone ? "" : p.seo_description ?? "",
    seo_keywords: clone ? "" : p.seo_keywords ?? "",
    canonical_url: clone ? "" : p.canonical_url ?? "",
    og_image: clone ? "" : p.og_image ?? "",
    sku: clone ? "" : p.sku ?? "",
    barcode: clone ? "" : p.barcode ?? "",
    brand: p.brand ?? "",
    sub_category: p.sub_category ?? "",
    tags: p.tags?.join(", ") ?? "",
    weight: p.weight ?? undefined,
    warranty_info: p.warranty_info ?? "",
    delivery_info: p.delivery_info ?? "",
    delivery_charge: p.delivery_charge ?? undefined,
    requires_advance: p.requires_advance ?? false,
    is_flash_sale: clone ? false : p.is_flash_sale ?? false,
    flash_sale_price: clone ? undefined : p.flash_sale_price ?? undefined,
    // Shown and saved in Bangladesh time (see lib/flashSale).
    flash_sale_ends_at: !clone && p.flash_sale_ends_at ? storedToDhakaInput(p.flash_sale_ends_at) : "",
    low_stock_threshold: p.low_stock_threshold ?? 5,
    is_best_seller: clone ? false : p.is_best_seller ?? false,
    is_bookable: p.is_bookable ?? false,
  };
}

export default function ProductFormModal({ mode, onClose, onSaved, categoryOptions, treeOptions, onOpenExisting }: {
  mode: ProductFormMode;
  onClose: () => void;
  onSaved: () => void;
  categoryOptions: CategoryOpt[];
  treeOptions: { id: string; label: string }[];
  /** Open another (already existing) product in this editor. */
  onOpenExisting: (m: DupMatch) => void;
}) {
  const t = useBnEn();
  const toast = useToastStore((s) => s.push);
  const editing = mode.type === "edit" ? mode.product : null;
  const source = mode.type === "new" ? null : mode.product;
  const modalRef = useFocusTrap(true, onClose);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>(() => (mode.type === "edit" ? mode.product.images ?? [] : []));
  const [specs, setSpecs] = useState<{ k: string; v: string }[]>(() =>
    Object.entries((source?.specifications as Record<string, string>) ?? {}).map(([k, v]) => ({ k, v: String(v) })));
  const [blogOptions, setBlogOptions] = useState<LinkOption[]>([]);
  const [blogOptionsLoading, setBlogOptionsLoading] = useState(true);
  const [productBlogIds, setProductBlogIds] = useState<string[]>([]);
  const [linkedBlogsLoading, setLinkedBlogsLoading] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const { register, handleSubmit, setValue, watch, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: (source ? fromProduct(source, mode.type === "clone") : NEW_DEFAULTS) as FormData,
  });

  // Blog posts this product can be featured in (many-to-many).
  useEffect(() => {
    let alive = true;
    adminBlogApi.list({ per_page: 100 })
      .then((r) => { if (alive) setBlogOptions((r.data.data ?? []).map((b) => ({ id: String(b.id), label: b.title_en || b.title_bn || b.slug, sublabel: b.category }))); })
      .catch(() => { if (alive) setBlogOptions([]); })
      .finally(() => { if (alive) setBlogOptionsLoading(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!editing?.id) return;
    setLinkedBlogsLoading(true);
    adminBlogApi.productLinks(editing.id)
      .then((r) => setProductBlogIds(r.data.data?.blog_ids ?? []))
      .catch(() => setProductBlogIds([]))
      .finally(() => setLinkedBlogsLoading(false));
  }, [editing?.id]);

  const w = watch();
  const imageUrl = w.image_url || "";
  const dup = useDuplicateCheck(
    async (q) => (await productAdminApi.checkDuplicate(q)).data.data,
    { name: (w.name_bn || "").trim().length >= 3 ? w.name_bn : (w.name_en || "").trim().length >= 3 ? w.name_en : "", slug: w.slug, sku: w.sku, exclude_id: editing?.id },
  );
  const nameDup = useDuplicateCheck(
    async (q) => (await productAdminApi.checkDuplicate(q)).data.data,
    { name: w.name_en, exclude_id: editing?.id },
    (w.name_en || "").trim().length >= 3 && (w.name_en || "") !== (w.name_bn || ""),
  );
  const mergedNames = useMemo(() => {
    const seen = new Set<string>();
    return { ...dup, name_matches: [...dup.name_matches, ...nameDup.name_matches].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true))) };
  }, [dup, nameDup]);

  const previewProduct = {
    id: editing?.id ?? "preview",
    slug: w.slug || "preview",
    name_en: w.name_en || w.name_bn || "Product name",
    name_bn: w.name_bn || "",
    price: Number(w.price) || 0,
    original_price: w.original_price ? Number(w.original_price) : undefined,
    image_url: imageUrl,
    category: w.category || "",
    badge: w.badge || undefined,
    stock_quantity: editing ? editing.stock_quantity : Number(w.stock_quantity) || 0,
    rating: 0,
    review_count: 0,
  } as unknown as Product;

  const checks = [
    { bn: "ছবি", en: "Photo", ok: !!imageUrl },
    { bn: "দাম", en: "Price", ok: Number(w.price) > 0 },
    { bn: "বিবরণ", en: "Description", ok: !!(w.description_bn?.trim() || w.description_en?.trim()) },
    { bn: "ক্যাটাগরি", en: "Category", ok: !!w.category },
  ];

  const autoTranslate = async () => {
    if (translating) return;
    setTranslating(true);
    try {
      const v = getValues();
      const [name, desc] = await Promise.all([
        !v.name_bn?.trim() && v.name_en?.trim() ? adminBlogApi.translate(v.name_en, "en", "bn").then((r) => r.data?.data?.translated?.trim() || "").catch(() => "") : Promise.resolve(""),
        !v.description_bn?.trim() && v.description_en?.trim() ? adminBlogApi.translate(v.description_en, "en", "bn").then((r) => r.data?.data?.translated?.trim() || "").catch(() => "") : Promise.resolve(""),
      ]);
      if (name) setValue("name_bn", name, { shouldDirty: true });
      if (desc) setValue("description_bn", desc, { shouldDirty: true });
      toast("success", t("বাংলা অনুবাদ পূরণ হয়েছে — সেভের আগে দেখে নিন", "Bangla filled in — check before saving"));
    } finally {
      setTranslating(false);
    }
  };

  // AI description → fields. Asks before replacing text the admin wrote.
  const applyAiDescription = (d: AiDescription) => {
    const build = (para: string, feats: string[], faq: string) =>
      [para, feats.map((f) => `• ${f}`).join("\n"), faq].filter((x) => x && x.trim()).join("\n\n");
    const faqBn = d.faq.filter((f) => f.q_bn).map((f) => `প্রশ্ন: ${f.q_bn}\nউত্তর: ${f.a_bn}`).join("\n\n");
    const faqEn = d.faq.filter((f) => f.q_en).map((f) => `Q: ${f.q_en}\nA: ${f.a_en}`).join("\n\n");
    const bn = build(d.description_bn, d.features_bn, faqBn ? `প্রশ্নোত্তর\n${faqBn}` : "");
    const en = build(d.description_en, d.features_en, faqEn ? `FAQ\n${faqEn}` : "");
    const hasText = (getValues("description_bn") || "").trim() || (getValues("description_en") || "").trim();
    if (hasText && !window.confirm("আগের বিবরণ AI-এর লেখা দিয়ে বদলে দেবেন?")) return;
    if (bn) setValue("description_bn", bn, { shouldDirty: true });
    if (en) setValue("description_en", en, { shouldDirty: true });
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const { tags: tagsStr, flash_sale_ends_at, category_id, subcategory_id, is_bookable, ...rest } = data;
      const payload: Partial<Product> = {
        ...rest,
        slug: rest.slug || undefined,
        category_id: category_id ? category_id : null,
        subcategory_id: subcategory_id ? subcategory_id : null,
        // checked → also bookable; unchecked → null (never disables ordering).
        is_bookable: is_bookable ? true : null,
        tags: tagsStr ? tagsStr.split(",").map((x) => x.trim()).filter(Boolean) : [],
        images: galleryImages.filter(Boolean),
        specifications: Object.fromEntries(specs.filter((r) => r.k.trim()).map((r) => [r.k.trim(), r.v.trim()])),
        flash_sale_ends_at: flash_sale_ends_at ? (parseDhakaDateTime(flash_sale_ends_at) ?? new Date(flash_sale_ends_at)).toISOString() : null,
        blog_ids: productBlogIds,
      } as Partial<Product>;
      if (editing) {
        await productsApi.update(editing.id!, payload);
        toast("success", t("পণ্য আপডেট হয়েছে", "Product updated"));
      } else {
        await productsApi.create(payload);
        toast("success", data.is_active ? t("পণ্য প্রকাশ হয়েছে", "Product published") : t("খসড়া সেভ হয়েছে", "Draft saved"));
      }
      onSaved();
    } catch (e) {
      toast("error", apiErrorMessage(e, t("সেভ হয়নি — আবার চেষ্টা করুন", "Failed to save product")));
    } finally {
      setSaving(false);
    }
  };

  /** Bangla-first save: fills English name/description, slug and SKU when blank, then validates. */
  const save = async (publish: boolean, confirmed = false) => {
    const v = getValues();
    if (publish && !confirmed) {
      if (!(Number(v.price) > 0)) { toast("error", t("প্রকাশ করতে বিক্রয়মূল্য দিন (খসড়া দামের আগেও রাখা যায়)", "Add a price to publish (a draft can wait)")); return; }
      if (checks.some((c) => !c.ok)) { setConfirmPublish(true); return; }
    }
    if (dup.slug_taken || dup.sku_taken) {
      toast("error", t("ওয়েব ঠিকানা বা SKU আগে থেকেই আছে — 'উন্নত' অংশে বদলান", "Slug or SKU already exists — change it under Advanced"));
      return;
    }
    setValue("is_active", publish);
    const nameBn = v.name_bn?.trim();
    if (!v.name_en?.trim() && nameBn) {
      try { setValue("name_en", await translateBnToEn(nameBn), { shouldValidate: true }); } catch { /* zod flags it */ }
    }
    if (!getValues("slug")?.trim() && !editing) {
      const auto = toSlug(getValues("name_en") || "");
      setValue("slug", auto.length >= 2 ? auto : `product-${shortId()}`, { shouldValidate: true });
    }
    if (!editing && !getValues("sku")?.trim()) {
      const prefix = (getValues("category") || "abo").replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "ABO";
      setValue("sku", `${prefix}-${shortId().toUpperCase()}`);
    }
    const descBn = v.description_bn?.trim();
    if (!v.description_en?.trim() && descBn) {
      try { setValue("description_en", await translateBnToEn(descBn), { shouldValidate: true }); } catch { /* optional */ }
    }
    handleSubmit(onSubmit, () => toast("error", t("লাল চিহ্নিত ঘরগুলো ঠিক করুন", "Fix the fields marked in red")))();
  };

  const sale = Number(w.price) || 0;
  const cost = Number(w.cost_price) || 0;
  const fieldErr = (m?: string) => (m ? <p className="text-red-500 text-xs mt-1">{m}</p> : null);
  const lbl = "block text-sm font-medium text-gray-700 mb-1";
  const opt = <span className="text-gray-400 font-normal">({t("ঐচ্ছিক", "optional")})</span>;

  const preview = (
    <LivePreview>
      <div className="p-1 pointer-events-none max-w-[240px] mx-auto">
        <ProductCard product={previewProduct} />
      </div>
    </LivePreview>
  );

  const steps = [
    {
      id: "basic", bn: "মূল তথ্য", en: "Basics",
      status: (w.name_bn && w.category ? "ok" : "warn") as "ok" | "warn",
      content: (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>{t("পণ্যের নাম (বাংলা)", "Name (Bangla)")} <span className="text-red-500">*</span></label>
              <input {...register("name_bn")} className={cn("input", errors.name_bn && "input-error")} placeholder="যেমন: ফাস্ট চার্জার ৩৩W" />
              {fieldErr(errors.name_bn?.message)}
            </div>
            <div>
              <label className="flex items-center justify-between gap-2 text-sm font-medium text-gray-700 mb-1">
                <span>{t("পণ্যের নাম (English)", "Name (English)")} {opt}</span>
                <TranslateButton bn={w.name_bn} onResult={(en) => setValue("name_en", en, { shouldValidate: true, shouldDirty: true })} en={w.name_en} onResultBn={(b) => setValue("name_bn", b, { shouldValidate: true, shouldDirty: true })} />
              </label>
              <input {...register("name_en")} className={cn("input", errors.name_en && "input-error")} placeholder="Fast Charger 33W" />
              <p className="text-[11px] text-gray-400 mt-1">{t("খালি রাখলে সেভের সময় বাংলা থেকে অনুবাদ হবে।", "Left blank = translated from Bangla on save.")}</p>
              {fieldErr(errors.name_en?.message)}
            </div>
          </div>
          <DuplicateNotice result={mergedNames} onOpen={onOpenExisting} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>{t("ক্যাটাগরি", "Category")} <span className="text-red-500">*</span></label>
              <select {...register("category")} className={cn("input", errors.category && "input-error")}>
                <option value="">{t("— ক্যাটাগরি বাছুন —", "— Select category —")}</option>
                {categoryOptions.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">{t("ওয়েবসাইটে কোন তালিকায় দেখাবে।", "Which list it appears in on the website.")}</p>
              {fieldErr(errors.category?.message)}
            </div>
            <div>
              <label className={lbl}>{t("ব্র্যান্ড", "Brand")} {opt}</label>
              <input {...register("brand")} className="input" placeholder="Baseus, Anker…" />
            </div>
            {treeOptions.length > 0 && (
              <div>
                <label className={lbl}>{t("ক্যাটালগ গাছের অবস্থান", "Catalog tree position")} {opt}</label>
                <select {...register("category_id")} className="input"
                  onChange={(e) => { setValue("category_id", e.target.value); setValue("subcategory_id", ""); }}>
                  <option value="">— None —</option>
                  {treeOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={lbl}>{t("ব্যাজ", "Badge")} {opt}</label>
              <select {...register("badge")} className="input">
                {BADGES.map((b) => <option key={b} value={b}>{b || t("নেই", "None")}</option>)}
              </select>
            </div>
          </div>
        </>
      ),
    },
    {
      id: "photos", bn: "ছবি", en: "Photos",
      status: (imageUrl ? "ok" : "warn") as "ok" | "warn",
      content: (
        <>
          <ImageUpload
            label={t("মূল ছবি", "Main photo")}
            value={imageUrl}
            onChange={(url) => setValue("image_url", url, { shouldDirty: true })}
            folder="abo-enterprise/products"
            previewSize="md"
            purpose="product-main"
          />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">{t("আরও ছবি (গ্যালারি)", "More photos (gallery)")} {opt}</label>
              <button type="button" onClick={() => setGalleryImages((imgs) => [...imgs, ""])} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                + {t("ছবি যোগ করুন", "Add photo")}
              </button>
            </div>
            {galleryImages.length === 0 ? (
              <p className="text-xs text-gray-400">{t("অন্য দিক থেকে তোলা ছবি থাকলে \"ছবি যোগ করুন\" চাপুন।", "Have photos from other angles? Press \"Add photo\".")}</p>
            ) : (
              <div className="space-y-3">
                {galleryImages.map((url, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1">
                      <ImageUpload value={url} onChange={(v) => setGalleryImages((imgs) => imgs.map((u, i) => (i === idx ? v : u)))}
                        folder="abo-enterprise/products" previewSize="sm" purpose="product-gallery" />
                    </div>
                    <button type="button" onClick={() => setGalleryImages((imgs) => imgs.filter((_, i) => i !== idx))}
                      className="p-2 text-gray-400 hover:text-red-500 mt-1" aria-label={t("ছবি সরান", "Remove photo")}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ),
    },
    {
      id: "price", bn: "দাম ও স্টক", en: "Price & stock",
      status: (sale > 0 ? "ok" : "warn") as "ok" | "warn",
      content: (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={lbl}>{t("বিক্রয়মূল্য ৳", "Sale price ৳")} <span className="text-red-500">*</span></label>
              <input {...register("price")} type="number" inputMode="numeric" className={cn("input", errors.price && "input-error")} placeholder="1290" />
              <p className="text-[11px] text-gray-400 mt-1">{t("গ্রাহক এই দামে কিনবেন।", "What the customer pays.")}</p>
              {fieldErr(errors.price?.message)}
            </div>
            <div>
              <label className={lbl}>{t("আগের দাম ৳", "Old price ৳")} {opt}</label>
              <input {...register("original_price")} type="number" inputMode="numeric" className="input" placeholder="1490" />
              <p className="text-[11px] text-gray-400 mt-1">{t("দিলে কেটে দেখানো হবে (ছাড় বোঝাতে)।", "Shown crossed out (a discount).")}</p>
              {fieldErr(errors.original_price?.message)}
            </div>
            <div>
              <label className={lbl}>{t("ক্রয়মূল্য ৳ (শুধু আপনি দেখবেন)", "Cost ৳ (only you see it)")}</label>
              <input {...register("cost_price")} type="number" inputMode="numeric" className="input" placeholder="950" />
              <p className="text-[11px] text-gray-400 mt-1">{t("গ্রাহক কখনো দেখবেন না। লাভের রিপোর্টে কাজে লাগে।", "Never shown to customers. Used in profit reports.")}</p>
            </div>
          </div>
          {sale > 0 && cost > 0 && (
            <p className={cn("text-sm font-medium rounded-lg px-3 py-2", sale - cost >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300")}>
              {sale - cost >= 0
                ? t(`প্রতি পিসে লাভ ৳${Math.round(sale - cost)} (${Math.round(((sale - cost) / cost) * 100)}%)`, `Profit per piece ৳${Math.round(sale - cost)} (${Math.round(((sale - cost) / cost) * 100)}%)`)
                : t(`সাবধান: প্রতি পিসে লোকসান ৳${Math.round(cost - sale)}`, `Careful: loss of ৳${Math.round(cost - sale)} per piece`)}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{t("স্টক (কয়টি আছে)", "Stock (how many)")}</label>
              {editing ? (
                <>
                  <input type="number" value={editing.stock_quantity ?? 0} disabled className="input bg-gray-50 text-gray-500 cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-1">
                    {t("স্টক বদলাতে পণ্যের তালিকায় স্টকের উপর চাপ দিন, বা ", "To change stock, tap the stock number in the list, or use ")}
                    <Link href="/sumon/inventory" className="text-brand-600 hover:underline">Inventory</Link>
                    {t(" ব্যবহার করুন — প্রতিটি পরিবর্তনের হিস্টরি থাকে।", " — every change keeps a history.")}
                  </p>
                </>
              ) : (
                <>
                  <input {...register("stock_quantity")} type="number" inputMode="numeric" className="input" placeholder="0" />
                  <p className="text-xs text-gray-400 mt-1">{t("শুরুর স্টক।", "Opening stock.")}</p>
                </>
              )}
            </div>
            <div>
              <label className={lbl}>{t("কম স্টকের সতর্কতা", "Low-stock alert at")}</label>
              <input {...register("low_stock_threshold")} type="number" className="input" placeholder="5" />
              <p className="text-xs text-gray-400 mt-1">{t("এর নিচে নামলে নোটিফিকেশন পাবেন।", "You get a notification below this.")}</p>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input {...register("is_flash_sale")} type="checkbox" className="rounded" /> {t("ফ্ল্যাশ সেলে দিন", "Put in flash sale")}
            </label>
            {w.is_flash_sale && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("ফ্ল্যাশ সেলের দাম ৳", "Flash sale price ৳")}</label>
                  <input {...register("flash_sale_price")} type="number" className="input" />
                  {fieldErr(errors.flash_sale_price?.message)}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("শেষ হবে (বাংলাদেশ সময়)", "Ends at (Bangladesh time)")}</label>
                  <input {...register("flash_sale_ends_at")} type="datetime-local" className="input text-sm" />
                </div>
              </div>
            )}
          </div>
        </>
      ),
    },
    {
      id: "desc", bn: "বিবরণ", en: "Description",
      status: (w.description_bn?.trim() || w.description_en?.trim() ? "ok" : "warn") as "ok" | "warn",
      content: (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">{t("বুলেট লাইন \"• \" দিয়ে শুরু করুন।", "Start bullet lines with \"• \".")}</p>
            <div className="flex flex-wrap gap-2">
              <AiDescribeButton
                kind="product"
                name={w.name_bn || w.name_en}
                notes={[w.brand && `Brand: ${w.brand}`, specs.filter((r) => r.k.trim()).map((r) => `${r.k}: ${r.v}`).join("; "), w.description_bn].filter(Boolean).join("\n")}
                onResult={applyAiDescription}
              />
              <button type="button" onClick={autoTranslate} disabled={translating} className="btn btn-outline btn-sm gap-1.5"
                title={t("নাম ও বিবরণের খালি বাংলা ঘর English থেকে পূরণ করবে", "Fill empty Bangla boxes from English")}>
                {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />} {t("বাংলা অনুবাদ", "Translate to Bangla")}
              </button>
            </div>
          </div>
          <div>
            <label className={lbl}>{t("বিবরণ (বাংলা)", "Description (Bangla)")}</label>
            <textarea {...register("description_bn")} rows={5} className="input resize-y" placeholder="পণ্যের বিবরণ..." />
          </div>
          <div>
            <label className="flex items-center justify-between gap-2 text-sm font-medium text-gray-700 mb-1">
              {t("বিবরণ (English)", "Description (English)")} {opt}
              <TranslateButton bn={w.description_bn} onResult={(en) => setValue("description_en", en, { shouldDirty: true })} en={w.description_en} onResultBn={(b) => setValue("description_bn", b, { shouldDirty: true })} />
            </label>
            <textarea {...register("description_en")} rows={4} className="input resize-y" placeholder="Product description..." />
          </div>
          <div>
            <label className={lbl}>{t("স্পেসিফিকেশন (পণ্যের পাতায় টেবিল হিসেবে দেখাবে)", "Specifications (shown as a table)")} {opt}</label>
            <div className="space-y-2">
              {specs.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input value={row.k} onChange={(e) => setSpecs((p) => p.map((r, j) => (j === i ? { ...r, k: e.target.value } : r)))} className="input flex-1 text-sm" placeholder={t("নাম (যেমন Output)", "Name (e.g. Output)")} />
                  <input value={row.v} onChange={(e) => setSpecs((p) => p.map((r, j) => (j === i ? { ...r, v: e.target.value } : r)))} className="input flex-1 text-sm" placeholder={t("মান (যেমন 33W)", "Value (e.g. 33W)")} />
                  <button type="button" onClick={() => setSpecs((p) => p.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-500 rounded-lg" aria-label={t("সরান", "Remove")}><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setSpecs((p) => [...p, { k: "", v: "" }])} className="text-xs font-medium text-brand-600 hover:underline">+ {t("স্পেসিফিকেশন যোগ করুন", "Add specification")}</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{t("ওয়ারেন্টি", "Warranty")} {opt}</label>
              <textarea {...register("warranty_info")} rows={2} className="input resize-none text-sm" placeholder={t("৬ মাসের ওয়ারেন্টি…", "6 months warranty…")} />
            </div>
            <div>
              <label className={lbl}>{t("ডেলিভারি তথ্য", "Delivery info")} {opt}</label>
              <textarea {...register("delivery_info")} rows={2} className="input resize-none text-sm" placeholder={t("২-৩ দিনে ডেলিভারি…", "Delivered in 2-3 days…")} />
            </div>
          </div>
        </>
      ),
    },
    {
      id: "publish", bn: "প্রকাশ", en: "Publish",
      status: (checks.every((c) => c.ok) ? "ok" : "warn") as "ok" | "warn",
      content: (
        <>
          <div className="lg:hidden">{preview}</div>
          <PublishChecklist items={checks} />
          <p className="text-sm text-muted">
            {editing
              ? (editing.is_active ? t("এখন অবস্থা: প্রকাশিত (সাইটে দেখা যাচ্ছে)।", "Status now: live on the site.") : t("এখন অবস্থা: খসড়া (সাইটে লুকানো)।", "Status now: draft (hidden)."))
              : t("নিচের বোতাম দিয়ে খসড়া হিসেবে রাখুন বা সরাসরি প্রকাশ করুন।", "Use the buttons below to keep it as a draft or publish it.")}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm"><input {...register("is_featured")} type="checkbox" className="rounded" /> {t("হোমপেজে ফিচার করুন", "Featured")}</label>
            <label className="flex items-center gap-2 cursor-pointer text-sm"><input {...register("is_best_seller")} type="checkbox" className="rounded" /> {t("বেস্ট সেলার", "Best seller")}</label>
            <label className="flex items-center gap-2 cursor-pointer text-sm" title="Also let customers book/request this item as a service"><input {...register("is_bookable")} type="checkbox" className="rounded" /> {t("বুকিংও নেওয়া যাবে", "Also bookable")}</label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t("ব্লগে দেখান", "Show in blog posts")}
              {productBlogIds.length > 0 && <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-600 text-white text-[10px] font-bold">{productBlogIds.length}</span>}
            </label>
            <p className="text-xs text-gray-500 mb-2">{t("যে ব্লগ পোস্টের নিচে এই পণ্য দেখাতে চান, টিক দিন।", "Tick the blog posts to feature this product in.")}</p>
            <LinkChecklist options={blogOptions} selected={productBlogIds} loading={blogOptionsLoading || linkedBlogsLoading}
              emptyText={t("কোনো ব্লগ পোস্ট নেই", "No blog posts")} searchPlaceholder={t("ব্লগ খুঁজুন…", "Search blog posts…")}
              onToggle={(id) => setProductBlogIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))} />
          </div>
          <AdvancedSection>
            <DuplicateNotice result={dup} onOpen={onOpenExisting} show="codes" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("ওয়েব ঠিকানা (slug)", "Web address (slug)")}</label>
                <input {...register("slug")} disabled={!!editing} className={cn("input font-mono text-sm", errors.slug && "input-error", editing && "bg-gray-50 text-gray-500")} placeholder={t("খালি = নাম থেকে তৈরি", "blank = from the name")} />
                {editing && <p className="text-[11px] text-gray-400 mt-1">{t("পুরনো লিংক যেন না ভাঙে, তাই সেভ করা পণ্যের ঠিকানা বদলায় না।", "Kept fixed so existing links never break.")}</p>}
                {fieldErr(errors.slug?.message)}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                <input {...register("sku")} className="input font-mono text-sm" placeholder={t("খালি = নিজে থেকে তৈরি", "blank = auto")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Barcode</label>
                <input {...register("barcode")} className="input" placeholder="8901234567890" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("সাব-ক্যাটাগরি (লেখা)", "Sub-category (text)")}</label>
                <input {...register("sub_category")} className="input" placeholder="Cables, Cases..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("ওজন (কেজি)", "Weight (kg)")}</label>
                <input {...register("weight")} type="number" step="0.001" className="input" placeholder="0.250" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("ডেলিভারি চার্জ ৳ (আলাদা হলে)", "Delivery charge ৳ (override)")}</label>
                <input type="number" step="1" min="0" {...register("delivery_charge")} className="input text-sm" placeholder={t("খালি = এলাকার চার্জ", "blank = zone charge")} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("ট্যাগ (কমা দিয়ে)", "Tags (comma-separated)")}</label>
                <input {...register("tags")} className="input" placeholder="phone, accessories, black..." />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer sm:col-span-2">
                <input type="checkbox" {...register("requires_advance")} className="rounded" /> {t("অগ্রিম পেমেন্ট লাগবে", "Requires advance payment")}
              </label>
            </div>
            <div className="border-t border-[var(--line)] pt-3 space-y-3">
              <p className="text-xs font-semibold text-gray-600">SEO <span className="font-normal text-gray-400">— {t("খালি থাকলে নাম, বিবরণ ও মূল ছবি নিজে থেকে ব্যবহার হয়", "blank = name, description and main photo are used")}</span></p>
              <input {...register("seo_title")} className="input text-sm" placeholder={t("SEO শিরোনাম", "SEO title")} />
              <textarea {...register("seo_description")} rows={2} maxLength={160} className="input resize-none text-sm" placeholder={t("SEO বিবরণ (১৬০ অক্ষর)", "SEO description (160 chars)")} />
              <input {...register("seo_keywords")} className="input text-sm" placeholder={t("কিওয়ার্ড (কমা দিয়ে)", "Keywords (comma-separated)")} />
              <input {...register("canonical_url")} className="input text-sm" placeholder="Canonical URL (https://…)" />
              <ImageUpload label={t("শেয়ার করার ছবি (OG)", "Share image (OG)")} value={w.og_image ?? ""} onChange={(url) => setValue("og_image", url)}
                folder="abo-enterprise/products" previewSize="sm" showUrlInput purpose="product-og" />
            </div>
          </AdvancedSection>
        </>
      ),
    },
  ];

  const title = editing ? t("পণ্য সম্পাদনা", "Edit product") : mode.type === "clone" ? t("কপি করে নতুন পণ্য", "New product (copy)") : t("নতুন পণ্য", "New product");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" style={ADMIN_MODAL_BACKDROP_STYLE}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label={title}
        className="w-full max-w-5xl h-full sm:h-[92vh] sm:rounded-2xl flex flex-col animate-scale-in" style={ADMIN_MODAL_PANEL_STYLE}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-lg font-semibold text-heading">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("বন্ধ করুন", "Close")} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_300px]">
          <form data-step-scroll onSubmit={(e) => { e.preventDefault(); save(true); }} className="overflow-y-auto px-4 sm:px-6 py-4">
            <StepForm steps={steps} />
          </form>
          <aside className="hidden lg:block overflow-y-auto border-l border-gray-100 dark:border-white/10 p-4 space-y-4">
            {preview}
            <PublishChecklist items={checks} />
          </aside>
        </div>
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-white/10 flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-outline btn-md">{t("বাতিল", "Cancel")}</button>
          <button type="button" onClick={() => save(false)} disabled={saving} className="btn btn-outline btn-md gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("খসড়া হিসেবে সেভ", "Save as draft")}
          </button>
          <button type="button" onClick={() => save(true)} disabled={saving} className="btn btn-brand btn-md gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {editing?.is_active ? t("সেভ করুন", "Save") : t("সেভ ও প্রকাশ", "Save & publish")}
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmPublish}
        title={t("কিছু তথ্য বাকি — তবুও প্রকাশ করবেন?", "Some info is missing — publish anyway?")}
        message={t(`${checks.filter((c) => !c.ok).map((c) => c.bn).join(", ")} নেই। চাইলে খসড়া হিসেবে রেখে পরে পূরণ করুন।`, `Missing: ${checks.filter((c) => !c.ok).map((c) => c.en).join(", ")}. You can save a draft instead.`)}
        confirmLabel={t("তবুও প্রকাশ করুন", "Publish anyway")}
        variant="warning"
        onConfirm={() => { setConfirmPublish(false); save(true, true); }}
        onCancel={() => setConfirmPublish(false)}
      />
    </div>
  );
}
