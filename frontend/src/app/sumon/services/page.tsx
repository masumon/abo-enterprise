"use client";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";

import { useEffect, useState, useCallback } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  Loader2, Briefcase, Plus, Pencil, Trash2, X,
  ToggleLeft, ToggleRight, Star, StarOff, Check, Ban, ChevronDown, ChevronUp, Languages,
} from "lucide-react";
import { servicesAdminApi, categoriesApi, adminBlogApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import ImageUpload from "@/components/admin/ImageUpload";
import TranslateButton from "@/components/admin/TranslateButton";
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
  { value: "", label: "Auto (recommended)" },
  { value: "book", label: "Book Now" },
  { value: "order", label: "Order Now" },
  { value: "quote", label: "Request Quote" },
  { value: "contact", label: "Contact Us" },
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

function slugify(t: string) {
  return t.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

// ── Bilingual content helpers ────────────────────────────────────────────────
// The extended list blocks (benefits/requirements/documents/process/faq) are
// stored as arrays of objects on the service. They're edited with the friendly
// row-based JsonListEditor, so these just wrap/unwrap the JSON string it uses —
// no raw text/pipe encoding for the admin, and the stored shape is unchanged.
const arrToJson = (items: unknown[] | undefined): string => JSON.stringify(items ?? []);
function jsonToArr<T = Record<string, unknown>>(json: string): T[] {
  try { const v = JSON.parse(json); return Array.isArray(v) ? (v as T[]) : []; } catch { return []; }
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState<null | "basic" | "extended">(null);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await servicesAdminApi.list({ page, per_page: 20 });
      setServices((r.data.data ?? []) as Service[]);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

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

  const autoTranslateBasic = async () => {
    if (!editing || translating) return;
    setTranslating("basic");
    try {
      const e = editing;
      const [name, shortD, desc, longD] = await Promise.all([
        !e.name_bn?.trim() && e.name_en?.trim() ? translateOne(e.name_en) : Promise.resolve(""),
        !e.short_description_bn?.trim() && e.short_description_en?.trim() ? translateOne(e.short_description_en) : Promise.resolve(""),
        !e.description_bn?.trim() && e.description_en?.trim() ? translateOne(e.description_en) : Promise.resolve(""),
        !e.long_description_bn?.trim() && e.long_description_en?.trim() ? translateOne(e.long_description_en) : Promise.resolve(""),
      ]);
      setEditing((prev) => prev ? {
        ...prev,
        name_bn: name || prev.name_bn,
        short_description_bn: shortD || prev.short_description_bn,
        description_bn: desc || prev.description_bn,
        long_description_bn: longD || prev.long_description_bn,
      } : prev);
      toast("success", "বাংলা অনুবাদ পূরণ হয়েছে — সেভ করার আগে দেখে নিন");
    } catch {
      toast("error", "অনুবাদ ব্যর্থ — আবার চেষ্টা করুন");
    } finally {
      setTranslating(null);
    }
  };

  const autoTranslateExtended = async () => {
    if (!editing || translating) return;
    setTranslating("extended");
    try {
      const e = editing;
      // Process steps — fill title_bn/description_bn where empty.
      const steps = await Promise.all((e.process_steps ?? []).map(async (s) => ({
        ...s,
        title_bn: s.title_bn?.trim() ? s.title_bn : await translateOne(s.title ?? ""),
        description_bn: s.description_bn?.trim() ? s.description_bn : await translateOne(s.description ?? ""),
      })));
      // Benefits/requirements/documents — items {en,bn} (or legacy strings).
      const fillList = (items: (string | { en?: string; bn?: string })[] | undefined) =>
        Promise.all((items ?? []).map(async (it) => {
          const en = typeof it === "string" ? it : (it.en ?? "");
          const bn = typeof it === "string" ? "" : (it.bn ?? "");
          return { en, bn: bn.trim() ? bn : await translateOne(en) };
        }));
      const [benefits, requirements, documents] = await Promise.all([
        fillList(e.benefits), fillList(e.requirements), fillList(e.required_documents),
      ]);
      // FAQ — fill question_bn/answer_bn where empty.
      const faq = await Promise.all((e.faq ?? []).map(async (f) => ({
        ...f,
        question_bn: f.question_bn?.trim() ? f.question_bn : await translateOne(f.question ?? ""),
        answer_bn: f.answer_bn?.trim() ? f.answer_bn : await translateOne(f.answer ?? ""),
      })));
      setEditing((prev) => prev ? { ...prev, process_steps: steps, benefits, requirements, required_documents: documents, faq } : prev);
      toast("success", "কন্টেন্ট বাংলায় অনুবাদ হয়েছে — সেভ করার আগে দেখে নিন");
    } catch {
      toast("error", "অনুবাদ ব্যর্থ — আবার চেষ্টা করুন");
    } finally {
      setTranslating(null);
    }
  };

  const closeEditor = () => { setEditing(null); setIsNew(false); };

  const handleNameChange = (v: string) => {
    setEditing(prev => {
      if (!prev) return prev;
      const updates: Partial<Service> = { name_en: v };
      if (isNew || !prev.slug) updates.slug = slugify(v);
      return { ...prev, ...updates };
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    // Bangla-first: fill empty English name/descriptions from Bangla siblings
    // before validation, so the admin never types English by hand.
    let ed = editing;
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
    if (!ed.name_en?.trim()) { setSaving(false); toast("error", "Name (EN) is required (বাংলা লিখলে অটো-অনুবাদ হবে)"); return; }
    if (!ed.slug?.trim()) { setSaving(false); toast("error", "Slug is required"); return; }
    if (!ed.category_id && !ed.category) { setSaving(false); toast("error", "Category is required"); return; }
    if (!ed.pricing_type) { setSaving(false); toast("error", "Pricing type is required"); return; }
    if (ed.min_price != null && ed.max_price != null && ed.min_price > ed.max_price) {
      setSaving(false); toast("error", "Minimum price cannot be greater than maximum price"); return;
    }
    if (ed.base_price != null && ed.base_price < 0) { setSaving(false); toast("error", "Base price cannot be negative"); return; }

    try {
      if (isNew) {
        await servicesAdminApi.create(ed);
        toast("success", "Service created");
      } else {
        await servicesAdminApi.update(ed.id!, ed);
        toast("success", "Service updated");
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
          toast("success", "Service deleted");
          await load();
        } catch (e) {
          toast("error", apiErrorMessage(e, "Failed to delete service"));
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
      toast("success", `${selected.size} service(s) ${label}`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "Bulk update failed"));
    } finally {
      setBulkLoading(false);
    }
  };

  const confirmBulkUpdate = (patch: Partial<Service>, verb: string, pastTenseLabel: string, question: string) => {
    const count = selected.size;
    setConfirmState({
      title: question,
      message: `This will ${verb} ${count} service${count === 1 ? "" : "s"}, which changes what customers see on the live site.`,
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
          toast("success", `${count} service(s) deleted`);
          setSelected(new Set());
          await load();
        } catch (e) {
          toast("error", apiErrorMessage(e, "Bulk delete failed"));
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

  const handleSaveTier = async () => {
    if (!editing?.id) return;
    if (!newTier.tier_name?.trim()) { toast("error", "Tier name is required"); return; }
    if (!newTier.price && newTier.price !== 0) { toast("error", "Price is required"); return; }
    if (newTier.price < 0) { toast("error", "Price cannot be negative"); return; }

    setSavingTier(true);
    try {
      const r = editingTierId
        ? await servicesAdminApi.updateTier(editing.id, editingTierId, newTier)
        : await servicesAdminApi.createTier(editing.id, newTier);
      const saved = r.data.data as ServicePricingTier;
      setEditing(prev => prev ? {
        ...prev,
        pricing_tiers: editingTierId
          ? (prev.pricing_tiers ?? []).map(t => (t.id === editingTierId ? saved : t))
          : [...(prev.pricing_tiers ?? []), saved],
      } : prev);
      closeTierEditor();
      toast("success", editingTierId ? "Tier updated" : "Tier added");
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
          toast("success", "Tier removed");
        } catch {
          toast("error", "Failed to remove tier");
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

  const handleSaveField = async () => {
    if (!editing?.id) return;
    if (!newField.field_name?.trim()) { toast("error", "Field name is required"); return; }
    if (!newField.field_label_en?.trim()) { toast("error", "Label (EN) is required"); return; }
    if (condition.field && !condition.value.trim()) {
      toast("error", "Enter the value the condition compares against"); return;
    }

    // Strip empty rule keys so a cleared input doesn't persist as undefined.
    const rules = Object.fromEntries(
      Object.entries(newField.validation_rules ?? {}).filter(([, v]) => v !== undefined && v !== "")
    );
    const payload = {
      ...newField,
      // Label (BN) is NOT NULL on the model — fall back to the EN label so a
      // field saved without a translation doesn't 500.
      field_label_bn: newField.field_label_bn?.trim() || newField.field_label_en,
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
      toast("success", editingFieldId ? "Field updated" : "Field added");
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
          toast("success", "Field removed");
        } catch {
          toast("error", "Failed to remove field");
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

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="Services"
        titleBn="সেবা"
        description={`${total} total services`}
        actions={
          <button onClick={openNew} className="btn btn-primary btn-sm gap-1.5">
            <Plus className="w-4 h-4" /> New Service
          </button>
        }
      />

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-brand-800">{selected.size} selected</span>
          <button onClick={() => confirmBulkUpdate({ is_active: true }, "activate", "activated", "Activate selected services?")} disabled={bulkLoading} className="btn btn-outline btn-sm gap-1">
            <Check className="w-3.5 h-3.5" /> Activate
          </button>
          <button onClick={() => confirmBulkUpdate({ is_active: false }, "deactivate", "deactivated", "Deactivate selected services?")} disabled={bulkLoading} className="btn btn-outline btn-sm gap-1">
            <Ban className="w-3.5 h-3.5" /> Deactivate
          </button>
          <button onClick={() => confirmBulkUpdate({ is_featured: true }, "feature", "featured", "Feature selected services?")} disabled={bulkLoading} className="btn btn-outline btn-sm gap-1">
            <Star className="w-3.5 h-3.5" /> Feature
          </button>
          <button onClick={() => confirmBulkUpdate({ is_featured: false }, "unfeature", "unfeatured", "Unfeature selected services?")} disabled={bulkLoading} className="btn btn-outline btn-sm gap-1">
            <StarOff className="w-3.5 h-3.5" /> Unfeature
          </button>
          <button onClick={handleBulkDelete} disabled={bulkLoading} className="btn btn-outline btn-sm gap-1 text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          {bulkLoading && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
          <button onClick={() => setSelected(new Set())} className="btn btn-ghost btn-sm ml-auto">
            Clear
          </button>
        </div>
      )}

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No services found</p>
            <button onClick={openNew} className="btn btn-primary btn-sm mt-4 gap-1.5">
              <Plus className="w-4 h-4" /> Create first service
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="table-premium min-w-[480px]">
            <thead>
              <tr>
                <th className="w-10 px-3">
                  <input
                    type="checkbox"
                    aria-label="Select all services on this page"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th>Service</th>
                <th className="hidden sm:table-cell">Category</th>
                <th className="hidden md:table-cell">Pricing</th>
                <th className="hidden md:table-cell">Tiers</th>
                <th className="hidden sm:table-cell">Featured</th>
                <th>Active</th>
                <th className="text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${s.name_en}`}
                      checked={!!s.id && selected.has(s.id)}
                      onChange={() => s.id && toggleSelected(s.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{s.name_en}</p>
                    <p className="text-xs text-gray-400">{s.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">{CATEGORY_LABELS[s.category ?? ""] ?? (s.category ?? "").replace(/_/g, " ")}</td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <p className="text-gray-600 capitalize text-sm">{s.pricing_type}</p>
                    {s.base_price != null && <p className="text-xs text-gray-400">{formatPrice(s.base_price)}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-sm hidden md:table-cell">{s.pricing_tiers?.length ?? 0}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    {s.is_featured
                      ? <Star className="w-4 h-4 text-amber-400" />
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(s)}
                      disabled={togglingId === s.id}
                      className="text-gray-400 hover:text-brand-600 transition-colors disabled:opacity-40"
                    >
                      {togglingId === s.id
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : s.is_active
                          ? <ToggleRight className="w-6 h-6 text-green-500" />
                          : <ToggleLeft className="w-6 h-6" />
                      }
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        aria-label={`Edit ${s.name_en}`}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        aria-label={`Delete ${s.name_en}`}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
          <button disabled={services.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {/* Create / Edit panel */}
      {editing !== null && (
        <div
          className="fixed inset-0 z-50 flex"
          style={ADMIN_MODAL_BACKDROP_STYLE}
          role="dialog"
          aria-modal="true"
          aria-label={isNew ? "Create service" : "Edit service"}
        >
          <div ref={editorRef} className="ml-auto w-full max-w-2xl h-full flex flex-col bg-white shadow-2xl animate-slide-in-right overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">{isNew ? "New Service" : "Edit Service"}</h2>
              <button onClick={closeEditor} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Live website preview — the real ServiceCard with current values */}
              <LivePreview>
                <div className="p-1 pointer-events-none">
                  <ServiceCard service={editing as Service} lang="bn" />
                </div>
              </LivePreview>

              {/* ── Basic ───────────────────────────────── */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Basic Info</h3>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={!!editing.is_active}
                        onChange={e => setEditing(prev => prev ? { ...prev, is_active: e.target.checked } : prev)} />
                      <div className={`w-10 h-6 rounded-full transition-colors ${editing.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editing.is_active ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={!!editing.is_featured}
                        onChange={e => setEditing(prev => prev ? { ...prev, is_featured: e.target.checked } : prev)} />
                      <div className={`w-10 h-6 rounded-full transition-colors ${editing.is_featured ? "bg-amber-400" : "bg-gray-300"}`} />
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editing.is_featured ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-gray-700">Featured</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none" title="Also let customers buy/order this service like a product">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={!!editing.is_orderable}
                        onChange={e => setEditing(prev => prev ? { ...prev, is_orderable: e.target.checked ? true : null } : prev)} />
                      <div className={`w-10 h-6 rounded-full transition-colors ${editing.is_orderable ? "bg-brand-500" : "bg-gray-300"}`} />
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editing.is_orderable ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-gray-700">Also orderable</span>
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
                    <span className="text-sm text-gray-700">Bookable</span>
                  </label>
                </div>

                {/* Linked blog posts — many-to-many. Ticking a blog features
                    this service in that article; the link shows in the blog
                    editor too. */}
                <div>
                  <label className="form-label">
                    Blog
                    {(editing.blog_ids?.length ?? 0) > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-600 text-white text-[10px] font-bold align-middle">
                        {editing.blog_ids?.length}
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Tick the blog posts to feature this service in.</p>
                  <LinkChecklist
                    options={blogOptions}
                    selected={editing.blog_ids ?? []}
                    loading={blogOptionsLoading || linkedBlogsLoading}
                    emptyText="No blog posts"
                    searchPlaceholder="Search blog posts…"
                    onToggle={(id) => setEditing(prev => {
                      if (!prev) return prev;
                      const cur = prev.blog_ids ?? [];
                      return { ...prev, blog_ids: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
                    })}
                  />
                </div>

                <div>
                  <label className="form-label flex items-center justify-between gap-2">
                    <span>Name (English) <span className="text-red-400">*</span></span>
                    <TranslateButton bn={editing.name_bn} onResult={(en) => handleNameChange(en)} />
                  </label>
                  <input value={editing.name_en ?? ""} onChange={e => handleNameChange(e.target.value)} placeholder="Service name" className="input w-full" />
                </div>
                <div>
                  <label className="form-label">Name (বাংলা)</label>
                  <input value={editing.name_bn ?? ""} onChange={f("name_bn")} placeholder="সার্ভিসের নাম" className="input w-full" dir="auto" />
                </div>
                <div>
                  <label className="form-label">Slug <span className="text-red-400">*</span></label>
                  <input value={editing.slug ?? ""} onChange={f("slug")} placeholder="url-friendly-slug" className="input w-full font-mono text-sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* One classification. The taxonomy is authoritative; the
                      legacy `category` string is derived from the chosen node
                      server-side, so both always agree. The free-text select
                      below only appears when the taxonomy is unreachable. */}
                  {taxonomy.length > 0 ? (
                    <div>
                      <label className="form-label">
                        Category <span className="text-red-400">*</span>{" "}
                        <span className="text-gray-400 font-normal text-xs">(any depth)</span>
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
                        <option value="">— Select —</option>
                        {treeOptions.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="form-label">Category <span className="text-red-400">*</span></label>
                      <select value={editing.category ?? ""} onChange={f("category")} className="input w-full text-sm">
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="form-label">Sort Order</label>
                    <input type="number" value={editing.sort_order ?? 0} onChange={fNum("sort_order")} className="input w-full" />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageUpload
                    label="Icon"
                    value={editing.icon_url ?? ""}
                    onChange={(url) => setEditing(prev => prev ? { ...prev, icon_url: url } : prev)}
                    folder="abo-enterprise/services"
                    previewSize="sm"
                  />
                  <ImageUpload
                    label="Featured Image"
                    value={editing.featured_image_url ?? ""}
                    onChange={(url) => setEditing(prev => prev ? { ...prev, featured_image_url: url } : prev)}
                    folder="abo-enterprise/services"
                  />
                </div>
              </section>

              {/* ── Descriptions ────────────────────────── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descriptions</h3>
                  <button
                    type="button"
                    onClick={autoTranslateBasic}
                    disabled={translating !== null}
                    className="btn btn-outline btn-sm gap-1.5"
                    title="নাম ও বিবরণের খালি বাংলা ঘরগুলো English থেকে অটো-পূরণ করবে"
                  >
                    {translating === "basic" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                    বাংলা অনুবাদ
                  </button>
                </div>
                <div>
                  <label className="form-label flex items-center justify-between gap-2">
                    <span>Short Description (EN)</span>
                    <TranslateButton bn={editing.short_description_bn} onResult={(en) => setEditing(prev => prev ? { ...prev, short_description_en: en } : prev)} />
                  </label>
                  <textarea value={editing.short_description_en ?? ""} onChange={f("short_description_en")} rows={2} placeholder="One-line summary…" className="input w-full resize-none text-sm" />
                </div>
                <div>
                  <label className="form-label flex items-center justify-between gap-2">
                    <span>Full Description (EN)</span>
                    <TranslateButton bn={editing.description_bn} onResult={(en) => setEditing(prev => prev ? { ...prev, description_en: en } : prev)} />
                  </label>
                  <textarea value={editing.description_en ?? ""} onChange={f("description_en")} rows={4} placeholder="Detailed description…" className="input w-full resize-y text-sm" />
                </div>
                <div>
                  <label className="form-label">Short Description (বাংলা)</label>
                  <textarea value={editing.short_description_bn ?? ""} onChange={f("short_description_bn")} rows={2} placeholder="সংক্ষিপ্ত বিবরণ…" className="input w-full resize-none text-sm" dir="auto" />
                </div>
                <div>
                  <label className="form-label">Full Description (বাংলা)</label>
                  <textarea value={editing.description_bn ?? ""} onChange={f("description_bn")} rows={4} placeholder="বিস্তারিত বিবরণ…" className="input w-full resize-y text-sm" dir="auto" />
                </div>
                <div>
                  <label className="form-label flex items-center justify-between gap-2">
                    <span>Long Description (EN) <span className="text-gray-400 font-normal text-xs">(optional — detail page body)</span></span>
                    <TranslateButton bn={editing.long_description_bn} onResult={(en) => setEditing(prev => prev ? { ...prev, long_description_en: en } : prev)} />
                  </label>
                  <textarea value={editing.long_description_en ?? ""} onChange={f("long_description_en")} rows={5} placeholder="In-depth service write-up shown on the service detail page…" className="input w-full resize-y text-sm" />
                </div>
                <div>
                  <label className="form-label">Long Description (বাংলা) <span className="text-gray-400 font-normal text-xs">(ঐচ্ছিক)</span></label>
                  <textarea value={editing.long_description_bn ?? ""} onChange={f("long_description_bn")} rows={5} placeholder="সার্ভিস পেজের বিস্তারিত লেখা…" className="input w-full resize-y text-sm" dir="auto" />
                </div>
                <div>
                  <label className="form-label">Tags <span className="text-gray-400 font-normal text-xs">(comma-separated — search &amp; related services)</span></label>
                  <input
                    value={editing.tags?.join(", ") ?? ""}
                    onChange={(e) => setEditing((prev) => prev ? { ...prev, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) } : prev)}
                    placeholder="printing, business card, design…"
                    className="input w-full text-sm"
                  />
                </div>
              </section>

              {/* ── Extended Details ────────────────────── */}
              <section className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExtOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Extended Details</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${extOpen ? "rotate-180" : ""}`} />
                </button>
                {extOpen && (
                  <div className="px-4 py-4 space-y-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <p className="text-[11px] text-brand-600 bg-brand-50 dark:bg-brand-500/10 rounded-lg px-3 py-2 flex-1 min-w-[12rem]">
                        বাইলিঙ্গুয়াল: প্রতিটি লাইনে <b>English | বাংলা</b> — বাংলা অংশ ঐচ্ছিক। বাংলা দিলে সাইটে ভাষা টগলে বাংলা দেখাবে, না দিলে ইংরেজি থাকবে।
                      </p>
                      <button
                        type="button"
                        onClick={autoTranslateExtended}
                        disabled={translating !== null}
                        className="btn btn-outline btn-sm gap-1.5 flex-shrink-0"
                        title="খালি বাংলা ঘরগুলো English থেকে অটো-পূরণ করবে (আগের লেখা মুছবে না)"
                      >
                        {translating === "extended" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                        বাংলা অনুবাদ
                      </button>
                    </div>

                    {/* Process Steps — friendly row editor (was pipe-encoded) */}
                    <div>
                      <label className="form-label">Process Steps <span className="text-gray-400 font-normal text-xs">(ধাপে ধাপে কীভাবে কাজ হয়)</span></label>
                      <JsonListEditor
                        value={arrToJson(editing.process_steps)}
                        onChange={(json) => setEditing(prev => prev ? { ...prev, process_steps: jsonToArr(json) } : prev)}
                        fields={[
                          { path: "step", label: "Step #", labelBn: "ধাপ নং", type: "number" },
                          { path: "title", label: "Title (EN)", labelBn: "শিরোনাম (EN)", translateFrom: "title_bn" },
                          { path: "title_bn", label: "Title (বাংলা)", labelBn: "শিরোনাম (বাংলা)" },
                          { path: "description", label: "Description (EN)", labelBn: "বিবরণ (EN)", type: "textarea", translateFrom: "description_bn" },
                          { path: "description_bn", label: "Description (বাংলা)", labelBn: "বিবরণ (বাংলা)", type: "textarea" },
                        ]}
                        newItem={() => ({ step: (editing.process_steps?.length ?? 0) + 1, title: "", description: "", title_bn: "", description_bn: "" })}
                      />
                    </div>

                    {/* Benefits — friendly row editor (EN + বাংলা) */}
                    <div>
                      <label className="form-label">Benefits <span className="text-gray-400 font-normal text-xs">(সুবিধা)</span></label>
                      <JsonListEditor
                        value={arrToJson(editing.benefits)}
                        onChange={(json) => setEditing(prev => prev ? { ...prev, benefits: jsonToArr(json) } : prev)}
                        fields={[
                          { path: "en", label: "Benefit (EN)", labelBn: "সুবিধা (EN)", translateFrom: "bn" },
                          { path: "bn", label: "Benefit (বাংলা)", labelBn: "সুবিধা (বাংলা)" },
                        ]}
                        newItem={() => ({ en: "", bn: "" })}
                      />
                    </div>

                    {/* Requirements */}
                    <div>
                      <label className="form-label">Requirements <span className="text-gray-400 font-normal text-xs">(প্রয়োজনীয় শর্ত)</span></label>
                      <JsonListEditor
                        value={arrToJson(editing.requirements)}
                        onChange={(json) => setEditing(prev => prev ? { ...prev, requirements: jsonToArr(json) } : prev)}
                        fields={[
                          { path: "en", label: "Requirement (EN)", labelBn: "শর্ত (EN)", translateFrom: "bn" },
                          { path: "bn", label: "Requirement (বাংলা)", labelBn: "শর্ত (বাংলা)" },
                        ]}
                        newItem={() => ({ en: "", bn: "" })}
                      />
                    </div>

                    {/* Required Documents */}
                    <div>
                      <label className="form-label">Required Documents <span className="text-gray-400 font-normal text-xs">(প্রয়োজনীয় কাগজপত্র)</span></label>
                      <JsonListEditor
                        value={arrToJson(editing.required_documents)}
                        onChange={(json) => setEditing(prev => prev ? { ...prev, required_documents: jsonToArr(json) } : prev)}
                        fields={[
                          { path: "en", label: "Document (EN)", labelBn: "কাগজ (EN)", translateFrom: "bn" },
                          { path: "bn", label: "Document (বাংলা)", labelBn: "কাগজ (বাংলা)" },
                        ]}
                        newItem={() => ({ en: "", bn: "" })}
                      />
                    </div>

                    {/* FAQ — friendly row editor (was q|a|q_bn|a_bn) */}
                    <div>
                      <label className="form-label">FAQ <span className="text-gray-400 font-normal text-xs">(প্রশ্ন-উত্তর)</span></label>
                      <JsonListEditor
                        value={arrToJson(editing.faq)}
                        onChange={(json) => setEditing(prev => prev ? { ...prev, faq: jsonToArr(json) } : prev)}
                        fields={[
                          { path: "question", label: "Question (EN)", labelBn: "প্রশ্ন (EN)", translateFrom: "question_bn" },
                          { path: "question_bn", label: "Question (বাংলা)", labelBn: "প্রশ্ন (বাংলা)" },
                          { path: "answer", label: "Answer (EN)", labelBn: "উত্তর (EN)", type: "textarea", translateFrom: "answer_bn" },
                          { path: "answer_bn", label: "Answer (বাংলা)", labelBn: "উত্তর (বাংলা)", type: "textarea" },
                        ]}
                        newItem={() => ({ question: "", answer: "", question_bn: "", answer_bn: "" })}
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* ── Pricing ─────────────────────────────── */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pricing</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Pricing Type <span className="text-red-400">*</span></label>
                    <select value={editing.pricing_type ?? "fixed"} onChange={f("pricing_type")} className="input w-full text-sm">
                      {PRICING_TYPES.map(pt => <option key={pt} value={pt} className="capitalize">{pt}</option>)}
                    </select>
                  </div>
                  {/* GAP-15 — where the service is completed. Left blank, the
                      public pages say nothing, which is the pre-0008 behaviour. */}
                  <div>
                    <label className="form-label">Fulfilment</label>
                    <select
                      value={editing.fulfilment ?? ""}
                      onChange={(e) => setEditing(prev => prev ? { ...prev, fulfilment: (e.target.value || null) as ServiceFulfilment } : prev)}
                      className="input w-full text-sm"
                    >
                      <option value="">Unspecified (say nothing)</option>
                      <option value="remote">Remote — no visit needed</option>
                      <option value="at_shop">At shop — customer must come in</option>
                      <option value="hybrid">Hybrid — starts online, finishes at shop</option>
                    </select>
                  </div>
                  {/* Screen 08c — published turnaround, in working days. Leave
                      both blank and the public pages say nothing about time. */}
                  <div>
                    <label className="form-label">Turnaround (working days)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={1} max={365}
                        value={editing.turnaround_days_min ?? ""}
                        onChange={fNum("turnaround_days_min")}
                        placeholder="min" className="input w-full"
                      />
                      <span className="text-gray-400">–</span>
                      <input
                        type="number" min={1} max={365}
                        value={editing.turnaround_days_max ?? ""}
                        onChange={fNum("turnaround_days_max")}
                        placeholder="max" className="input w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Lead Priority (1-10)</label>
                    <input type="number" min={1} max={10} value={editing.lead_priority ?? 5} onChange={fNum("lead_priority")} className="input w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Base Price (BDT)</label>
                    <input type="number" value={editing.base_price ?? ""} onChange={fNum("base_price")} placeholder="0" className="input w-full" />
                  </div>
                  <div>
                    <label className="form-label">Hourly Rate (BDT)</label>
                    <input type="number" value={editing.hourly_rate ?? ""} onChange={fNum("hourly_rate")} placeholder="0" className="input w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Min Price (BDT)</label>
                    <input type="number" value={editing.min_price ?? ""} onChange={fNum("min_price")} placeholder="0" className="input w-full" />
                  </div>
                  <div>
                    <label className="form-label">Max Price (BDT)</label>
                    <input type="number" value={editing.max_price ?? ""} onChange={fNum("max_price")} placeholder="0" className="input w-full" />
                  </div>
                  <div>
                    <label className="form-label">Delivery Charge (৳)</label>
                    <input type="number" value={editing.delivery_charge ?? ""} onChange={fNum("delivery_charge")} placeholder="0" className="input w-full" />
                  </div>
                  <div>
                    <label className="form-label">Consultancy Fee (৳) — advance</label>
                    <input type="number" value={editing.consultancy_fee ?? ""} onChange={fNum("consultancy_fee")} placeholder="0" className="input w-full" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!editing.requires_advance} onChange={e => setEditing(prev => prev ? { ...prev, requires_advance: e.target.checked } : prev)} className="rounded" />
                  Requires advance / consultancy fee (booking confirmed after payment)
                </label>
              </section>

              {/* ── Scheduling (optional) ───────────────── */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Appointment Scheduling</h3>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editing.scheduling_enabled}
                    onChange={e => setEditing(prev => prev ? { ...prev, scheduling_enabled: e.target.checked } : prev)}
                    className="rounded"
                  />
                  Take appointments for this service
                </label>
                <p className="text-xs text-gray-400 -mt-2">
                  Off (default) keeps the current behaviour: customers pick a preferred date with no
                  time slots and no availability checks.
                </p>

                {editing.scheduling_enabled && (
                  <div className="space-y-4 border border-gray-100 rounded-xl p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="form-label text-[11px]">Slot Length (min)</label>
                        <input type="number" min={5} value={editing.slot_duration_minutes ?? 60}
                          onChange={fNum("slot_duration_minutes")} className="input w-full text-sm" />
                      </div>
                      <div>
                        <label className="form-label text-[11px]">Capacity / Slot</label>
                        <input type="number" min={1} value={editing.slot_capacity ?? 1}
                          onChange={fNum("slot_capacity")} className="input w-full text-sm" />
                      </div>
                      <div>
                        <label className="form-label text-[11px]">Min Notice (hrs)</label>
                        <input type="number" min={0} value={editing.min_notice_hours ?? 0}
                          onChange={fNum("min_notice_hours")} className="input w-full text-sm" />
                      </div>
                      <div>
                        <label className="form-label text-[11px]">Book Ahead (days)</label>
                        <input type="number" min={1} value={editing.booking_horizon_days ?? 60}
                          onChange={fNum("booking_horizon_days")} className="input w-full text-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="form-label text-[11px]">Working Hours</label>
                      <p className="text-[11px] text-gray-400 mb-2">
                        Leave a day blank to close it. Multiple ranges: 09:00-13:00, 14:00-18:00
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
                      <label className="form-label text-[11px]">Holidays (one date per line, YYYY-MM-DD)</label>
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
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Call-To-Action Button</h3>
                <p className="text-xs text-gray-400 -mt-2">
                  Controls the button shown on the public service page. &quot;Auto&quot; infers it:
                  custom-quote pricing → Request Quote, orderable → Order Now, otherwise Book Now.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">CTA Type</label>
                    <select
                      value={editing.cta_type ?? ""}
                      onChange={(e) => setEditing(prev => prev ? { ...prev, cta_type: e.target.value || null } : prev)}
                      className="input w-full text-sm"
                    >
                      {CTA_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Custom Label (EN)</label>
                    <input
                      value={editing.cta_label_en ?? ""}
                      onChange={(e) => setEditing(prev => prev ? { ...prev, cta_label_en: e.target.value || null } : prev)}
                      placeholder="e.g. Get Started"
                      className="input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="form-label">Custom Label (বাংলা)</label>
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
              />

              {/* ── SEO ─────────────────────────────────── */}
              <section>
                <button type="button" onClick={() => setSeoOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl text-left">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">SEO Settings</span>
                  {seoOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {seoOpen && (
                  <div className="mt-2 space-y-3 px-1">
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
                      />
                    </div>
                  </div>
                )}
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
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
              <button onClick={closeEditor} className="btn btn-outline btn-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {isNew ? "Create Service" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => confirmState?.action()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
