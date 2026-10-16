"use client";

import { useUnsavedGuard } from "@/hooks/useUnsavedGuard";
import { askConfirm } from "@/store/confirm";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, Loader2, Save, Send } from "lucide-react";
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
import BnEnText from "@/components/admin/catalog/BnEnText";
import SeoAutoPanel from "@/components/admin/catalog/SeoAutoPanel";
import VideoUrlField from "@/components/admin/catalog/VideoUrlField";
import BarcodeScanButton from "@/components/admin/catalog/BarcodeScanButton";
import LinkImportBox from "@/components/admin/catalog/LinkImportBox";
import type { LinkDraft } from "@/lib/api";

const BADGES: { v: string; bn: string; en: string }[] = [
  { v: "", bn: "নেই", en: "None" },
  { v: "NEW", bn: "🆕 নতুন", en: "🆕 New" },
  { v: "HOT", bn: "🔥 জনপ্রিয়", en: "🔥 Hot" },
  { v: "SALE", bn: "🏷️ অফার", en: "🏷️ Sale" },
];
const SPEC_KEYS = ["মডেল", "রং", "আউটপুট (W)", "ইনপুট", "পোর্ট", "কেবলের দৈর্ঘ্য", "ব্যাটারি", "যেসব ফোনে চলবে", "উপাদান", "মাপ", "বক্সে যা আছে"];
const WARRANTY_CHIPS = ["ওয়ারেন্টি নেই", "৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি", "৩ মাসের ওয়ারেন্টি", "৬ মাসের ওয়ারেন্টি", "১ বছরের ওয়ারেন্টি"];
const DELIVERY_CHIPS = ["বিয়ানীবাজারে একই দিনে ডেলিভারি", "সিলেটে ১-২ দিনে ডেলিভারি", "সারা দেশে ২-৪ দিনে ডেলিভারি", "ক্যাশ অন ডেলিভারি সুবিধা আছে"];

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
  video_url: z.string().optional(),
  variant_group: z.string().optional(),
  variant_label: z.string().optional(),
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
  low_stock_threshold: 5, is_flash_sale: false, is_best_seller: false, requires_advance: false, video_url: "",
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
    video_url: p.video_url ?? "",
    // A copy joins the original's group only when the admin ticks it (below).
    variant_group: clone ? "" : p.variant_group ?? "",
    variant_label: clone ? "" : p.variant_label ?? "",
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
  const [galleryImages, setGalleryImages] = useState<string[]>(() => (mode.type === "edit" ? mode.product.images ?? [] : []));
  const [specs, setSpecs] = useState<{ k: string; v: string }[]>(() =>
    Object.entries((source?.specifications as Record<string, string>) ?? {}).map(([k, v]) => ({ k, v: String(v) })));
  const [blogOptions, setBlogOptions] = useState<LinkOption[]>([]);
  const [blogOptionsLoading, setBlogOptionsLoading] = useState(true);
  const [productBlogIds, setProductBlogIds] = useState<string[]>([]);
  const [linkedBlogsLoading, setLinkedBlogsLoading] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const { register, handleSubmit, setValue, watch, getValues, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: (source ? fromProduct(source, mode.type === "clone") : NEW_DEFAULTS) as FormData,
  });
  useUnsavedGuard(isDirty);

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


  // AI description → fields. Asks before replacing text the admin wrote.
  const applyAiDescription = async (d: AiDescription) => {
    const build = (para: string, feats: string[], faq: string) =>
      [para, feats.map((f) => `• ${f}`).join("\n"), faq].filter((x) => x && x.trim()).join("\n\n");
    const faqBn = d.faq.filter((f) => f.q_bn).map((f) => `প্রশ্ন: ${f.q_bn}\nউত্তর: ${f.a_bn}`).join("\n\n");
    const faqEn = d.faq.filter((f) => f.q_en).map((f) => `Q: ${f.q_en}\nA: ${f.a_en}`).join("\n\n");
    const bn = build(d.description_bn, d.features_bn, faqBn ? `প্রশ্নোত্তর\n${faqBn}` : "");
    const en = build(d.description_en, d.features_en, faqEn ? `FAQ\n${faqEn}` : "");
    const hasText = (getValues("description_bn") || "").trim() || (getValues("description_en") || "").trim();
    if (hasText && !(await askConfirm("আগের বিবরণ AI-এর লেখা দিয়ে বদলে দেবেন?"))) return;
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
        video_url: rest.video_url?.trim() || null,
        variant_group: rest.variant_group?.trim() || (rest.variant_label?.trim() && editing?.id ? editing.id : null),
        variant_label: rest.variant_label?.trim() || null,
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
        // Copy saved as a variant: make sure the original joins the same group.
        if (mode.type === "clone" && payload.variant_group && !mode.product.variant_group && mode.product.id) {
          await productsApi.update(mode.product.id, { variant_group: payload.variant_group }).catch(() => undefined);
        }
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

  const onBarcode = useCallback((code: string) => {
    setValue("barcode", code, { shouldDirty: true });
    toast("success", t(`বারকোড পাওয়া গেছে: ${code}`, `Barcode: ${code}`));
  }, [setValue, toast, t]);

  /** Link draft → empty fields only (asks before replacing a name/description). */
  const applyLinkDraft = async (d: LinkDraft) => {
    const v = getValues();
    const replace = !(v.name_bn?.trim() || v.description_bn?.trim()) || (await askConfirm("আগের নাম/বিবরণ লিংকের তথ্য দিয়ে বদলে দেবেন?"));
    const put = (k: keyof FormData, val: string | undefined, force = replace) => {
      if (val && (force || !String(v[k] ?? "").trim())) setValue(k, val as never, { shouldDirty: true });
    };
    put("name_bn", d.name_bn); put("name_en", d.name_en);
    put("description_bn", d.description_bn); put("description_en", d.description_en);
    put("brand", d.brand, false); put("image_url", d.image_url, false);
    if (d.tags.length && !v.tags?.trim()) setValue("tags", d.tags.join(", "), { shouldDirty: true });
    const rows = Object.entries(d.specs).map(([k, val]) => ({ k, v: val }));
    if (rows.length) setSpecs((cur) => [...cur.filter((r) => r.k.trim() || r.v.trim()), ...rows.filter((r) => !cur.some((c) => c.k.trim() === r.k))]);
    if (d.source_price) toast("info", `উৎস পাতার দাম: ${d.source_price} ${d.source_currency} — নিজের বিক্রয়মূল্য যাচাই করে দিন`);
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
          <div className="flex flex-wrap gap-2"><LinkImportBox kind="product" onDraft={applyLinkDraft} /></div>
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
                <label className={lbl}>{t("বিস্তারিত ক্যাটাগরি (গাছে অবস্থান)", "Detailed category (tree)")} {opt}</label>
                <select {...register("category_id")} className="input"
                  onChange={(e) => { setValue("category_id", e.target.value); setValue("subcategory_id", ""); }}>
                  <option value="">— None —</option>
                  {treeOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">{t("যেমন: মোবাইল এক্সেসরিজ › চার্জার — ক্যাটাগরি পাতায় সঠিক জায়গায় দেখাবে।", "e.g. Mobile accessories › Chargers — shows in the right place on category pages.")}</p>
              </div>
            )}
            <div>
              <label className={lbl}>{t("ব্যাজ", "Badge")} {opt}</label>
              <div className="flex flex-wrap gap-1.5">
                {BADGES.map((b) => (
                  <button key={b.v} type="button" onClick={() => setValue("badge", b.v, { shouldDirty: true })}
                    className={cn("rounded-full border px-3 min-h-10 text-sm", (w.badge || "") === b.v ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200 font-semibold" : "border-[var(--line)]")}>
                    {t(b.bn, b.en)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{t("পণ্যের ছবির কোণে ছোট লেবেল হিসেবে দেখাবে।", "Small label on the product photo.")}</p>
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
          <div className="rounded-xl border border-[var(--line)] p-3 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">🎨 {t("রং / সাইজ (ভ্যারিয়েন্ট)", "Colour / size (variants)")} {opt}</p>
            <input {...register("variant_label")} className="input" placeholder={t("এই পণ্যের রং বা সাইজ — যেমন: কালো, ২ মিটার, 64GB", "This item's colour or size — e.g. Black, 2 m")} />
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {t("একই পণ্যের অন্য রং/সাইজ যোগ করতে পণ্যের তালিকা থেকে এটির “কপি” চাপুন — কপির ফরমে “এটি মূল পণ্যের আরেকটি রং/সাইজ” টিক দিন, তারপর রং/সাইজ, দাম, স্টক ও ছবি বদলান। সাইটে গ্রাহক বোতাম চেপে রং/সাইজ বাছতে পারবেন।", "To add another colour/size, use “Copy” on this product in the list — tick “another colour/size”, then change label, price, stock and photo. Customers pick it with buttons on the product page.")}
            </p>
            {mode.type === "clone" && (
              <label className="flex items-start gap-2 text-sm cursor-pointer min-h-11">
                <input type="checkbox" className="rounded mt-0.5" checked={!!w.variant_group}
                  onChange={(e) => setValue("variant_group", e.target.checked ? (mode.product.variant_group || mode.product.id || "") : "", { shouldDirty: true })} />
                <span>{t("এটি মূল পণ্যের আরেকটি রং/সাইজ", "This is another colour/size of the original")}<span className="block text-[11px] text-gray-400">{t("টিক দিলে সাইটে দুটি পণ্য রং/সাইজ বোতাম হিসেবে একসাথে দেখাবে।", "Both show as colour/size buttons on the site.")}</span></span>
              </label>
            )}
            {mode.type !== "clone" && w.variant_group && (
              <p className="text-[11px] text-brand-700 dark:text-brand-300">✓ {t("একই গ্রুপের অন্য রং/সাইজের সাথে যুক্ত", "Linked with the other colours/sizes in its group")}</p>
            )}
          </div>
          <VideoUrlField value={w.video_url} onChange={(v) => setValue("video_url", v, { shouldDirty: true })} folder="abo-enterprise/products" />
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
              {sale > 0 && Number(w.original_price) > sale && (
                <p className="mt-1 inline-flex rounded-full bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300 px-2 py-0.5 text-xs font-semibold">
                  {t(`${Math.round(((Number(w.original_price) - sale) / Number(w.original_price)) * 100)}% ছাড় · ৳${Math.round(Number(w.original_price) - sale)} কম`, `${Math.round(((Number(w.original_price) - sale) / Number(w.original_price)) * 100)}% off`)}
                </p>
              )}
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
                  {!(Number(w.stock_quantity) > 0) && (
                    <p className="text-xs mt-1 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 px-2 py-1">
                      {t("স্টক ০ — প্রকাশ করলে সাইটে “স্টক নেই” দেখাবে (গ্রাহক “নোটিফাই” চাপতে পারবেন)।", "Stock 0 — the site will show “out of stock”.")}
                    </p>
                  )}
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
            <p className="text-xs text-muted">{t("✨ AI নাম ও স্পেসিফিকেশন দেখে বাংলা-ইংরেজি বিবরণ লিখে দেবে।", "✨ AI writes the description from the name and specs.")}</p>
            <div className="flex flex-wrap gap-2">
              <AiDescribeButton
                kind="product"
                name={w.name_bn || w.name_en}
                notes={[w.brand && `Brand: ${w.brand}`, specs.filter((r) => r.k.trim()).map((r) => `${r.k}: ${r.v}`).join("; "), w.description_bn].filter(Boolean).join("\n")}
                onResult={applyAiDescription}
              />
            </div>
          </div>
          <BnEnText label={t("বিবরণ", "Description")} rich rows={6}
            bn={w.description_bn} en={w.description_en}
            onBn={(v) => setValue("description_bn", v, { shouldDirty: true })}
            onEn={(v) => setValue("description_en", v, { shouldDirty: true })}
            placeholderBn={"যেমন:\n• ৩৩W দ্রুত চার্জ\n• Type-C পোর্ট"} placeholderEn="Product description…"
            hint={t("টুলবার দিয়ে শিরোনাম, বোল্ড, রঙ, তালিকা, লিংক, ছবি, ইমোজি ও আইকন দিন — “প্রিভিউ” চাপলে সাইটের মতো দেখাবে।", "Use the toolbar for headings, bold, colours, lists, links, images, emoji and icons — tap Preview to see it as on the site.")} />
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
              <button type="button" onClick={() => setSpecs((p) => [...p, { k: "", v: "" }])} className="text-xs font-medium text-brand-600 hover:underline min-h-10">+ {t("স্পেসিফিকেশন যোগ করুন", "Add specification")}</button>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] text-gray-400 self-center">{t("এক চাপে যোগ:", "Quick add:")}</span>
                {SPEC_KEYS.filter((k) => !specs.some((r) => r.k.trim() === k)).map((k) => (
                  <button key={k} type="button" onClick={() => setSpecs((p) => [...p.filter((r) => r.k.trim() || r.v.trim()), { k, v: "" }])}
                    className="rounded-full border border-[var(--line)] px-2.5 min-h-9 text-xs hover:border-brand-400">+ {k}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>{t("ওয়ারেন্টি", "Warranty")} {opt}</label>
              <textarea {...register("warranty_info")} rows={2} className="input resize-none text-sm" placeholder={t("৬ মাসের ওয়ারেন্টি…", "6 months warranty…")} />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {WARRANTY_CHIPS.map((c) => (
                  <button key={c} type="button" onClick={() => setValue("warranty_info", c, { shouldDirty: true })} className="rounded-full border border-[var(--line)] px-2.5 min-h-9 text-xs hover:border-brand-400">{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>{t("ডেলিভারি তথ্য", "Delivery info")} {opt}</label>
              <textarea {...register("delivery_info")} rows={2} className="input resize-none text-sm" placeholder={t("২-৩ দিনে ডেলিভারি…", "Delivered in 2-3 days…")} />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {DELIVERY_CHIPS.map((c) => (
                  <button key={c} type="button" onClick={() => { const cur = (getValues("delivery_info") || "").trim(); setValue("delivery_info", cur && !cur.includes(c) ? `${cur}\n${c}` : c, { shouldDirty: true }); }}
                    className="rounded-full border border-[var(--line)] px-2.5 min-h-9 text-xs hover:border-brand-400">+ {c}</button>
                ))}
              </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              ["is_featured", t("⭐ হোমপেজে দেখান", "⭐ Featured"), t("হোমপেজের বাছাই করা পণ্যের তালিকায় আসবে।", "Shown in the homepage picks.")],
              ["is_best_seller", t("🏆 বেস্ট সেলার", "🏆 Best seller"), t("“বেশি বিক্রি” তালিকা ও ব্যাজে দেখাবে।", "Shown in best-seller lists.")],
              ["is_bookable", t("📅 বুকিংও নেওয়া যাবে", "📅 Also bookable"), t("কেনার পাশাপাশি গ্রাহক এটি সার্ভিস হিসেবে বুক/অনুরোধ করতে পারবেন।", "Customers can also book/request it as a service.")],
            ] as const).map(([name, title, help]) => (
              <label key={name} className="flex items-start gap-2 cursor-pointer rounded-xl border border-[var(--line)] p-3 min-h-11">
                <input {...register(name)} type="checkbox" className="rounded mt-0.5" />
                <span><span className="block text-sm font-medium">{title}</span><span className="block text-[11px] text-gray-500 dark:text-gray-400">{help}</span></span>
              </label>
            ))}
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
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("বারকোড", "Barcode")}</label>
                <div className="flex gap-2">
                  <input {...register("barcode")} className="input flex-1" placeholder="8901234567890" inputMode="numeric" />
                  <BarcodeScanButton onResult={onBarcode} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("সাব-ক্যাটাগরি (লেখা)", "Sub-category (text)")}</label>
                <input {...register("sub_category")} className="input" placeholder="Cables, Cases..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("ওজন (গ্রামে লিখুন)", "Weight (grams)")}</label>
                <input type="number" inputMode="numeric" min={0} className="input" placeholder="250"
                  value={w.weight != null && String(w.weight) !== "" && !Number.isNaN(Number(w.weight)) ? Math.round(Number(w.weight) * 1000) : ""}
                  onChange={(e) => setValue("weight", (e.target.value === "" ? undefined : Number(e.target.value) / 1000) as unknown as number, { shouldDirty: true })} />
                <p className="text-[11px] text-gray-400 mt-1">{t("ডেলিভারি চার্জ হিসাবে কাজে লাগে (১০০০ গ্রাম = ১ কেজি)।", "Used for delivery charges (1000 g = 1 kg).")}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("ডেলিভারি চার্জ ৳ (আলাদা হলে)", "Delivery charge ৳ (override)")}</label>
                <input type="number" step="1" min="0" {...register("delivery_charge")} className="input text-sm" placeholder={t("খালি = এলাকার চার্জ", "blank = zone charge")} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("ভ্যারিয়েন্ট গ্রুপ কোড", "Variant group code")}</label>
                <input {...register("variant_group")} className="input font-mono text-xs" placeholder={t("খালি = নিজে থেকে", "blank = automatic")} />
                <p className="text-[11px] text-gray-400 mt-1">{t("দুটি আলাদা পণ্যকে এক গ্রুপে আনতে একটির কোড অন্যটিতে বসান।", "Paste one product's code into another to group them.")}</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("ট্যাগ (কমা দিয়ে)", "Tags (comma-separated)")}</label>
                <input {...register("tags")} className="input" placeholder="phone, accessories, black..." />
                <p className="text-[11px] text-gray-400 mt-1">{t("সার্চ ও “এরকম আরও পণ্য” খুঁজতে কাজে লাগে।", "Helps search and related products.")}</p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer sm:col-span-2">
                <input type="checkbox" {...register("requires_advance")} className="rounded" /> {t("অগ্রিম পেমেন্ট লাগবে", "Requires advance payment")}
                <span className="text-[11px] text-gray-400">{t("— টিক দিলে আগে টাকা দিয়ে অর্ডার নিশ্চিত করতে হবে।", "— customer pays before the order is confirmed.")}</span>
              </label>
            </div>
            <div className="border-t border-[var(--line)] pt-3 space-y-3">
              <SeoAutoPanel name={w.name_bn || w.name_en || ""} desc={w.description_bn || w.description_en || ""}
                tags={(w.tags || "").split(",").map((x) => x.trim()).filter(Boolean)} path={`/products/${w.slug || toSlug(w.name_en || "") || "…"}`}
                title={w.seo_title} description={w.seo_description} keywords={w.seo_keywords}
                onChange={(v) => { setValue("seo_title", v.seo_title, { shouldDirty: true }); setValue("seo_description", v.seo_description, { shouldDirty: true }); setValue("seo_keywords", v.seo_keywords, { shouldDirty: true }); }} />
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
