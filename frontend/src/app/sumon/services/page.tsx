"use client";
import BulkImproveModal from "@/components/admin/catalog/BulkImproveModal";
import { useDirty, useUnsavedGuard } from "@/hooks/useUnsavedGuard";
import { askConfirm } from "@/store/confirm";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";

import { useEffect, useState, useCallback } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  Loader2, Briefcase, Plus, Pencil, Trash2, X,
  ToggleLeft, ToggleRight, Star, StarOff, Check, Ban, ChevronDown, ChevronUp, } from "lucide-react";
import { servicesAdminApi, categoriesApi, adminBlogApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import ImageUpload from "@/components/admin/ImageUpload";
import TranslateButton from "@/components/admin/TranslateButton";
import AiDescribeButton from "@/components/admin/AiDescribeButton";
import type { AiDescription } from "@/lib/api";
import JsonListEditor from "@/components/admin/JsonListEditor";
import { translateBnToEn } from "@/lib/translate";
import LivePreview from "@/components/admin/LivePreview";
import LinkChecklist, { type LinkOption } from "@/components/admin/LinkChecklist";
import ServiceCard from "@/components/services/ServiceCard";
import ServicePricingTiersEditor from "@/components/admin/ServicePricingTiersEditor";
import ServiceBookingFormFieldsEditor, { readCondition, writeCondition } from "@/components/admin/ServiceBookingFormFieldsEditor";
import type { Service, ServicePricingTier, ServiceBookingFormField, Category } from "@/types";

type ServiceFulfilment = NonNullable<Service["fulfilment"]> | null;
import { formatPrice } from "@/lib/utils";
import { useToastStore } from "@/store/toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { serviceAdminApi, bnNum, shortId, type MissingFilter } from "@/lib/catalogAdminApi";
import StepForm from "@/components/admin/catalog/StepForm";
import PublishChecklist from "@/components/admin/catalog/PublishChecklist";
import AdvancedSection from "@/components/admin/catalog/AdvancedSection";
import DuplicateNotice, { useDuplicateCheck } from "@/components/admin/catalog/DuplicateNotice";
import AddEntryChoices from "@/components/admin/catalog/AddEntryChoices";
import AiPhotoStartModal from "@/components/admin/catalog/AiPhotoStartModal";
import ActiveSwitch from "@/components/admin/catalog/ActiveSwitch";
import { useBnEn } from "@/components/admin/catalog/useBnEn";
import BnEnText from "@/components/admin/catalog/BnEnText";
import SeoAutoPanel from "@/components/admin/catalog/SeoAutoPanel";
import VideoUrlField from "@/components/admin/catalog/VideoUrlField";
import LinkImportBox from "@/components/admin/catalog/LinkImportBox";
import ServiceDetailsEditor from "@/components/admin/catalog/ServiceDetailsEditor";
import { fillEnglish, toPair, type DetailLists } from "@/lib/serviceDetailKit";
import type { TierDraft } from "@/components/admin/ServicePricingTiersEditor";
import type { LinkDraft } from "@/lib/api";
import { nameFromLabel, type FieldDraft } from "@/lib/bookingFieldKit";
import { fixBoldMarks, stripMarks } from "@/lib/productText";
import { Copy, FilterX, Search } from "lucide-react";
import { useAdminT } from "@/lib/i18n/adminText";

// Fallback only — used when the taxonomy API is unreachable, so the editor
// still works offline. The live taxonomy tree is the real source (alembic 0014
// backfilled category_id from these legacy strings and now derives the string
// from the linked node).
const CATEGORIES: { value: string; label: string }[] = [
  { value: "digital_services", label: "Digital Services" },
  { value: "print_documentation", label: "Print & Documentation" },
  { value: "mobile_software", label: "Mobile Software Lab" },
  { value: "computer_software", label: "Computer Software" },
  { value: "business_software", label: "Business Software" },
  { value: "ai_solutions", label: "AI Solutions" },
  { value: "web_software", label: "Web & Software" },
  { value: "automation", label: "Automation" },
  { value: "printing", label: "Printing" },
  { value: "legal", label: "Legal" },
  { value: "web_development", label: "Web Development" },
  { value: "software", label: "Software" },
  { value: "general", label: "General" },
];
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);
const WEEKDAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const PRICING_TYPES = ["fixed", "hourly", "package", "custom", "custom_quote"] as const;

// Call-To-Action options; "" = Auto (inferred from pricing type + capabilities).
const CTA_TYPES: { value: string; label: string }[] = [
  { value: "", label: "নিজে থেকে (প্রস্তাবিত)" },
  { value: "book", label: "এখনই বুক করুন (Book Now)" },
  { value: "order", label: "অর্ডার করুন (Order Now)" },
  { value: "quote", label: "কোটেশন নিন (Request Quote)" },
  { value: "contact", label: "যোগাযোগ করুন (Contact Us)" },
];

// How the price is charged — big cards instead of a raw "pricing_type" list.
const PRICE_CARDS: { value: string; icon: string; bn: string; help: string }[] = [
  { value: "fixed", icon: "💵", bn: "নির্দিষ্ট দাম", help: "একটাই দাম, সাইটে দেখাবে" },
  { value: "hourly", icon: "⏱️", bn: "ঘণ্টা হিসেবে", help: "প্রতি ঘণ্টার চার্জ" },
  { value: "package", icon: "📦", bn: "প্যাকেজ", help: "বেসিক / স্ট্যান্ডার্ড / প্রিমিয়াম" },
  { value: "custom_quote", icon: "💬", bn: "কোটেশন / আলোচনা", help: "কাজ দেখে দাম জানাবেন" },
];

const EMPTY_SERVICE: Partial<Service> = {
  slug: "", name_en: "", name_bn: "",
  description_en: "", short_description_en: "",
  description_bn: "", short_description_bn: "",
  category: "general", pricing_type: "fixed",
  base_price: undefined, min_price: undefined, max_price: undefined, hourly_rate: undefined,
  is_active: true, is_featured: false, sort_order: 0, lead_priority: 5,
  featured_image_url: "", icon_url: "", icon_color: "",
  long_description_en: "", long_description_bn: "", tags: [],
};

const EMPTY_TIER: Partial<ServicePricingTier> = {
  tier_name: "", price: 0, description_en: "", description_bn: "", includes: "",
  features: [], is_active: true, sort_order: 0,
};

const EMPTY_FIELD: Partial<ServiceBookingFormField> = {
  field_name: "", field_type: "text", field_label_en: "", field_label_bn: "",
  is_required: false, placeholder: "", options: [], sort_order: 0, is_active: true,
  default_value: "", validation_rules: {}, conditional_logic: null,
};

/** The service's five detail lists in the editor's shape (legacy strings → pairs). */
function detailLists(s: Partial<Service>): DetailLists {
  return {
    process_steps: (s.process_steps ?? []) as DetailLists["process_steps"],
    benefits: (s.benefits ?? []).map(toPair),
    requirements: (s.requirements ?? []).map(toPair),
    required_documents: (s.required_documents ?? []).map(toPair),
    faq: (s.faq ?? []) as DetailLists["faq"],
  };
}

