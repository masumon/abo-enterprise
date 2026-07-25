"use client";

import { useEffect, useState, useCallback } from "react";
import AdminTitle from "@/components/admin/AdminTitle";
import {
  Loader2, Briefcase, Plus, Pencil, Trash2, X,
  ToggleLeft, ToggleRight, Star, ChevronDown, ChevronUp,
} from "lucide-react";
import { servicesAdminApi, categoriesApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import ImageUpload from "@/components/admin/ImageUpload";
import LivePreview from "@/components/admin/LivePreview";
import ServiceCard from "@/components/services/ServiceCard";
import type { Service, ServicePricingTier, ServiceBookingFormField, Category } from "@/types";
import { formatPrice } from "@/lib/utils";
import { useToastStore } from "@/store/toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useFocusTrap } from "@/lib/useFocusTrap";

// Business-aligned service categories shown first; legacy values are retained
// so existing services keep displaying (and remain editable) without any data
// migration. Values are the stored slugs; labels are what admins see.
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

/** show_if operators the booking engine understands (core/booking_form.py). */
const CONDITION_OPS: { value: string; label: string }[] = [
  { value: "equals", label: "is exactly" },
  { value: "not_equals", label: "is not" },
  { value: "in", label: "is one of" },
];

type ShowIf = { field?: string; equals?: unknown; not_equals?: unknown; in?: unknown[] };

/** Read a field's conditional_logic into the editor's flat shape. */
function readCondition(field: Partial<ServiceBookingFormField>): { field: string; op: string; value: string } {
  const showIf = (field.conditional_logic as { show_if?: ShowIf } | null)?.show_if;
  if (!showIf?.field) return { field: "", op: "equals", value: "" };
  const op = CONDITION_OPS.find((o) => o.value in showIf)?.value ?? "equals";
  const raw = (showIf as Record<string, unknown>)[op];
  return { field: showIf.field, op, value: Array.isArray(raw) ? raw.join(", ") : String(raw ?? "") };
}

/** Build conditional_logic from the editor's flat shape (null = always shown). */
function writeCondition(c: { field: string; op: string; value: string }): Record<string, unknown> | null {
  if (!c.field) return null;
  const value =
    c.op === "in"
      ? c.value.split(",").map((v) => v.trim()).filter(Boolean)
      : c.value.trim();
  return { show_if: { field: c.field, [c.op]: value } };
}

function slugify(t: string) {
  return t.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
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

  const openNew = () => { setEditing({ ...EMPTY_SERVICE }); setIsNew(true); setTierFormOpen(false); setNewTier(EMPTY_TIER); setSeoOpen(false); setExtOpen(false); setFieldFormOpen(false); setNewField(EMPTY_FIELD); };

  const openEdit = async (s: Service) => {
    try {
      const r = await servicesAdminApi.get(s.id);
      setEditing(r.data.data as Service);
    } catch {
      setEditing({ ...s });
    }
    setIsNew(false);
    setTierFormOpen(false);
    setNewTier(EMPTY_TIER);
    setSeoOpen(false);
    setExtOpen(false);
    setFieldFormOpen(false);
    setNewField(EMPTY_FIELD);
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
    if (!editing.name_en?.trim()) { toast("error", "Name (EN) is required"); return; }
    if (!editing.slug?.trim()) { toast("error", "Slug is required"); return; }
    if (!editing.category) { toast("error", "Category is required"); return; }
    if (!editing.pricing_type) { toast("error", "Pricing type is required"); return; }
    if (editing.min_price != null && editing.max_price != null && editing.min_price > editing.max_price) {
      toast("error", "Minimum price cannot be greater than maximum price"); return;
    }
    if (editing.base_price != null && editing.base_price < 0) { toast("error", "Base price cannot be negative"); return; }

    setSaving(true);
    try {
      if (isNew) {
        await servicesAdminApi.create(editing);
        toast("success", "Service created");
      } else {
        await servicesAdminApi.update(editing.id!, editing);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <AdminTitle en="Services" bn="সেবা" />
          <p className="text-gray-500 text-sm mt-1">{total} total services</p>
        </div>
        <button onClick={openNew} className="btn btn-primary btn-sm gap-1.5">
          <Plus className="w-4 h-4" /> New Service
        </button>
      </div>

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
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
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

                <div>
                  <label className="form-label">Name (English) <span className="text-red-400">*</span></label>
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
                  <div>
                    <label className="form-label">Category <span className="text-red-400">*</span></label>
                    <select value={editing.category ?? ""} onChange={f("category")} className="input w-full text-sm">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Sort Order</label>
                    <input type="number" value={editing.sort_order ?? 0} onChange={fNum("sort_order")} className="input w-full" />
                  </div>
                </div>

                {taxonomy.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">
                        ক্যাটালগ গাছের অবস্থান <span className="text-gray-400 font-normal">(যেকোনো গভীরতা)</span>
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
                        <option value="">— None —</option>
                        {treeOptions.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </div>
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
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descriptions</h3>
                <div>
                  <label className="form-label">Short Description (EN)</label>
                  <textarea value={editing.short_description_en ?? ""} onChange={f("short_description_en")} rows={2} placeholder="One-line summary…" className="input w-full resize-none text-sm" />
                </div>
                <div>
                  <label className="form-label">Full Description (EN)</label>
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
                  <label className="form-label">Long Description (EN) <span className="text-gray-400 font-normal text-xs">(optional — detail page body)</span></label>
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
                    {/* Process Steps */}
                    <div>
                      <label className="form-label">Process Steps (JSON lines: step|title|description)</label>
                      <textarea
                        rows={4}
                        className="input w-full resize-y text-sm font-mono"
                        placeholder={"1|Discovery|We analyze your requirements\n2|Design|We create a solution plan"}
                        value={(editing.process_steps ?? []).map((s: { step: number; title: string; description: string }) => `${s.step}|${s.title}|${s.description}`).join("\n")}
                        onChange={e => {
                          const steps = e.target.value.split("\n").filter(Boolean).map(line => {
                            const [step, title, ...rest] = line.split("|");
                            return { step: Number(step) || 1, title: title ?? "", description: rest.join("|") ?? "" };
                          });
                          setEditing(prev => prev ? { ...prev, process_steps: steps } : prev);
                        }}
                      />
                      <p className="text-[11px] text-gray-400 mt-1">One step per line: number|title|description</p>
                    </div>

                    {/* Benefits */}
                    <div>
                      <label className="form-label">Benefits (one per line)</label>
                      <textarea
                        rows={4}
                        className="input w-full resize-y text-sm"
                        placeholder={"Fast delivery\n24/7 support\nMoney-back guarantee"}
                        value={(editing.benefits ?? []).join("\n")}
                        onChange={e => setEditing(prev => prev ? { ...prev, benefits: e.target.value.split("\n").filter(Boolean) } : prev)}
                      />
                    </div>

                    {/* Requirements */}
                    <div>
                      <label className="form-label">Requirements (one per line)</label>
                      <textarea
                        rows={3}
                        className="input w-full resize-y text-sm"
                        placeholder={"Active internet connection\nValid email address"}
                        value={(editing.requirements ?? []).join("\n")}
                        onChange={e => setEditing(prev => prev ? { ...prev, requirements: e.target.value.split("\n").filter(Boolean) } : prev)}
                      />
                    </div>

                    {/* Required Documents */}
                    <div>
                      <label className="form-label">Required Documents (one per line)</label>
                      <textarea
                        rows={3}
                        className="input w-full resize-y text-sm"
                        placeholder={"National ID\nTrade License"}
                        value={(editing.required_documents ?? []).join("\n")}
                        onChange={e => setEditing(prev => prev ? { ...prev, required_documents: e.target.value.split("\n").filter(Boolean) } : prev)}
                      />
                    </div>

                    {/* FAQ */}
                    <div>
                      <label className="form-label">FAQ (JSON lines: question|answer)</label>
                      <textarea
                        rows={4}
                        className="input w-full resize-y text-sm font-mono"
                        placeholder={"How long does it take?|Usually 3-5 business days\nDo you offer refunds?|Yes, within 7 days"}
                        value={(editing.faq ?? []).map((f: { question: string; answer: string }) => `${f.question}|${f.answer}`).join("\n")}
                        onChange={e => {
                          const faq = e.target.value.split("\n").filter(Boolean).map(line => {
                            const [question, ...rest] = line.split("|");
                            return { question: question ?? "", answer: rest.join("|") ?? "" };
                          });
                          setEditing(prev => prev ? { ...prev, faq } : prev);
                        }}
                      />
                      <p className="text-[11px] text-gray-400 mt-1">One FAQ per line: question|answer</p>
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
              {!isNew && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Booking Form Fields ({editing.booking_forms?.length ?? 0})
                    </h3>
                    <button
                      onClick={() => (fieldFormOpen ? closeFieldEditor() : openFieldEditor())}
                      className="btn btn-outline btn-sm gap-1 text-xs"
                    >
                      {fieldFormOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {fieldFormOpen ? "Cancel" : "Add Field"}
                    </button>
                  </div>

                  {/* Existing fields — shown in the order the customer sees. */}
                  {[...(editing.booking_forms ?? [])]
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map(field => {
                    const cond = readCondition(field);
                    return (
                    <div key={field.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {field.field_label_en}
                          {field.is_active === false && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400 border border-gray-300 rounded px-1">
                              hidden
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-mono">{field.field_name}</span>
                          {" · "}
                          <span className="capitalize">{field.field_type}</span>
                          {" · #"}{field.sort_order ?? 0}
                          {field.is_required && <span className="text-red-400 ml-1">*required</span>}
                        </p>
                        {cond.field && (
                          <p className="text-[11px] text-brand-600 mt-0.5">
                            Shown only if <span className="font-mono">{cond.field}</span>{" "}
                            {CONDITION_OPS.find(o => o.value === cond.op)?.label} “{cond.value}”
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => openFieldEditor(field)}
                        aria-label={`Edit ${field.field_label_en}`}
                        className="p-1 text-gray-400 hover:text-brand-600 flex-shrink-0 rounded transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        disabled={deletingFieldId === field.id}
                        aria-label={`Delete ${field.field_label_en}`}
                        className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0 rounded transition-colors"
                      >
                        {deletingFieldId === field.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                    );
                  })}

                  {/* New field form */}
                  {fieldFormOpen && (
                    <div className="border border-brand-100 rounded-xl p-4 space-y-3 bg-brand-50/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="form-label text-[11px]">Field Name (machine) <span className="text-red-400">*</span></label>
                          <input
                            value={newField.field_name ?? ""}
                            onChange={e => setNewField(p => ({ ...p, field_name: e.target.value.replace(/\s+/g, "_").toLowerCase() }))}
                            placeholder="e.g. business_name"
                            className="input w-full text-sm font-mono"
                          />
                        </div>
                        <div>
                          <label className="form-label text-[11px]">Field Type <span className="text-red-400">*</span></label>
                          <select
                            value={newField.field_type ?? "text"}
                            onChange={e => setNewField(p => ({ ...p, field_type: e.target.value }))}
                            className="input w-full text-sm"
                          >
                            {/* Only types supported end-to-end (public renderer + server validator) */}
                            {["text", "textarea", "number", "email", "phone", "url", "date", "select", "multiselect", "radio", "checkbox"].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="form-label text-[11px]">Label (EN) <span className="text-red-400">*</span></label>
                          <input
                            value={newField.field_label_en ?? ""}
                            onChange={e => setNewField(p => ({ ...p, field_label_en: e.target.value }))}
                            placeholder="e.g. Business Name"
                            className="input w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="form-label text-[11px]">Label (বাংলা)</label>
                          <input
                            value={newField.field_label_bn ?? ""}
                            onChange={e => setNewField(p => ({ ...p, field_label_bn: e.target.value }))}
                            placeholder="ব্যবসার নাম"
                            className="input w-full text-sm"
                            dir="auto"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="form-label text-[11px]">Placeholder</label>
                          <input
                            value={newField.placeholder ?? ""}
                            onChange={e => setNewField(p => ({ ...p, placeholder: e.target.value }))}
                            className="input w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="form-label text-[11px]">Default Value</label>
                          <input
                            value={newField.default_value ?? ""}
                            onChange={e => setNewField(p => ({ ...p, default_value: e.target.value }))}
                            className="input w-full text-sm"
                          />
                        </div>
                      </div>
                      {["select", "multiselect", "radio"].includes(newField.field_type ?? "") && (
                        <div>
                          <label className="form-label text-[11px]">Options (one per line)</label>
                          <textarea
                            rows={3}
                            value={(newField.options ?? []).join("\n")}
                            onChange={e => setNewField(p => ({ ...p, options: e.target.value.split("\n").filter(Boolean) }))}
                            placeholder={"Option 1\nOption 2\nOption 3"}
                            className="input w-full text-sm resize-none font-mono"
                          />
                        </div>
                      )}
                      {/* Validation rules — enforced server-side on every booking */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="form-label text-[11px]">Min Length</label>
                          <input
                            type="number"
                            min={0}
                            value={(newField.validation_rules?.min_length as number | undefined) ?? ""}
                            onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), min_length: e.target.value ? Number(e.target.value) : undefined } }))}
                            className="input w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="form-label text-[11px]">Max Length</label>
                          <input
                            type="number"
                            min={0}
                            value={(newField.validation_rules?.max_length as number | undefined) ?? ""}
                            onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), max_length: e.target.value ? Number(e.target.value) : undefined } }))}
                            className="input w-full text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="form-label text-[11px]">Pattern (regex) <span className="text-gray-400 font-normal">e.g. ^\d{"{"}10{"}"}$ for NID</span></label>
                          <input
                            value={(newField.validation_rules?.pattern as string | undefined) ?? ""}
                            onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), pattern: e.target.value || undefined } }))}
                            placeholder="^[0-9]{10,17}$"
                            className="input w-full text-sm font-mono"
                          />
                        </div>
                      </div>
                      {(newField.validation_rules?.pattern as string | undefined) && (
                        <div>
                          <label className="form-label text-[11px]">Pattern Error Message</label>
                          <input
                            value={(newField.validation_rules?.pattern_message as string | undefined) ?? ""}
                            onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), pattern_message: e.target.value || undefined } }))}
                            placeholder="e.g. Enter a valid 10-17 digit NID number"
                            className="input w-full text-sm"
                          />
                        </div>
                      )}
                      {/* Numeric bounds — enforced server-side for number/integer fields */}
                      {["number", "integer"].includes(newField.field_type ?? "") && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="form-label text-[11px]">Min Value</label>
                            <input
                              type="number"
                              value={(newField.validation_rules?.min as number | undefined) ?? ""}
                              onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), min: e.target.value ? Number(e.target.value) : undefined } }))}
                              className="input w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="form-label text-[11px]">Max Value</label>
                            <input
                              type="number"
                              value={(newField.validation_rules?.max as number | undefined) ?? ""}
                              onChange={e => setNewField(p => ({ ...p, validation_rules: { ...(p.validation_rules ?? {}), max: e.target.value ? Number(e.target.value) : undefined } }))}
                              className="input w-full text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Conditional visibility — the booking form and the server
                          both honour this rule (core/booking_form.py show_if). */}
                      <div className="border-t border-brand-100 pt-3">
                        <label className="form-label text-[11px]">Conditional Visibility</label>
                        <p className="text-[11px] text-gray-400 mb-2">
                          Leave the field blank to always show this question.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            value={condition.field}
                            onChange={e => setCondition(c => ({ ...c, field: e.target.value }))}
                            className="input w-full text-sm"
                          >
                            <option value="">— Always show —</option>
                            {(editing.booking_forms ?? [])
                              .filter(f => f.id !== editingFieldId)
                              .map(f => (
                                <option key={f.id} value={f.field_name}>{f.field_label_en}</option>
                              ))}
                          </select>
                          <select
                            value={condition.op}
                            onChange={e => setCondition(c => ({ ...c, op: e.target.value }))}
                            disabled={!condition.field}
                            className="input w-full text-sm"
                          >
                            {CONDITION_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <input
                            value={condition.value}
                            onChange={e => setCondition(c => ({ ...c, value: e.target.value }))}
                            disabled={!condition.field}
                            placeholder={condition.op === "in" ? "value1, value2" : "value"}
                            className="input w-full text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="form-label text-[11px]">Sort Order</label>
                          <input
                            type="number"
                            value={newField.sort_order ?? 0}
                            onChange={e => setNewField(p => ({ ...p, sort_order: Number(e.target.value) }))}
                            className="input w-full text-sm"
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!newField.is_required}
                              onChange={e => setNewField(p => ({ ...p, is_required: e.target.checked }))}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm text-gray-700">Required</span>
                          </label>
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer" title="Uncheck to hide this question from the booking form without deleting it">
                            <input
                              type="checkbox"
                              checked={newField.is_active !== false}
                              onChange={e => setNewField(p => ({ ...p, is_active: e.target.checked }))}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm text-gray-700">Active</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={closeFieldEditor} className="btn btn-outline btn-sm text-xs">Cancel</button>
                        <button onClick={handleSaveField} disabled={savingField} className="btn btn-primary btn-sm text-xs gap-1">
                          {savingField ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          {editingFieldId ? "Save Field" : "Add Field"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}

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
              {!isNew && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Pricing Tiers ({editing.pricing_tiers?.length ?? 0})
                    </h3>
                    <button
                      onClick={() => (tierFormOpen ? closeTierEditor() : openTierEditor())}
                      className="btn btn-outline btn-sm gap-1 text-xs"
                    >
                      {tierFormOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {tierFormOpen ? "Cancel" : "Add Tier"}
                    </button>
                  </div>

                  {/* Existing tiers — shown in the order the customer sees. */}
                  {[...(editing.pricing_tiers ?? [])]
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map(tier => (
                    <div key={tier.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {tier.tier_name}
                          {tier.is_active === false && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400 border border-gray-300 rounded px-1">
                              hidden
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{formatPrice(tier.price)}
                          {tier.duration_days ? ` · ${tier.duration_days} days` : ""}
                          {` · #${tier.sort_order ?? 0}`}
                        </p>
                        {tier.description_en && <p className="text-xs text-gray-400 mt-0.5 truncate">{tier.description_en}</p>}
                      </div>
                      <button
                        onClick={() => openTierEditor(tier)}
                        aria-label={`Edit ${tier.tier_name}`}
                        className="p-1 text-gray-400 hover:text-brand-600 flex-shrink-0 rounded transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTier(tier.id)}
                        disabled={deletingTierId === tier.id}
                        aria-label={`Delete ${tier.tier_name}`}
                        className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0 rounded transition-colors"
                      >
                        {deletingTierId === tier.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}

                  {/* New tier form */}
                  {tierFormOpen && (
                    <div className="border border-brand-100 rounded-xl p-4 space-y-3 bg-brand-50/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="form-label text-[11px]">Tier Name <span className="text-red-400">*</span></label>
                          <input
                            value={newTier.tier_name ?? ""}
                            onChange={e => setNewTier(p => ({ ...p, tier_name: e.target.value }))}
                            placeholder="e.g. Basic, Premium"
                            className="input w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="form-label text-[11px]">Price (BDT) <span className="text-red-400">*</span></label>
                          <input
                            type="number"
                            value={newTier.price ?? ""}
                            onChange={e => setNewTier(p => ({ ...p, price: Number(e.target.value) }))}
                            placeholder="0"
                            className="input w-full text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="form-label text-[11px]">Duration (days)</label>
                          <input
                            type="number"
                            value={newTier.duration_days ?? ""}
                            onChange={e => setNewTier(p => ({ ...p, duration_days: e.target.value ? Number(e.target.value) : undefined }))}
                            placeholder="e.g. 7"
                            className="input w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="form-label text-[11px]">Sort Order</label>
                          <input
                            type="number"
                            value={newTier.sort_order ?? 0}
                            onChange={e => setNewTier(p => ({ ...p, sort_order: Number(e.target.value) }))}
                            className="input w-full text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label text-[11px]">Description (EN)</label>
                        <textarea
                          value={newTier.description_en ?? ""}
                          onChange={e => setNewTier(p => ({ ...p, description_en: e.target.value }))}
                          placeholder="What's included…"
                          rows={2}
                          className="input w-full text-sm resize-none"
                        />
                      </div>
                      <div>
                        <label className="form-label text-[11px]">Description (বাংলা)</label>
                        <textarea
                          value={newTier.description_bn ?? ""}
                          onChange={e => setNewTier(p => ({ ...p, description_bn: e.target.value }))}
                          placeholder="প্যাকেজে যা আছে…"
                          rows={2}
                          className="input w-full text-sm resize-none"
                          dir="auto"
                        />
                      </div>
                      <div>
                        <label className="form-label text-[11px]">Includes <span className="text-gray-400 font-normal">(internal note)</span></label>
                        <input
                          value={newTier.includes ?? ""}
                          onChange={e => setNewTier(p => ({ ...p, includes: e.target.value }))}
                          className="input w-full text-sm"
                        />
                      </div>
                      <div>
                        <label className="form-label text-[11px]">Features (one per line)</label>
                        <textarea
                          value={(newTier.features ?? []).join("\n")}
                          onChange={e => setNewTier(p => ({ ...p, features: e.target.value.split("\n").filter(Boolean) }))}
                          placeholder="Feature 1&#10;Feature 2"
                          rows={3}
                          className="input w-full text-sm resize-none font-mono"
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer" title="Uncheck to hide this package from the service page without deleting it">
                        <input
                          type="checkbox"
                          checked={newTier.is_active !== false}
                          onChange={e => setNewTier(p => ({ ...p, is_active: e.target.checked }))}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                      <div className="flex justify-end gap-2">
                        <button onClick={closeTierEditor} className="btn btn-outline btn-sm text-xs">Cancel</button>
                        <button onClick={handleSaveTier} disabled={savingTier} className="btn btn-primary btn-sm text-xs gap-1">
                          {savingTier ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          {editingTierId ? "Save Tier" : "Add Tier"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
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