function slugify(t: string) {
  return t.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

export default function AdminServicesPage() {
  const tx = useAdminT();
  const t = useBnEn();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "draft">("");
  const [missingFilter, setMissingFilter] = useState<MissingFilter>("");
  const [aiOpen, setAiOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  useUnsavedGuard(useDirty(editing, editing ? (editing.id ?? "new") : null));
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [extOpen, setExtOpen] = useState(false);
  // Pricing tier sub-state (when editing)
  const [newTier, setNewTier] = useState<Partial<ServicePricingTier>>(EMPTY_TIER);
  const [addingTier, setAddingTier] = useState(false);
  const [savingTier, setSavingTier] = useState(false);
  const [deletingTierId, setDeletingTierId] = useState<string | null>(null);
  const [tierFormOpen, setTierFormOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  // Form field sub-state
  const [newField, setNewField] = useState<Partial<ServiceBookingFormField>>(EMPTY_FIELD);
  const [fieldFormOpen, setFieldFormOpen] = useState(false);
  // Non-null while editing an existing row (vs. adding a new one). The API has
  // always had PUT endpoints for both; only the UI was missing.
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [condition, setCondition] = useState({ field: "", op: "equals", value: "" });
  const [savingField, setSavingField] = useState(false);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const toast = useToastStore((s) => s.push);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [taxonomy, setTaxonomy] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  // Blog posts a service can be linked to (many-to-many).
  const [blogOptions, setBlogOptions] = useState<LinkOption[]>([]);
  const [blogOptionsLoading, setBlogOptionsLoading] = useState(false);
  const [linkedBlogsLoading, setLinkedBlogsLoading] = useState(false);
  const editorRef = useFocusTrap(editing !== null, () => {
    setEditing(null);
    setIsNew(false);
  });

  // Flattened tree ("— " per depth) so a service can sit at any depth.
  const treeOptions: { id: string; label: string }[] = [];
  {
    const flatten = (nodes: { id: string; name_en: string; name_bn?: string | null; subcategories?: unknown[] }[], depth: number) => {
      for (const n of nodes) {
        treeOptions.push({ id: n.id, label: `${"— ".repeat(depth)}${n.name_bn || n.name_en}` });
        flatten((n.subcategories ?? []) as typeof nodes, depth + 1);
      }
    };
    flatten(taxonomy as unknown as { id: string; name_en: string; subcategories?: unknown[] }[], 0);
  }

  // Descendants of the selected node, for the subcategory selector.
  const subcategoryOptions: { id: string; label: string }[] = [];
  {
    type Node = { id: string; name_en: string; name_bn?: string | null; subcategories?: Node[] };
    const findNode = (nodes: Node[], id: string): Node | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        const hit = findNode(n.subcategories ?? [], id);
        if (hit) return hit;
      }
      return null;
    };
    const collect = (nodes: Node[], depth: number) => {
      for (const n of nodes) {
        subcategoryOptions.push({ id: n.id, label: `${"— ".repeat(depth)}${n.name_bn || n.name_en}` });
        collect(n.subcategories ?? [], depth + 1);
      }
    };
    const parent = editing?.category_id
      ? findNode(taxonomy as unknown as Node[], editing.category_id)
      : null;
    collect(parent?.subcategories ?? [], 0);
  }

  const [bulkAiOpen, setBulkAiOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await serviceAdminApi.list({
        page, per_page: 20, search: search.trim() || undefined, missing: missingFilter || undefined,
        is_active: statusFilter === "" ? undefined : statusFilter === "active",
      });
      setServices((r.data.data ?? []) as Service[]);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, missingFilter]);

  useEffect(() => { const h = setTimeout(load, 300); return () => clearTimeout(h); }, [load]);

  // Shared taxonomy (service-applicable) for the optional Category/Subcategory
  // selectors. Non-fatal on failure — the form works without it.
  useEffect(() => {
    categoriesApi
      .list({ applies_to: "service" })
      .then((r) => setTaxonomy(r.data.data ?? []))
      .catch(() => setTaxonomy([]));
  }, []);

  // Blog options for the per-service "linked blogs" picker, loaded once.
  useEffect(() => {
    let alive = true;
    setBlogOptionsLoading(true);
    adminBlogApi.list({ per_page: 100 })
      .then((r) => {
        if (!alive) return;
        setBlogOptions((r.data.data ?? []).map((b) => ({
          id: String(b.id), label: b.title_en || b.title_bn || b.slug, sublabel: b.category,
        })));
      })
      .catch(() => { if (alive) setBlogOptions([]); })
      .finally(() => { if (alive) setBlogOptionsLoading(false); });
    return () => { alive = false; };
  }, []);

  const openNew = () => { setEditing({ ...EMPTY_SERVICE }); setIsNew(true); setTierFormOpen(false); setNewTier(EMPTY_TIER); setSeoOpen(false); setExtOpen(false); setFieldFormOpen(false); setNewField(EMPTY_FIELD); };

  const openEdit = async (s: Service) => {
    let base: Partial<Service>;
    try {
      const r = await servicesAdminApi.get(s.id);
      base = r.data.data as Service;
    } catch {
      base = { ...s };
    }
    setEditing(base);
    // Blog links live in a separate table; fetch them so the picker pre-ticks.
    // On failure blog_ids stays undefined → save won't touch existing links.
    setLinkedBlogsLoading(true);
    adminBlogApi.serviceLinks(s.id)
      .then((r) => setEditing((prev) => (prev && prev.id === s.id
        ? { ...prev, blog_ids: r.data.data?.blog_ids ?? [] } : prev)))
      .catch(() => {})
      .finally(() => setLinkedBlogsLoading(false));
    setIsNew(false);
    setTierFormOpen(false);
    setNewTier(EMPTY_TIER);
    setSeoOpen(false);
    setExtOpen(false);
    setFieldFormOpen(false);
    setNewField(EMPTY_FIELD);
  };

  // ── Auto-translate (English → বাংলা) ──────────────────────────────────────
  // Reuses the admin translate endpoint. Only ever FILLS EMPTY Bengali fields —
  // never overwrites text the admin already wrote, so it is safe to re-run.
  const translateOne = async (text: string): Promise<string> => {
    const src = (text ?? "").trim();
    if (!src) return "";
    try {
      const r = await adminBlogApi.translate(src, "en", "bn");
      return r.data?.data?.translated?.trim() || "";
    } catch {
      return "";
    }
  };



  const closeEditor = () => { setEditing(null); setIsNew(false); };

  // "কপি করে নতুন বানান": a hidden copy with a fresh slug (tiers / booking fields are added after the first save).
  const openClone = async (s: Service) => {
    let base: Partial<Service> = s;
    try { base = (await servicesAdminApi.get(s.id)).data.data as Service; } catch { /* use the list row */ }
    const { id: _id, pricing_tiers: _t, booking_forms: _f, ...rest } = base as Service;
    void _id; void _t; void _f;
    openNew();
    setEditing({ ...rest, slug: `${base.slug}-copy-${shortId()}`, name_en: `${base.name_en} (Copy)`, is_active: false, is_featured: false });
  };

  const svcDup = useDuplicateCheck(
    async (q) => (await serviceAdminApi.checkDuplicate(q)).data.data,
    { name: editing?.name_bn || editing?.name_en || "", slug: isNew ? editing?.slug ?? "" : "", exclude_id: editing?.id },
    editing !== null,
  );
  const isNegotiable = editing?.pricing_type === "custom" || editing?.pricing_type === "custom_quote";
  const svcChecks = [
    { bn: "ছবি", en: "Photo", ok: !!(editing?.featured_image_url || editing?.icon_url) },
    { bn: "দাম", en: "Price", ok: isNegotiable || editing?.base_price != null || editing?.min_price != null || editing?.hourly_rate != null },
    { bn: "বিবরণ", en: "Description", ok: !!(editing?.description_bn?.trim() || editing?.description_en?.trim() || editing?.short_description_bn?.trim()) },
    { bn: "ক্যাটাগরি", en: "Category", ok: !!(editing?.category_id || editing?.category) },
  ];

  // AI description → service fields. Fills empty boxes; asks before replacing text.
  const applyAiDescription = async (d: AiDescription) => {
    const cur = editing;
    if (!cur) return;
    const hasText = (cur.description_bn || "").trim() || (cur.description_en || "").trim();
    const replace = !hasText || (await askConfirm("আগের বিবরণ AI-এর লেখা দিয়ে বদলে দেবেন?"));
    setEditing((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      if (replace) {
        if (d.description_bn) next.description_bn = d.description_bn;
        if (d.description_en) next.description_en = d.description_en;
      }
      if (!(prev.short_description_bn || "").trim() && d.features_bn[0]) next.short_description_bn = d.description_bn.split(/(?<=[।.!?])\s/)[0] || d.features_bn[0];
      if (!(prev.short_description_en || "").trim() && d.description_en) next.short_description_en = d.description_en.split(/(?<=[.!?])\s/)[0];
      if (!(prev.benefits ?? []).length && d.features_en.length) {
        next.benefits = d.features_en.map((en, i) => ({ en, bn: d.features_bn[i] ?? "" }));
      }
      if (!(prev.faq ?? []).length && d.faq.length) {
        next.faq = d.faq.map((f) => ({ question: f.q_en, answer: f.a_en, question_bn: f.q_bn, answer_bn: f.a_bn }));
      }
      return next;
    });
  };

  /** Link draft → service fields (empty ones; asks before replacing text). */
  const applyLinkDraft = async (d: LinkDraft) => {
    const cur = editing;
    if (!cur) return;
    const replace = !(cur.name_bn?.trim() || cur.long_description_bn?.trim()) || (await askConfirm("আগের নাম/বিবরণ লিংকের তথ্য দিয়ে বদলে দেবেন?"));
    const pick = (old: string | undefined, val: string) => (val && (replace || !old?.trim()) ? val : old);
    setEditing((prev) => prev ? {
      ...prev,
      name_bn: pick(prev.name_bn, d.name_bn) ?? "", name_en: pick(prev.name_en, d.name_en) ?? "",
      short_description_bn: pick(prev.short_description_bn, d.short_bn), short_description_en: pick(prev.short_description_en, d.short_en),
      long_description_bn: pick(prev.long_description_bn, d.description_bn), long_description_en: pick(prev.long_description_en, d.description_en),
      featured_image_url: prev.featured_image_url || d.image_url,
      tags: prev.tags?.length ? prev.tags : d.tags,
      slug: isNew && !prev.slug && d.name_en ? slugify(d.name_en) : prev.slug,
    } : prev);
  };

  // /sumon/services?edit=<id> opens that service's editor directly.
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const id = qs.get("edit");
    if (id) openEdit({ id } as Service);
    else if (qs.get("new") === "1") openNew();
     
  }, []);

  const handleNameChange = (v: string) => {
    setEditing(prev => {
      if (!prev) return prev;
      const updates: Partial<Service> = { name_en: v };
      if (isNew || !prev.slug) updates.slug = slugify(v);
      return { ...prev, ...updates };
    });
  };

  const handleSave = async (publish?: boolean) => {
    if (!editing) return;
    if (publish && svcChecks.some((c) => !c.ok) &&
      !(await askConfirm(t(`${svcChecks.filter((c) => !c.ok).map((c) => c.bn).join(", ")} বাকি — তবুও প্রকাশ করবেন?`, `Missing ${svcChecks.filter((c) => !c.ok).map((c) => c.en).join(", ")} — publish anyway?`)))) return;
    if (isNew && svcDup.slug_taken) { toast("error", t("এই ওয়েব ঠিকানা (slug) আগে থেকেই আছে — 'উন্নত' অংশে বদলান", "Slug already exists — change it under Advanced")); return; }
    // Bangla-first: fill empty English name/descriptions from Bangla siblings
    // before validation, so the admin never types English by hand.
    let ed = publish === undefined ? editing : { ...editing, is_active: publish };
    // Repair half-typed bold marks, and fill a blank listing description from
    // the full one (first real paragraph) — nothing the admin typed is dropped.
    const tidy = (v?: string) => (v ? fixBoldMarks(v) : v);
    const firstPara = (v?: string) => {
      const paras = (v ?? "").split(/\n\s*\n/).map(stripMarks).filter(Boolean);
      return (paras.find((x) => x.length > 30) ?? paras[0] ?? "").slice(0, 400);
    };
    ed = {
      ...ed,
      description_bn: tidy(ed.description_bn), description_en: tidy(ed.description_en),
      long_description_bn: tidy(ed.long_description_bn), long_description_en: tidy(ed.long_description_en),
    };
    if (!ed.description_bn?.trim() && ed.long_description_bn?.trim()) ed = { ...ed, description_bn: firstPara(ed.long_description_bn) };
    if (!ed.description_en?.trim() && ed.long_description_en?.trim()) ed = { ...ed, description_en: firstPara(ed.long_description_en) };
    // English of steps/benefits/requirements/documents/FAQ from Bangla (blank ones only).
    try { ed = { ...ed, ...(await fillEnglish(detailLists(ed), translateBnToEn)) } as Partial<Service>; } catch { /* English stays blank; Bangla still shows */ }
    setSaving(true);
    try {
      const patch: Partial<Service> = {};
      if (!ed.name_en?.trim() && ed.name_bn?.trim()) {
        patch.name_en = await translateBnToEn(ed.name_bn);
        if (isNew || !ed.slug?.trim()) patch.slug = slugify(patch.name_en);
      }
      if (!ed.short_description_en?.trim() && ed.short_description_bn?.trim()) patch.short_description_en = await translateBnToEn(ed.short_description_bn);
      if (!ed.description_en?.trim() && ed.description_bn?.trim()) patch.description_en = await translateBnToEn(ed.description_bn);
      if (!ed.long_description_en?.trim() && ed.long_description_bn?.trim()) patch.long_description_en = await translateBnToEn(ed.long_description_bn);
      if (Object.keys(patch).length) { ed = { ...ed, ...patch }; setEditing(ed); }
    } catch {
      setSaving(false);
      toast("error", "অটো-অনুবাদ ব্যর্থ — English নিজে লিখুন বা → English চাপুন");
      return;
    }
    if (!ed.name_en?.trim()) { setSaving(false); toast("error", "ইংরেজি নাম দিন (বাংলা লিখলে নিজে অনুবাদ হবে)"); return; }
    if (!ed.slug?.trim()) { setSaving(false); toast("error", "ওয়েব ঠিকানা (slug) দিন"); return; }
    if (!ed.category_id && !ed.category) { setSaving(false); toast("error", "ক্যাটাগরি বাছুন"); return; }
    if (!ed.pricing_type) { setSaving(false); toast("error", "দামের ধরন বাছুন"); return; }
    if (ed.min_price != null && ed.max_price != null && ed.min_price > ed.max_price) {
      setSaving(false); toast("error", "সর্বনিম্ন দাম সর্বোচ্চ দামের বেশি হতে পারে না"); return;
    }
    if (ed.base_price != null && ed.base_price < 0) { setSaving(false); toast("error", "মূল দাম ঋণাত্মক হতে পারে না"); return; }

    try {
      if (isNew) {
        await servicesAdminApi.create(ed);
        toast("success", "সেবা তৈরি হয়েছে");
      } else {
        await servicesAdminApi.update(ed.id!, ed);
        toast("success", "সেবা আপডেট হয়েছে");
      }
      closeEditor();
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, isNew ? "Failed to create service" : "Failed to update service"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: "Delete this service?",
      message: "This action cannot be undone. All pricing tiers and booking forms for this service will also be deleted.",
      action: async () => {
        setConfirmState(null);
        setDeletingId(id);
        try {
          await servicesAdminApi.delete(id);
          toast("success", "সেবা মুছে ফেলা হয়েছে");
          await load();
        } catch (e) {
          toast("error", apiErrorMessage(e, "সেবা মুছে ফেলা যায়নি"));
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const toggleActive = async (s: Service) => {
    setTogglingId(s.id);
    try {
      await servicesAdminApi.update(s.id, { is_active: !s.is_active });
      await load();
    } finally {
      setTogglingId(null);
    }
  };

  const pageIds = services.map((s) => s.id).filter((id): id is string => !!id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleSelected = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const toggleSelectAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });

  const runBulkUpdate = async (patch: Partial<Service>, label: string) => {
    setBulkLoading(true);
    try {
      await Promise.all(Array.from(selected).map((id) => servicesAdminApi.update(id, patch)));
      toast("success", `${selected.size}টি সেবা ${label}`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "একসাথে আপডেট করা যায়নি"));
    } finally {
      setBulkLoading(false);
    }
  };

  const confirmBulkUpdate = (patch: Partial<Service>, verb: string, pastTenseLabel: string, question: string) => {
    const count = selected.size;
    setConfirmState({
      title: question,
      message: `${count.toLocaleString("bn-BD")}টি সেবা ${verb} হবে — লাইভ সাইটে গ্রাহক যা দেখেন তা বদলে যাবে।`,
      action: () => {
        setConfirmState(null);
        runBulkUpdate(patch, pastTenseLabel);
      },
    });
  };

  const handleBulkDelete = () => {
    const count = selected.size;
    setConfirmState({
      title: `Delete ${count} service${count === 1 ? "" : "s"}?`,
      message: "This action cannot be undone. Pricing tiers and booking forms for these services will also be deleted.",
      action: async () => {
        setConfirmState(null);
        setBulkLoading(true);
        try {
          await Promise.all(Array.from(selected).map((id) => servicesAdminApi.delete(id)));
          toast("success", `${count}টি সেবা মুছে ফেলা হয়েছে`);
          setSelected(new Set());
          await load();
        } catch (e) {
          toast("error", apiErrorMessage(e, "একসাথে মুছে ফেলা যায়নি"));
        } finally {
          setBulkLoading(false);
        }
      },
    });
  };

  const openTierEditor = (tier?: ServicePricingTier) => {
    setEditingTierId(tier?.id ?? null);
    setNewTier(tier ? { ...tier } : EMPTY_TIER);
    setTierFormOpen(true);
  };

  const closeTierEditor = () => {
    setTierFormOpen(false);
    setEditingTierId(null);
    setNewTier(EMPTY_TIER);
  };

  /** English description from Bangla when blank; features trimmed. */
  const completeTier = async (d: TierDraft): Promise<TierDraft> => {
    let en = d.description_en?.trim() || "";
    const bn = d.description_bn?.trim() || "";
    if (!en && bn) { try { en = await translateBnToEn(bn); } catch { /* optional */ } }
    return { ...d, description_en: en, features: (d.features ?? []).map((f) => f.trim()).filter(Boolean) };
  };

  /** Add several packages (starter / AI) after the existing ones. */
  const addManyTiers = async (drafts: TierDraft[]) => {
    if (!editing?.id || !drafts.length) return;
    let order = (editing.pricing_tiers ?? []).reduce((m, x) => Math.max(m, x.sort_order ?? 0), 0);
    const added: ServicePricingTier[] = [];
    try {
      for (const d of drafts) {
        order += 1;
        const r = await servicesAdminApi.createTier(editing.id, { ...EMPTY_TIER, ...(await completeTier(d)), sort_order: order });
        added.push(r.data.data as ServicePricingTier);
      }
      toast("success", t(`${added.length}টি প্যাকেজ যোগ হয়েছে — দাম বসিয়ে “সাইটে দেখাবে” টিক দিন`, `${added.length} packages added — set prices and switch them on`));
    } catch (e) {
      toast("error", apiErrorMessage(e, t("সব প্যাকেজ যোগ করা যায়নি", "Could not add all packages")));
    } finally {
      if (added.length) setEditing(prev => prev ? { ...prev, pricing_tiers: [...(prev.pricing_tiers ?? []), ...added] } : prev);
    }
  };

  /** Swap a package with its neighbour (renumbers sort_order 1..n). */
  const moveTier = async (tierId: string, dir: -1 | 1) => {
    if (!editing?.id) return;
    const list = [...(editing.pricing_tiers ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const i = list.findIndex((x) => x.id === tierId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const renum = list.map((x, k) => ({ ...x, sort_order: k + 1 }));
    const changed = renum.filter((x) => x.sort_order !== (editing.pricing_tiers ?? []).find((o) => o.id === x.id)?.sort_order);
    setEditing(prev => prev ? { ...prev, pricing_tiers: renum } : prev);
    try {
      await Promise.all(changed.map((x) => servicesAdminApi.updateTier(editing.id!, x.id, { sort_order: x.sort_order })));
    } catch (e) {
      toast("error", apiErrorMessage(e, t("ক্রম সেভ হয়নি", "Order not saved")));
    }
  };

  const handleSaveTier = async () => {
    if (!editing?.id) return;
    if (!newTier.tier_name?.trim()) { toast("error", t("প্যাকেজের নাম দিন", "Tier name is required")); return; }
    if (!newTier.price && newTier.price !== 0) { toast("error", t("দাম দিন", "Price is required")); return; }
    if (newTier.price < 0) { toast("error", t("দাম ঋণাত্মক হতে পারে না", "Price cannot be negative")); return; }
    const tierData = await completeTier(newTier);

    setSavingTier(true);
    try {
      const r = editingTierId
        ? await servicesAdminApi.updateTier(editing.id, editingTierId, tierData)
        : await servicesAdminApi.createTier(editing.id, tierData);
      const saved = r.data.data as ServicePricingTier;
      setEditing(prev => prev ? {
        ...prev,
        pricing_tiers: editingTierId
          ? (prev.pricing_tiers ?? []).map(t => (t.id === editingTierId ? saved : t))
          : [...(prev.pricing_tiers ?? []), saved],
      } : prev);
      closeTierEditor();
      toast("success", editingTierId ? t("প্যাকেজ সেভ হয়েছে", "Package saved") : t("প্যাকেজ যোগ হয়েছে", "Package added"));
    } catch (e) {
      toast("error", apiErrorMessage(e, editingTierId ? "Failed to update tier" : "Failed to add tier"));
    } finally {
      setSavingTier(false);
    }
  };

  const handleDeleteTier = (tierId: string) => {
    if (!editing?.id) return;
    setConfirmState({
      title: "Remove this pricing tier?",
      message: "Customers with this tier selected in active bookings may be affected.",
      action: async () => {
        setConfirmState(null);
        setDeletingTierId(tierId);
        try {
          await servicesAdminApi.deleteTier(editing!.id!, tierId);
          setEditing(prev => prev ? { ...prev, pricing_tiers: prev.pricing_tiers?.filter(t => t.id !== tierId) } : prev);
          toast("success", "প্যাকেজ সরানো হয়েছে");
        } catch {
          toast("error", "প্যাকেজ সরানো যায়নি");
        } finally {
          setDeletingTierId(null);
        }
      },
    });
  };

  const openFieldEditor = (field?: ServiceBookingFormField) => {
    setEditingFieldId(field?.id ?? null);
    setNewField(field ? { ...field } : EMPTY_FIELD);
    setCondition(readCondition(field ?? EMPTY_FIELD));
    setFieldFormOpen(true);
  };

  const closeFieldEditor = () => {
    setFieldFormOpen(false);
    setEditingFieldId(null);
    setNewField(EMPTY_FIELD);
    setCondition({ field: "", op: "equals", value: "" });
  };

  /** Fill the English label (translated) and machine name when left blank. */
  const completeDraft = async (d: FieldDraft, taken: string[]): Promise<FieldDraft> => {
    let en = d.field_label_en?.trim() || "";
    const bn = d.field_label_bn?.trim() || "";
    if (!en && bn) { try { en = await translateBnToEn(bn); } catch { en = bn; } }
    return { ...d, field_label_en: en, field_label_bn: bn || en, field_name: d.field_name?.trim() || nameFromLabel(en || bn, taken) };
  };

  /** Add several questions (templates / AI) in order, after the existing ones. */
  const addManyFields = async (drafts: FieldDraft[]) => {
    if (!editing?.id || !drafts.length) return;
    const existing = editing.booking_forms ?? [];
    const taken = existing.map((f) => f.field_name);
    let order = existing.reduce((m, f) => Math.max(m, f.sort_order ?? 0), 0);
    const added: ServiceBookingFormField[] = [];
    try {
      for (const d of drafts) {
        const full = await completeDraft(d, taken);
        taken.push(full.field_name!);
        order += 1;
        const r = await servicesAdminApi.createFormField(editing.id, {
          ...EMPTY_FIELD, ...full, sort_order: order,
          validation_rules: full.validation_rules && Object.keys(full.validation_rules).length ? full.validation_rules : null,
        });
        added.push(r.data.data as ServiceBookingFormField);
      }
      toast("success", t(`${added.length}টি প্রশ্ন যোগ হয়েছে`, `${added.length} questions added`));
    } catch (e) {
      toast("error", apiErrorMessage(e, t("সব প্রশ্ন যোগ করা যায়নি", "Could not add all questions")));
    } finally {
      if (added.length) setEditing(prev => prev ? { ...prev, booking_forms: [...(prev.booking_forms ?? []), ...added] } : prev);
    }
  };

  /** Swap a question with its neighbour (renumbers sort_order 1..n). */
  const moveField = async (fieldId: string, dir: -1 | 1) => {
    if (!editing?.id) return;
    const list = [...(editing.booking_forms ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const i = list.findIndex((f) => f.id === fieldId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const renum = list.map((f, k) => ({ ...f, sort_order: k + 1 }));
    const changed = renum.filter((f) => f.sort_order !== (editing.booking_forms ?? []).find((o) => o.id === f.id)?.sort_order);
    setEditing(prev => prev ? { ...prev, booking_forms: renum } : prev);
    try {
      await Promise.all(changed.map((f) => servicesAdminApi.updateFormField(editing.id!, f.id, { sort_order: f.sort_order })));
    } catch (e) {
      toast("error", apiErrorMessage(e, t("ক্রম সেভ হয়নি", "Order not saved")));
    }
  };

  const handleSaveField = async () => {
    if (!editing?.id) return;
    if (!newField.field_label_bn?.trim() && !newField.field_label_en?.trim()) { toast("error", t("প্রশ্নটি লিখুন", "Write the question")); return; }
    if (["select", "multiselect", "radio"].includes(newField.field_type ?? "") && (newField.options ?? []).filter((o) => o.trim()).length < 2) {
      toast("error", t("কমপক্ষে ২টি অপশন দিন", "Add at least 2 options")); return;
    }
    const filled = await completeDraft(
      { ...newField, options: (newField.options ?? []).map((o) => o.trim()).filter(Boolean) },
      (editing.booking_forms ?? []).filter((f) => f.id !== editingFieldId).map((f) => f.field_name),
    );
    // A new question goes to the end unless a position was typed.
    const nextOrder = !editingFieldId && !newField.sort_order
      ? (editing.booking_forms ?? []).reduce((m, f) => Math.max(m, f.sort_order ?? 0), 0) + 1
      : newField.sort_order;

    if (condition.field && !condition.value.trim()) {
      toast("error", t("“কখন দেখাবে”-এর উত্তরটি দিন", "Enter the value the condition compares against")); return;
    }


    // Strip empty rule keys so a cleared input doesn't persist as undefined.
    const rules = Object.fromEntries(
      Object.entries(newField.validation_rules ?? {}).filter(([, v]) => v !== undefined && v !== "")
    );
    const payload = {
      ...newField,
      ...filled,
      sort_order: nextOrder,
      // Label (BN) is NOT NULL on the model — fall back to the EN label so a
      // field saved without a translation doesn't 500.
      field_label_bn: filled.field_label_bn?.trim() || filled.field_label_en,
      validation_rules: Object.keys(rules).length > 0 ? rules : null,
      conditional_logic: writeCondition(condition),
    };

    setSavingField(true);
    try {
      const r = editingFieldId
        ? await servicesAdminApi.updateFormField(editing.id, editingFieldId, payload)
        : await servicesAdminApi.createFormField(editing.id, payload);
      const saved = r.data.data as ServiceBookingFormField;
      setEditing(prev => prev ? {
        ...prev,
        booking_forms: editingFieldId
          ? (prev.booking_forms ?? []).map(f => (f.id === editingFieldId ? saved : f))
          : [...(prev.booking_forms ?? []), saved],
      } : prev);
      closeFieldEditor();
      toast("success", editingFieldId ? t("প্রশ্ন সেভ হয়েছে", "Question saved") : t("প্রশ্ন যোগ হয়েছে", "Question added"));
    } catch (e) {
      toast("error", apiErrorMessage(e, editingFieldId ? "Failed to update field" : "Failed to add field"));
    } finally {
      setSavingField(false);
    }
  };

  const handleDeleteField = (fieldId: string) => {
    if (!editing?.id) return;
    setConfirmState({
      title: "Remove this form field?",
      message: "Existing booking data for this field will not be deleted, but it won't appear in new bookings.",
      action: async () => {
        setConfirmState(null);
        setDeletingFieldId(fieldId);
        try {
          await servicesAdminApi.deleteFormField(editing!.id!, fieldId);
          setEditing(prev => prev ? { ...prev, booking_forms: prev.booking_forms?.filter(f => f.id !== fieldId) } : prev);
          toast("success", "ঘর সরানো হয়েছে");
        } catch {
          toast("error", "ঘর সরানো যায়নি");
        } finally {
          setDeletingFieldId(null);
        }
      },
    });
  };

  const f = (field: keyof Service) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEditing(prev => prev ? { ...prev, [field]: e.target.value } : prev);

  const fNum = (field: keyof Service) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditing(prev => prev ? { ...prev, [field]: e.target.value ? Number(e.target.value) : undefined } : prev);

  const svcRowActions = (s: Service) => (
    <div className="flex items-center justify-end gap-1 flex-wrap">
      <button type="button" onClick={() => openClone(s)} title={t("কপি করে নতুন বানান", "Copy as new")} aria-label={t("কপি করে নতুন বানান", "Copy as new")}
        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/10 rounded-lg"><Copy className="w-4 h-4" /></button>
      <button type="button" onClick={() => openEdit(s)} aria-label={t("সম্পাদনা", "Edit")} title={t("সম্পাদনা", "Edit")}
        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/10 rounded-lg"><Pencil className="w-4 h-4" /></button>
      <button type="button" onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} aria-label={t("মুছুন", "Delete")} title={t("মুছুন", "Delete")}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
        {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Services"
        titleBn="সেবা"
        description={`${total} total services`}
        descriptionBn={`মোট ${String(total).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d])}টি সেবা`}
        actions={<button type="button" onClick={() => setBulkAiOpen(true)} className="btn btn-outline btn-sm min-h-11 gap-1.5">✨ {t("দুর্বল বিবরণ উন্নত করুন", "Improve weak descriptions")}</button>}
      />
      {bulkAiOpen && <BulkImproveModal kind="service" onClose={() => setBulkAiOpen(false)} onSaved={() => void load()} />}
      {(total > 0 || loading || search || statusFilter || missingFilter) && (
        <AddEntryChoices thing={{ bn: "সেবা", en: "service" }} onForm={openNew} onAi={() => setAiOpen(true)} />
      )}
      <div className="admin-toolbar flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-0 max-w-xl min-[641px]:w-auto min-[641px]:flex-1 min-[641px]:min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="search" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder={t("সেবা খুঁজুন…", "Search services…")} className="admin-input w-full pl-9" />
        </div>
        <select aria-label={t("অবস্থা", "Status")} value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value as "" | "active" | "draft"); }} className="admin-input !py-1.5 text-sm w-auto">
          <option value="">{t("সব অবস্থা", "Any status")}</option>
          <option value="active">{t("প্রকাশিত", "Live")}</option>
          <option value="draft">{t("খসড়া / লুকানো", "Draft / hidden")}</option>
        </select>
        <select aria-label={t("যা নেই", "Missing")} value={missingFilter} onChange={(e) => { setPage(1); setMissingFilter(e.target.value as MissingFilter); }} className="admin-input !py-1.5 text-sm w-auto">
          <option value="">{t("সব তথ্য", "Anything")}</option>
          <option value="image">{t("ছবি নেই", "No photo")}</option>
          <option value="price">{t("দাম নেই", "No price")}</option>
          <option value="description">{t("বিবরণ নেই", "No description")}</option>
        </select>
        {(search || statusFilter || missingFilter) && (
          <button type="button" onClick={() => { setSearch(""); setStatusFilter(""); setMissingFilter(""); }} className="btn btn-ghost btn-sm gap-1"><FilterX className="w-4 h-4" /> {t("ফিল্টার মুছুন", "Clear")}</button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-brand-800">{selected.size} selected</span>
          <button onClick={() => confirmBulkUpdate({ is_active: true }, "চালু", "চালু হয়েছে", "বাছাই করা সেবা চালু করবেন?")} disabled={bulkLoading} className="btn btn-outline btn-sm gap-1">
            <Check className="w-3.5 h-3.5" /> {tx("Activate")}
          </button>
          <button onClick={() => confirmBulkUpdate({ is_active: false }, "বন্ধ", "বন্ধ হয়েছে", "বাছাই করা সেবা বন্ধ করবেন?")} disabled={bulkLoading} className="btn btn-outline btn-sm gap-1">
            <Ban className="w-3.5 h-3.5" /> {tx("Deactivate")}
          </button>
          <button onClick={() => confirmBulkUpdate({ is_featured: true }, "ফিচার্ড", "ফিচার্ড হয়েছে", "বাছাই করা সেবা ফিচার্ড করবেন?")} disabled={bulkLoading} className="btn btn-outline btn-sm gap-1">
            <Star className="w-3.5 h-3.5" /> {tx("Feature")}
          </button>
          <button onClick={() => confirmBulkUpdate({ is_featured: false }, "ফিচার্ড থেকে বাদ", "ফিচার্ড থেকে বাদ হয়েছে", "বাছাই করা সেবা ফিচার্ড থেকে বাদ দেবেন?")} disabled={bulkLoading} className="btn btn-outline btn-sm gap-1">
            <StarOff className="w-3.5 h-3.5" /> {tx("Unfeature")}
          </button>
          <button onClick={handleBulkDelete} disabled={bulkLoading} className="btn btn-outline btn-sm gap-1 text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> {tx("Delete")}
          </button>
          {bulkLoading && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
          <button onClick={() => setSelected(new Set())} className="btn btn-ghost btn-sm ml-auto">
            {tx("Clear")}
          </button>
        </div>
      )}

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : services.length === 0 ? (
          (search || statusFilter || missingFilter) ? (
            <div className="p-10 text-center text-sm text-muted">{t("এই খোঁজ/ফিল্টারে কোনো সেবা নেই।", "No services match.")}</div>
          ) : (
            <div className="p-5 sm:p-8 space-y-4">
              <div className="text-center"><Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-heading font-medium">{t("এখনো কোনো সেবা নেই", "No services yet")}</p></div>
              <AddEntryChoices large thing={{ bn: "সেবা", en: "service" }} onForm={openNew} onAi={() => setAiOpen(true)} />
            </div>
          )
        ) : (
          <>
          <ul className="min-[641px]:hidden divide-y divide-gray-100 dark:divide-white/10">
            {services.map((s) => (
              <li key={s.id} className="flex gap-3 px-3 py-3">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelected(s.id)} className="rounded mt-1" aria-label={s.name_bn || s.name_en} />
                <ServiceThumb src={s.featured_image_url || s.icon_url} />
                <div className="min-w-0 flex-1 space-y-1">
                  <button type="button" onClick={() => openEdit(s)} className="block text-left font-medium text-heading line-clamp-2">{s.name_bn || s.name_en}</button>
                  <p className="text-xs text-muted">{s.pricing_type === "custom" || s.pricing_type === "custom_quote" ? t("দাম আলোচনা সাপেক্ষে", "Price on request") : s.base_price != null ? formatPrice(s.base_price) : "—"}</p>
                  <div className="flex items-center justify-between">
                    <ActiveSwitch active={!!s.is_active} busy={togglingId === s.id} onChange={() => toggleActive(s)} />
                    {svcRowActions(s)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden min-[641px]:block overflow-x-auto">
          <table className="table-premium">
            <thead>
              <tr>
                <th className="w-10 px-3"><input type="checkbox" aria-label={tx("Select all services on this page")} checked={allOnPageSelected} onChange={toggleSelectAll} className="rounded" /></th>
                <th>{t("সেবা", "Service")}</th>
                <th className="hidden lg:table-cell">{t("ক্যাটাগরি", "Category")}</th>
                <th>{t("দাম", "Price")}</th>
                <th className="hidden lg:table-cell">{t("প্যাকেজ", "Tiers")}</th>
                <th>{t("অবস্থা", "Status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-3"><input type="checkbox" aria-label={s.name_bn || s.name_en} checked={selected.has(s.id)} onChange={() => toggleSelected(s.id)} className="rounded" /></td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => openEdit(s)} className="flex items-center gap-3 text-left">
                      <ServiceThumb src={s.featured_image_url || s.icon_url} small />
                      <span className="min-w-0">
                        <span className="block font-medium text-heading">{s.name_bn || s.name_en}{s.is_featured && <Star className="inline w-3.5 h-3.5 text-amber-400 ml-1" />}</span>
                        <span className="block text-xs text-gray-400">{s.slug}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 hidden lg:table-cell">{CATEGORY_LABELS[s.category ?? ""] ?? (s.category ?? "").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-sm">{s.pricing_type === "custom" || s.pricing_type === "custom_quote" ? t("আলোচনা সাপেক্ষে", "On request") : s.base_price != null ? formatPrice(s.base_price) : <span className="text-muted capitalize">{s.pricing_type}</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm hidden lg:table-cell">{s.pricing_tiers?.length ?? 0}</td>
                  <td className="px-4 py-3"><ActiveSwitch active={!!s.is_active} busy={togglingId === s.id} onChange={() => toggleActive(s)} /></td>
                  <td className="px-4 py-3">{svcRowActions(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          </>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm">{tx("Previous")}</button>
          <span className="px-4 py-2 text-sm text-gray-600">{tx("Page")} {page}</span>
          <button disabled={services.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">{tx("Next")}</button>
        </div>
      )}

      {/* Create / Edit panel */}
      {editing !== null && (
        <div
          className="admin-overlay admin-overlay--panel fixed inset-0 z-50 flex"
          style={ADMIN_MODAL_BACKDROP_STYLE}
          role="dialog"
          aria-modal="true"
          aria-label={isNew ? "Create service" : "Edit service"}
        >
          <div ref={editorRef} className="admin-sheet admin-sheet--l ml-auto w-full max-w-2xl h-full flex flex-col bg-white shadow-2xl animate-slide-in-right overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-heading">{isNew ? t("নতুন সেবা", "New service") : t("সেবা সম্পাদনা", "Edit service")}</h2>
              <button aria-label="বন্ধ করুন" type="button" onClick={closeEditor} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Scrollable form */}
            <div data-step-scroll className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
              {/* Live website preview — the real ServiceCard with current values */}
              <LivePreview>
                <div className="p-1 pointer-events-none">
                  <ServiceCard service={editing as Service} lang="bn" />
                </div>
              </LivePreview>
              <StepForm steps={[
                { id: "basic", bn: "মূল তথ্য", en: "Basics", status: (editing.name_bn || editing.name_en) && (editing.category_id || editing.category) ? "ok" : "warn", content: (<>
                {!editing.id && !(editing.name_bn || editing.name_en) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted">{t("দ্রুত শুরু:", "Quick start:")}</span>
                    {["পাসপোর্ট আবেদন", "NID সেবা", "জন্ম নিবন্ধন", "প্রিন্টিং ও ফটোকপি", "মোবাইল সার্ভিসিং", "ওয়েবসাইট তৈরি"].map((n) => (
                      <button key={n} type="button" onClick={() => setEditing(prev => prev ? { ...prev, name_bn: n } : prev)} className="rounded-full border border-gray-200 dark:border-white/10 px-3 min-h-9 text-xs hover:border-brand-400">{n}</button>
                    ))}
                    <span className="text-xs text-muted">{t("— তারপর “✨ AI বিবরণ” চাপুন", "— then tap “✨ AI”")}</span>
                  </div>
                )}
                <BnEnText label={t("সেবার নাম", "Service name")} required
                  bn={editing.name_bn} en={editing.name_en}
                  onBn={(v) => setEditing(prev => prev ? { ...prev, name_bn: v } : prev)}
                  onEn={handleNameChange}
                  placeholderBn="যেমন: প্রিন্টিং ও ফটোকপি সেবা" placeholderEn="e.g. Printing & Photocopy"
                  hint={t("শুধু বাংলা লিখলেই চলবে — সেভের সময় ইংরেজি নাম ও ওয়েব ঠিকানা নিজে থেকে তৈরি হবে।", "Bangla is enough — the English name and web address are made on save.")} />
                <DuplicateNotice result={svcDup} onOpen={(m) => openEdit({ id: m.id } as Service)} />
                <div className="flex flex-wrap gap-2"><LinkImportBox kind="service" onDraft={applyLinkDraft} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* One classification. The taxonomy is authoritative; the
                      legacy `category` string is derived from the chosen node
                      server-side, so both always agree. The free-text select
                      below only appears when the taxonomy is unreachable. */}
                  {taxonomy.length > 0 ? (
                    <div>
                      <label className="form-label">
                        {tx("Category")} <span className="text-red-400">*</span>{" "}

                      </label>
                      <select
                        value={editing.category_id ?? ""}
                        onChange={(e) =>
                          setEditing((prev) =>
                            prev ? { ...prev, category_id: e.target.value || null, subcategory_id: null } : prev
                          )
                        }
                        className="input w-full text-sm"
                      >
                        <option value="">— বাছুন —</option>
                        {treeOptions.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="form-label">{tx("Category")} <span className="text-red-400">*</span></label>
                      <select value={editing.category ?? ""} onChange={f("category")} className="input w-full text-sm">
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="form-label">{t("তালিকায় ক্রম", "Sort order")}</label>
                    <input type="number" value={editing.sort_order ?? 0} onChange={fNum("sort_order")} className="input w-full" />
                    <p className="text-[11px] text-gray-400 mt-1">{t("ছোট সংখ্যা আগে দেখাবে (০ = স্বাভাবিক)।", "Lower shows first.")}</p>
                  </div>
                </div>

                {taxonomy.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Second taxonomy link. Without this the column could only
                        ever be set by direct API call, while service filters
                        and the category-delete guard both read it. */}
                    <div>
                      <label className="form-label">
                        সাব-ক্যাটাগরি <span className="text-gray-400 font-normal">(ঐচ্ছিক)</span>
                      </label>
                      <select
                        value={editing.subcategory_id ?? ""}
                        onChange={(e) =>
                          setEditing((prev) => (prev ? { ...prev, subcategory_id: e.target.value || null } : prev))
                        }
                        disabled={!editing.category_id}
                        className="input w-full text-sm"
                      >
                        <option value="">— None —</option>
                        {subcategoryOptions.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                </>) },
                { id: "photos", bn: "ছবি", en: "Photos", status: editing.featured_image_url || editing.icon_url ? "ok" : "warn", content: (<>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageUpload
                    label={t("আইকন (ছোট ছবি)", "Icon")}
                    value={editing.icon_url ?? ""}
                    onChange={(url) => setEditing(prev => prev ? { ...prev, icon_url: url } : prev)}
                    folder="abo-enterprise/services"
                    previewSize="sm"
                    purpose="service-icon"
                  />
                  <ImageUpload
                    label={t("মূল ছবি", "Main image")}
                    value={editing.featured_image_url ?? ""}
                    onChange={(url) => setEditing(prev => prev ? { ...prev, featured_image_url: url } : prev)}
                    folder="abo-enterprise/services"
                    purpose="service-image"
                  />
                </div>
                <VideoUrlField value={editing.video_url} onChange={(v) => setEditing(prev => prev ? { ...prev, video_url: v || null } : prev)} folder="abo-enterprise/services" />
                </>) },
                { id: "price", bn: "দাম", en: "Price", status: svcChecks[1].ok ? "ok" : "warn", content: (<>
              <section className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t("কীভাবে দাম নেবেন?", "How is it priced?")} <span className="text-red-500">*</span></p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {PRICE_CARDS.map((c) => {
                      const on = editing.pricing_type === c.value || (c.value === "custom_quote" && editing.pricing_type === "custom");
                      return (
                        <button key={c.value} type="button" aria-pressed={on}
                          onClick={() => setEditing(prev => prev ? { ...prev, pricing_type: on ? prev.pricing_type : c.value as Service["pricing_type"] } : prev)}
                          className={`rounded-xl border p-3 text-left min-h-11 transition-colors ${on ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15 ring-1 ring-brand-500" : "border-[var(--line)] bg-white dark:bg-white/5 hover:border-brand-300"}`}>
                          <span className="text-xl" aria-hidden>{c.icon}</span>
                          <span className="block text-sm font-semibold text-heading mt-1">{c.bn}</span>
                          <span className="block text-[11px] text-muted">{c.help}</span>
                        </button>
                      );
                    })}
                  </div>
                  {isNegotiable && <p className="text-xs text-muted mt-2">{t("সাইটে দামের জায়গায় “দাম জানতে যোগাযোগ / কোটেশন নিন” দেখাবে।", "The site shows “request a quote” instead of a price.")}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(editing.pricing_type === "fixed" || editing.pricing_type === "package" || editing.pricing_type === "hourly") && (
                    <div>
                      <label className="form-label">
                        {editing.pricing_type === "fixed" ? t("দাম (৳)", "Price (৳)") : editing.pricing_type === "package" ? t("শুরু ৳… থেকে (ঐচ্ছিক)", "From ৳ (optional)") : t("সর্বনিম্ন চার্জ ৳ (ঐচ্ছিক)", "Minimum charge ৳ (optional)")}
                      </label>
                      <input type="number" inputMode="numeric" value={editing.base_price ?? ""} onChange={fNum("base_price")} placeholder="0" className="input w-full" />
                      <p className="text-[11px] text-gray-400 mt-1">{t("খালি রাখলে সাইটে “দাম জানতে যোগাযোগ” দেখাবে।", "Blank = “contact for price”.")}</p>
                    </div>
                  )}
                  {editing.pricing_type === "hourly" && (
                    <div>
                      <label className="form-label">{t("প্রতি ঘণ্টা ৳", "Per hour ৳")}</label>
                      <input type="number" inputMode="numeric" value={editing.hourly_rate ?? ""} onChange={fNum("hourly_rate")} placeholder="0" className="input w-full" />
                    </div>
                  )}
                  {editing.pricing_type === "package" && (
                    <p className="text-xs text-muted sm:col-span-2 rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2">📦 {t("নিচের “প্যাকেজ” অংশে বেসিক/স্ট্যান্ডার্ড/প্রিমিয়াম দাম যোগ করুন।", "Add the package prices in the Packages section below.")}</p>
                  )}
                </div>
                <details className="rounded-xl border border-[var(--line)]" open={isNegotiable || editing.min_price != null || editing.max_price != null}>
                  <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium text-heading min-h-11">↔️ {t("দামের সীমা (ঐচ্ছিক)", "Price range (optional)")}</summary>
                  <div className="px-3 pb-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label text-xs">{t("সর্বনিম্ন ৳", "Minimum ৳")}</label>
                      <input type="number" inputMode="numeric" value={editing.min_price ?? ""} onChange={fNum("min_price")} placeholder="0" className="input w-full" />
                    </div>
                    <div>
                      <label className="form-label text-xs">{t("সর্বোচ্চ ৳", "Maximum ৳")}</label>
                      <input type="number" inputMode="numeric" value={editing.max_price ?? ""} onChange={fNum("max_price")} placeholder="0" className="input w-full" />
                    </div>
                    <p className="col-span-2 text-[11px] text-gray-400">{t("আনুমানিক খরচ বোঝাতে, যেমন ৳৫০০–৳২,০০০।", "An estimate, e.g. ৳500–৳2,000.")}</p>
                  </div>
                </details>
                <details className="rounded-xl border border-[var(--line)]" open={!!(editing.delivery_charge || editing.consultancy_fee || editing.requires_advance)}>
                  <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium text-heading min-h-11">💳 {t("অতিরিক্ত চার্জ ও অগ্রিম (ঐচ্ছিক)", "Extra charges & advance (optional)")}</summary>
                  <div className="px-3 pb-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="form-label text-xs">{t("ডেলিভারি চার্জ ৳", "Delivery charge ৳")}</label>
                        <input type="number" inputMode="numeric" value={editing.delivery_charge ?? ""} onChange={fNum("delivery_charge")} placeholder="0" className="input w-full" />
                      </div>
                      <div>
                        <label className="form-label text-xs">{t("পরামর্শ ফি / অগ্রিম ৳", "Consultancy fee / advance ৳")}</label>
                        <input type="number" inputMode="numeric" value={editing.consultancy_fee ?? ""} onChange={fNum("consultancy_fee")} placeholder="0" className="input w-full" />
                      </div>
                    </div>
                    <label className="flex items-start gap-2 text-sm cursor-pointer min-h-11">
                      <input type="checkbox" checked={!!editing.requires_advance} onChange={e => setEditing(prev => prev ? { ...prev, requires_advance: e.target.checked } : prev)} className="rounded mt-0.5" />
                      <span>{t("অগ্রিম/পরামর্শ ফি লাগবে", "Requires advance / consultancy fee")}<span className="block text-[11px] text-gray-400">{t("টাকা পাওয়ার পর বুকিং নিশ্চিত হবে।", "Booking is confirmed after payment.")}</span></span>
                    </label>
                  </div>
                </details>
                <details className="rounded-xl border border-[var(--line)]" open={!!(editing.fulfilment || editing.turnaround_days_min || editing.turnaround_days_max)}>
                  <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium text-heading min-h-11">🕒 {t("কাজ কোথায় ও কত দিনে (ঐচ্ছিক)", "Where & how long (optional)")}</summary>
                  <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="form-label text-xs">{t("কাজ কোথায় হবে", "Where the work happens")}</label>
                      <select value={editing.fulfilment ?? ""} onChange={(e) => setEditing(prev => prev ? { ...prev, fulfilment: (e.target.value || null) as ServiceFulfilment } : prev)} className="input w-full text-sm">
                        <option value="">{t("উল্লেখ নেই", "Not stated")}</option>
                        <option value="remote">{t("অনলাইনে — দোকানে আসতে হবে না", "Remote — no visit needed")}</option>
                        <option value="at_shop">{t("দোকানে — গ্রাহককে আসতে হবে", "At shop — customer comes in")}</option>
                        <option value="hybrid">{t("দুটোই — অনলাইনে শুরু, দোকানে শেষ", "Hybrid — online, finished at shop")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label text-xs">{t("কত কর্মদিবসে শেষ হবে", "Working days to finish")}</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} max={365} value={editing.turnaround_days_min ?? ""} onChange={fNum("turnaround_days_min")} placeholder={t("কম", "min")} className="input w-full" />
                        <span className="text-gray-400">–</span>
                        <input type="number" min={1} max={365} value={editing.turnaround_days_max ?? ""} onChange={fNum("turnaround_days_max")} placeholder={t("বেশি", "max")} className="input w-full" />
                      </div>
                    </div>
                    <div>
                      <label className="form-label text-xs">{t("গুরুত্ব (১-১০)", "Lead priority (1-10)")}</label>
                      <input type="number" min={1} max={10} value={editing.lead_priority ?? 5} onChange={fNum("lead_priority")} className="input w-full" />
                      <p className="text-[11px] text-gray-400 mt-1">{t("বেশি হলে নতুন অনুরোধ অ্যাডমিন তালিকায় আগে আসে।", "Higher = new requests listed first.")}</p>
                    </div>
                  </div>
                </details>
              </section>
              {/* ── Pricing Tiers (edit only) ────────────── */}
              <ServicePricingTiersEditor
                isNew={isNew}
                tiers={editing.pricing_tiers}
                tierFormOpen={tierFormOpen}
                openTierEditor={openTierEditor}
                closeTierEditor={closeTierEditor}
                deletingTierId={deletingTierId}
                handleDeleteTier={handleDeleteTier}
                newTier={newTier}
                setNewTier={setNewTier}
                savingTier={savingTier}
                handleSaveTier={handleSaveTier}
                editingTierId={editingTierId}
                onAddMany={addManyTiers}
                onMove={moveTier}
                serviceName={editing.name_bn || editing.name_en}
                notes={stripMarks(editing.short_description_bn || editing.long_description_bn || "").slice(0, 1500)}
              />
                </>) },
                { id: "desc", bn: "বিবরণ", en: "Description", status: svcChecks[2].ok ? "ok" : "warn", content: (<>
              {/* ── Descriptions ─────────────────────────── */}
              <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted flex-1 min-w-[12rem]">{t("✨ AI নাম দেখে বিবরণ, সুবিধা ও প্রশ্নোত্তর লিখে দেবে — আপনি দেখে বদলাতে পারবেন।", "✨ AI writes the description, benefits and FAQ from the name.")}</p>
                  <AiDescribeButton
                    kind="service"
                    name={editing.name_bn || editing.name_en}
                    notes={[editing.short_description_bn, editing.short_description_en, editing.description_bn].filter(Boolean).join("\n")}
                    onResult={applyAiDescription}
                    className="btn btn-outline btn-sm gap-1.5"
                  />
                </div>
                <BnEnText label={t("ছোট বিবরণ — কার্ডে দেখাবে", "Short description — shown on cards")} rows={2}
                  bn={editing.short_description_bn} en={editing.short_description_en}
                  onBn={(v) => setEditing(prev => prev ? { ...prev, short_description_bn: v } : prev)}
                  onEn={(v) => setEditing(prev => prev ? { ...prev, short_description_en: v } : prev)}
                  placeholderBn="এক-দুই লাইনে সেবাটি কী" placeholderEn="One-line summary…" />
                <BnEnText label={t("বিস্তারিত বিবরণ — সেবার পাতায় দেখাবে", "Full description — shown on the service page")} rich rows={8}
                  bn={editing.long_description_bn} en={editing.long_description_en}
                  onBn={(v) => setEditing(prev => prev ? { ...prev, long_description_bn: v } : prev)}
                  onEn={(v) => setEditing(prev => prev ? { ...prev, long_description_en: v } : prev)}
                  placeholderBn="সেবার বিস্তারিত — টুলবার দিয়ে শিরোনাম, তালিকা, রঙ, লিংক, ছবি দিন" placeholderEn="In-depth write-up…"
                  hint={t("“প্রিভিউ” চাপলে সাইটে যেমন দেখাবে তেমন দেখা যাবে।", "Tap Preview to see it as on the site.")} />
                <details className="rounded-xl border border-[var(--line)]" open={!!(editing.description_bn?.trim() && !editing.long_description_bn?.trim())}>
                  <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium text-heading min-h-11">
                    📝 {t("তালিকার বিবরণ (ঐচ্ছিক)", "Listing description (optional)")}
                    <span className="block text-[11px] font-normal text-muted">{t("খালি রাখলে বিস্তারিত বিবরণের প্রথম অংশ নিজে থেকে বসবে।", "Blank = the first part of the full description is used.")}</span>
                  </summary>
                  <div className="px-3 pb-3">
                    <BnEnText label={t("তালিকার বিবরণ", "Listing description")} rich rows={4}
                      bn={editing.description_bn} en={editing.description_en}
                      onBn={(v) => setEditing(prev => prev ? { ...prev, description_bn: v } : prev)}
                      onEn={(v) => setEditing(prev => prev ? { ...prev, description_en: v } : prev)} />
                  </div>
                </details>
                <div>
                  <label className="form-label">{t("ট্যাগ", "Tags")} <span className="text-gray-400 font-normal text-xs">({t("কমা দিয়ে — সার্চ ও “এরকম আরও সেবা”-তে কাজে লাগে", "comma-separated — search & related services")})</span></label>
                  <input
                    value={editing.tags?.join(", ") ?? ""}
                    onChange={(e) => setEditing((prev) => prev ? { ...prev, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } : prev)}
                    placeholder="printing, photocopy, প্রিন্ট…"
                    className="input w-full text-sm"
                  />
                </div>
              </section>
              <ServiceDetailsEditor
                value={detailLists(editing)}
                onChange={(next) => setEditing(prev => prev ? { ...prev, ...next } as Service : prev)}
                serviceName={editing.name_bn || editing.name_en}
                notes={stripMarks(editing.short_description_bn || editing.long_description_bn || editing.description_bn || "").slice(0, 1500)}
                otherServices={services.filter((x) => x.id !== editing.id).map((x) => ({ id: x.id, name: x.name_bn || x.name_en }))}
                loadService={async (id) => { try { return detailLists((await servicesAdminApi.get(id)).data.data as Service); } catch { return null; } }}
              />
                </>) },
                { id: "publish", bn: "প্রকাশ", en: "Publish", status: svcChecks.every((c) => c.ok) ? "ok" : "warn", content: (<>
                <PublishChecklist items={svcChecks} tips={[
                  { bn: "ইংরেজি নাম", en: "English name", ok: !!editing?.name_en?.trim(), hint: "বাংলা নামের পাশের অনুবাদ বোতাম চাপুন" },
                  { bn: "বিস্তারিত বিবরণ (১২০+ অক্ষর)", en: "Detailed description (120+ chars)", ok: ((editing?.description_bn || editing?.description_en || "").trim().length >= 120), hint: "“✨ AI বিবরণ” দিয়ে লেখান" },
                ]} />
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none min-h-11">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={!!editing.is_active}
                        onChange={e => setEditing(prev => prev ? { ...prev, is_active: e.target.checked } : prev)} />
                      <div className={`w-10 h-6 rounded-full transition-colors ${editing.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editing.is_active ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{t("সাইটে দেখাবে", "Live on site")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={!!editing.is_featured}
                        onChange={e => setEditing(prev => prev ? { ...prev, is_featured: e.target.checked } : prev)} />
                      <div className={`w-10 h-6 rounded-full transition-colors ${editing.is_featured ? "bg-amber-400" : "bg-gray-300"}`} />
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editing.is_featured ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{t("⭐ হোমপেজে দেখান", "⭐ Featured")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none" title="Also let customers buy/order this service like a product">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={!!editing.is_orderable}
                        onChange={e => setEditing(prev => prev ? { ...prev, is_orderable: e.target.checked ? true : null } : prev)} />
                      <div className={`w-10 h-6 rounded-full transition-colors ${editing.is_orderable ? "bg-brand-500" : "bg-gray-300"}`} />
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editing.is_orderable ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{t("🛒 পণ্যের মতো অর্ডারও নেওয়া যাবে", "🛒 Also orderable")}</span>
                  </label>
                  {/* Turning this off makes the CTA "Contact Us" and the booking
                      endpoint reject submissions — unless the service is also
                      orderable, which keeps the Order Now flow working. */}
                  <label className="flex items-center gap-2 cursor-pointer select-none" title="Uncheck to stop taking online bookings for this service">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={editing.is_bookable !== false}
                        onChange={e => setEditing(prev => prev ? { ...prev, is_bookable: e.target.checked ? null : false } : prev)} />
                      <div className={`w-10 h-6 rounded-full transition-colors ${editing.is_bookable !== false ? "bg-brand-500" : "bg-gray-300"}`} />
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editing.is_bookable !== false ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{t("📅 অনলাইনে বুকিং নেওয়া যাবে", "📅 Bookable online")}</span>
                  </label>
                </div>
                {/* Linked blog posts — many-to-many. Ticking a blog features
                    this service in that article; the link shows in the blog
                    editor too. */}
                <div>
                  <label className="form-label">
                    {t("ব্লগে দেখান", "Show in blog posts")}
                    {(editing.blog_ids?.length ?? 0) > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-600 text-white text-[10px] font-bold align-middle">
                        {editing.blog_ids?.length}
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">{t("যে ব্লগ পোস্টের নিচে এই সেবা দেখাতে চান, টিক দিন।", "Tick the blog posts to feature this service in.")}</p>
                  <LinkChecklist
                    options={blogOptions}
                    selected={editing.blog_ids ?? []}
                    loading={blogOptionsLoading || linkedBlogsLoading}
                    emptyText={tx("No blog posts")}
                    searchPlaceholder={t("ব্লগ খুঁজুন…", "Search blog posts…")}
                    onToggle={(id) => setEditing(prev => {
                      if (!prev) return prev;
                      const cur = prev.blog_ids ?? [];
                      return { ...prev, blog_ids: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
                    })}
                  />
                </div>
                <AdvancedSection>
                <div>
                  <label className="form-label">ওয়েব ঠিকানা (slug) <span className="text-red-400">*</span></label>
                  <input value={editing.slug ?? ""} onChange={f("slug")} placeholder="url-friendly-slug" className="input w-full font-mono text-sm" />
                  <p className="text-[11px] text-gray-400 mt-1">ইংরেজি নাম লিখলে নিজে থেকে তৈরি হয় (ছোট হাতের ইংরেজি ও - চিহ্ন)।</p>
                </div>
                <DuplicateNotice result={svcDup} onOpen={(m) => openEdit({ id: m.id } as Service)} show="codes" />
              {/* ── Scheduling (optional) ───────────────── */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-heading">📅 {t("সময় নির্ধারণ (অ্যাপয়েন্টমেন্ট)", "Appointment scheduling")}</h3>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editing.scheduling_enabled}
                    onChange={e => setEditing(prev => prev ? { ...prev, scheduling_enabled: e.target.checked } : prev)}
                    className="rounded"
                  />
                  {t("এই সেবার জন্য নির্দিষ্ট সময়ের স্লট নেবেন", "Take time-slot appointments for this service")}
                </label>
                <p className="text-xs text-gray-400 -mt-2">
                  {t("বন্ধ থাকলে (স্বাভাবিক) গ্রাহক শুধু পছন্দের তারিখ দেন — সময়ের স্লট বা খালি আছে কিনা যাচাই হয় না।", "Off (default): customers just pick a preferred date — no slots or availability checks.")}
                </p>

                {editing.scheduling_enabled && (
                  <div className="space-y-4 border border-gray-100 rounded-xl p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="form-label text-[11px]">{t("প্রতি স্লট (মিনিট)", "Slot length (min)")}</label>
                        <input type="number" min={5} value={editing.slot_duration_minutes ?? 60}
                          onChange={fNum("slot_duration_minutes")} className="input w-full text-sm" />
                      </div>
                      <div>
                        <label className="form-label text-[11px]">{t("প্রতি স্লটে কতজন", "Capacity / slot")}</label>
                        <input type="number" min={1} value={editing.slot_capacity ?? 1}
                          onChange={fNum("slot_capacity")} className="input w-full text-sm" />
                      </div>
                      <div>
                        <label className="form-label text-[11px]">{t("কত ঘণ্টা আগে বুক করতে হবে", "Min notice (hrs)")}</label>
                        <input type="number" min={0} value={editing.min_notice_hours ?? 0}
                          onChange={fNum("min_notice_hours")} className="input w-full text-sm" />
                      </div>
                      <div>
                        <label className="form-label text-[11px]">{t("কত দিন আগে পর্যন্ত বুক", "Book ahead (days)")}</label>
                        <input type="number" min={1} value={editing.booking_horizon_days ?? 60}
                          onChange={fNum("booking_horizon_days")} className="input w-full text-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="form-label text-[11px]">{t("কাজের সময়", "Working hours")}</label>
                      <p className="text-[11px] text-gray-400 mb-2">
                        {t("কোনো দিন বন্ধ হলে খালি রাখুন। একাধিক সময়: 09:00-13:00, 14:00-18:00", "Leave a day blank to close it. Multiple ranges: 09:00-13:00, 14:00-18:00")}
                      </p>
                      <div className="space-y-2">
                        {WEEKDAYS.map(({ key, label }) => {
                          const ranges = (editing.working_hours?.[key] ?? []) as [string, string][];
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className="w-10 text-xs font-medium text-gray-500">{label}</span>
                              <input
                                value={ranges.map(([a, b]) => `${a}-${b}`).join(", ")}
                                onChange={e => {
                                  const parsed = e.target.value
                                    .split(",")
                                    .map(part => part.trim().split("-").map(x => x.trim()))
                                    .filter(pair => pair.length === 2 && pair[0] && pair[1]) as [string, string][];
                                  setEditing(prev => prev ? {
                                    ...prev,
                                    working_hours: { ...(prev.working_hours ?? {}), [key]: parsed },
                                  } : prev);
                                }}
                                placeholder="09:00-17:00"
                                className="input flex-1 text-sm font-mono"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="form-label text-[11px]">{t("ছুটির দিন (প্রতি লাইনে একটি তারিখ, YYYY-MM-DD)", "Holidays (one date per line, YYYY-MM-DD)")}</label>
                      <textarea
                        rows={3}
                        value={(editing.holidays ?? []).join("\n")}
                        onChange={e => setEditing(prev => prev ? {
                          ...prev,
                          holidays: e.target.value.split("\n").map(x => x.trim()).filter(Boolean),
                        } : prev)}
                        placeholder={"2026-12-16\n2026-03-26"}
                        className="input w-full text-sm resize-y font-mono"
                      />
                    </div>
                  </div>
                )}
              </section>
              {/* ── Call-To-Action ──────────────────────── */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-heading">🔘 {t("সেবার পাতার মূল বোতাম", "Main button on the service page")}</h3>
                <p className="text-xs text-gray-400 -mt-2">
                  {t("“নিজে থেকে” রাখলে: কোটেশন হলে “কোটেশন নিন”, অর্ডার নেওয়া গেলে “অর্ডার করুন”, নইলে “বুক করুন” দেখাবে।", "“Auto”: quote → Request Quote, orderable → Order Now, otherwise Book Now.")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">{t("বোতামের ধরন", "Button type")}</label>
                    <select
                      value={editing.cta_type ?? ""}
                      onChange={(e) => setEditing(prev => prev ? { ...prev, cta_type: e.target.value || null } : prev)}
                      className="input w-full text-sm"
                    >
                      {CTA_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2"><label className="form-label">{t("নিজস্ব লেখা (English)", "Custom label (EN)")}</label><TranslateButton bn={editing.cta_label_bn} onResult={(en) => setEditing(prev => prev ? { ...prev, cta_label_en: en } : prev)} en={editing.cta_label_en} onResultBn={(b) => setEditing(prev => prev ? { ...prev, cta_label_bn: b } : prev)} /></div>
                    <input
                      value={editing.cta_label_en ?? ""}
                      onChange={(e) => setEditing(prev => prev ? { ...prev, cta_label_en: e.target.value || null } : prev)}
                      placeholder="e.g. Get Started"
                      className="input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="form-label">{t("নিজস্ব লেখা (বাংলা)", "Custom label (বাংলা)")}</label>
                    <input
                      value={editing.cta_label_bn ?? ""}
                      onChange={(e) => setEditing(prev => prev ? { ...prev, cta_label_bn: e.target.value || null } : prev)}
                      placeholder="যেমন: শুরু করুন"
                      className="input w-full text-sm"
                      dir="auto"
                    />
                  </div>
                </div>
              </section>
              {/* ── Booking Form Fields (edit only) ─────── */}
              <ServiceBookingFormFieldsEditor
                isNew={isNew}
                fields={editing.booking_forms}
                fieldFormOpen={fieldFormOpen}
                openFieldEditor={openFieldEditor}
                closeFieldEditor={closeFieldEditor}
                deletingFieldId={deletingFieldId}
                handleDeleteField={handleDeleteField}
                newField={newField}
                setNewField={setNewField}
                condition={condition}
                setCondition={setCondition}
                editingFieldId={editingFieldId}
                savingField={savingField}
                handleSaveField={handleSaveField}
                onAddMany={addManyFields}
                onMove={moveField}
                serviceName={editing.name_bn || editing.name_en}
                serviceNotes={stripMarks(editing.short_description_bn || editing.short_description_en || editing.description_bn || "")}
              />
              {/* ── SEO ─────────────────────────────────── */}
              <section>
                <button type="button" onClick={() => setSeoOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl text-left">
                  <span className="text-sm font-semibold text-heading">🔎 {t("Google-এ দেখানো (SEO)", "SEO (Google)")}</span>
                  {seoOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {seoOpen && (
                  <div className="mt-2 space-y-3 px-1">
                    <SeoAutoPanel name={editing.name_bn || editing.name_en || ""}
                      desc={editing.short_description_bn || editing.long_description_bn || editing.description_bn || editing.short_description_en || ""}
                      tags={editing.tags ?? []} path={`/services/${editing.slug || "…"}`}
                      title={editing.seo_title} description={editing.seo_description} keywords={editing.seo_keywords}
                      onChange={(v) => setEditing(prev => prev ? { ...prev, ...v } : prev)} />
                    <div>
                      <label className="form-label text-xs">SEO Title <span className="text-gray-400 font-normal">(defaults to service name)</span></label>
                      <input value={editing.seo_title ?? ""} onChange={f("seo_title")} placeholder="Custom SEO title..." className="input w-full text-sm" />
                    </div>
                    <div>
                      <label className="form-label text-xs">SEO Description <span className="text-gray-400 font-normal">(max 160 chars)</span></label>
                      <textarea value={editing.seo_description ?? ""} onChange={f("seo_description")} rows={2} maxLength={160} placeholder="Meta description..." className="input w-full resize-none text-sm" />
                    </div>
                    <div>
                      <label className="form-label text-xs">Keywords <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                      <input value={editing.seo_keywords ?? ""} onChange={f("seo_keywords")} placeholder="printing, web design, sylhet..." className="input w-full text-sm" />
                    </div>
                    <div>
                      <label className="form-label text-xs">Canonical URL <span className="text-gray-400 font-normal">(leave blank for default)</span></label>
                      <input value={editing.canonical_url ?? ""} onChange={f("canonical_url")} placeholder="https://..." className="input w-full text-sm" />
                    </div>
                    <div>
                      <label className="form-label text-xs">OG Image <span className="text-gray-400 font-normal">(defaults to featured image)</span></label>
                      <ImageUpload
                        value={editing.og_image ?? ""}
                        onChange={(url) => setEditing(prev => prev ? { ...prev, og_image: url } : prev)}
                        folder="abo-enterprise/services"
                        previewSize="sm"
                        purpose="og-image"
                      />
                    </div>
                  </div>
                )}
              </section>
                </AdvancedSection>
                </>) },
              ]} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 flex-wrap px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
              <button onClick={closeEditor} className="btn btn-outline btn-sm">{tx("Cancel")}</button>
              <button onClick={() => handleSave(false)} disabled={saving} className="btn btn-outline btn-sm gap-1.5">
                {t("খসড়া হিসেবে সেভ", "Save as draft")}
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} className="btn btn-primary btn-sm gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {!isNew && editing.is_active ? t("সেভ করুন", "Save") : t("সেভ ও প্রকাশ", "Save & publish")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AiPhotoStartModal open={aiOpen} onClose={() => setAiOpen(false)} kind="service" folder="abo-enterprise/services"
        onDraft={(d) => { setAiOpen(false); openNew(); setEditing((prev) => ({ ...(prev ?? EMPTY_SERVICE), featured_image_url: d.image_url, name_bn: d.name_bn, name_en: d.name_en, slug: slugify(d.name_en), description_bn: d.description_bn, description_en: d.description_en, is_active: false })); }} />

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel={tx("Delete")}
        variant="danger"
        onConfirm={() => confirmState?.action()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

function ServiceThumb({ src, small }: { src?: string | null; small?: boolean }) {
  const box = small ? "w-10 h-10" : "w-16 h-16";
  if (!src) return <div className={`${box} rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0`}><Briefcase className="w-4 h-4 text-gray-400" /></div>;
   
  return <img src={src} alt="" className={`${box} rounded-lg object-cover border border-gray-100 dark:border-white/10 flex-shrink-0`} />;
}
