"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, FolderTree, Plus, Save, Trash2, ChevronRight, CornerDownRight } from "lucide-react";
import { categoriesAdminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import type { Category, Subcategory } from "@/types";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

function slugify(v: string): string {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const APPLIES = ["product", "service"] as const;

// Icon names the public services page can render (see ServicesPageClient
// CATEGORY_ICONS); anything else falls back to a generic gear icon.
const ICON_OPTIONS = [
  "", "FileText", "Printer", "Globe", "Smartphone", "Headphones",
  "Megaphone", "Briefcase", "Bot", "Cog", "Wrench", "Monitor", "Code2",
] as const;

/**
 * Unified taxonomy manager — Category → Subcategory. Shared by products and
 * services. Backed by the /categories admin API; the existing string category
 * columns remain untouched, so nothing here can break current listings.
 */
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name_en: "", name_bn: "", applies_to: ["product"] as string[] });
  const toast = useToastStore((s) => s.push);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesAdminApi.list();
      setCategories(res.data.data ?? []);
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to load categories"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const createCategory = async () => {
    const name = draft.name_en.trim();
    if (name.length < 2) {
      toast("error", "Category name is required");
      return;
    }
    if (draft.applies_to.length === 0) {
      toast("error", "Select at least one type (product/service)");
      return;
    }
    setCreating(true);
    try {
      await categoriesAdminApi.create({
        slug: slugify(name),
        name_en: name,
        name_bn: draft.name_bn.trim() || undefined,
        applies_to: draft.applies_to,
      });
      toast("success", "Category created");
      setDraft({ name_en: "", name_bn: "", applies_to: ["product"] });
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Create failed"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title="Categories"
        titleBn="ক্যাটাগরি ম্যানেজার"
        description={`${categories.length} categor${categories.length === 1 ? "y" : "ies"} — shared taxonomy for products & services`}
      />

      {/* Create */}
      <div className="admin-card p-4 sm:p-5">
        <p className="text-sm font-semibold text-heading mb-3">Add Category</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            value={draft.name_en}
            onChange={(e) => setDraft((d) => ({ ...d, name_en: e.target.value }))}
            className="admin-input text-sm"
            placeholder="Name (English)"
          />
          <input
            value={draft.name_bn}
            onChange={(e) => setDraft((d) => ({ ...d, name_bn: e.target.value }))}
            className="admin-input text-sm"
            placeholder="নাম (বাংলা)"
          />
          <div className="flex items-center gap-3 px-1">
            {APPLIES.map((a) => (
              <label key={a} className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-muted capitalize">
                <input
                  type="checkbox"
                  checked={draft.applies_to.includes(a)}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      applies_to: e.target.checked
                        ? [...d.applies_to, a]
                        : d.applies_to.filter((x) => x !== a),
                    }))
                  }
                  className="w-4 h-4 accent-brand-600"
                />
                {a}
              </label>
            ))}
          </div>
          <button onClick={createCategory} disabled={creating} className="btn btn-brand btn-sm gap-1.5">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>
        {draft.name_en.trim() && (
          <p className="text-[11px] text-muted mt-2">Slug: <span className="font-mono">{slugify(draft.name_en) || "—"}</span></p>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="admin-card p-12 flex justify-center">
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="admin-card p-4">
          <AdminEmptyState
            icon={FolderTree}
            title="No categories yet"
            description="Add a category above. Existing product/service categories are backfilled automatically on deploy."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ category, onChanged }: { category: Category; onChanged: () => void }) {
  const toast = useToastStore((s) => s.push);
  const [form, setForm] = useState({
    name_en: category.name_en,
    name_bn: category.name_bn ?? "",
    slug: category.slug,
    sort_order: category.sort_order,
    is_active: category.is_active,
    applies_to: category.applies_to ?? [],
    icon: category.icon ?? "",
    description_en: category.description_en ?? "",
    description_bn: category.description_bn ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [newSub, setNewSub] = useState("");
  const [newSubBn, setNewSubBn] = useState("");
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await categoriesAdminApi.update(category.id, {
        name_en: form.name_en.trim(),
        name_bn: form.name_bn.trim() || undefined,
        slug: slugify(form.slug || form.name_en),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        applies_to: form.applies_to,
        icon: form.icon || null,
        description_en: form.description_en.trim() || null,
        description_bn: form.description_bn.trim() || null,
      });
      toast("success", "Category saved");
      onChanged();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete category "${category.name_en}" and its subcategories?`)) return;
    try {
      await categoriesAdminApi.delete(category.id);
      toast("success", "Category deleted");
      onChanged();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Delete failed"));
    }
  };

  const addSub = async () => {
    const name = newSub.trim();
    if (name.length < 2) return;
    try {
      await categoriesAdminApi.createSub({
        category_id: category.id,
        slug: slugify(name),
        name_en: name,
        name_bn: newSubBn.trim() || undefined,
      });
      setNewSub("");
      setNewSubBn("");
      toast("success", "Subcategory added");
      onChanged();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Add failed"));
    }
  };

  return (
    <div className="admin-card p-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        <div className="lg:col-span-3">
          <input
            value={form.name_en}
            onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
            className="admin-input text-sm w-full font-medium"
            placeholder="Name (EN)"
          />
        </div>
        <div className="lg:col-span-2">
          <input
            value={form.name_bn}
            onChange={(e) => setForm((f) => ({ ...f, name_bn: e.target.value }))}
            className="admin-input text-sm w-full"
            placeholder="নাম (BN)"
          />
        </div>
        <div className="lg:col-span-2">
          <input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="admin-input text-sm w-full font-mono"
            placeholder="slug"
          />
        </div>
        <div className="lg:col-span-2 flex items-center gap-2">
          {APPLIES.map((a) => (
            <label key={a} className="inline-flex items-center gap-1 cursor-pointer text-[11px] text-muted capitalize">
              <input
                type="checkbox"
                checked={form.applies_to.includes(a)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    applies_to: e.target.checked
                      ? [...f.applies_to, a]
                      : f.applies_to.filter((x) => x !== a),
                  }))
                }
                className="w-3.5 h-3.5 accent-brand-600"
              />
              {a}
            </label>
          ))}
        </div>
        <div className="lg:col-span-1">
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
            className="admin-input text-sm w-full"
            title="Sort order"
          />
        </div>
        <div className="lg:col-span-2 flex items-center justify-end gap-2">
          <label className="inline-flex items-center gap-1 cursor-pointer text-[11px] text-muted">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 accent-brand-600"
            />
            Active
          </label>
          <button onClick={save} disabled={saving} className="btn btn-brand btn-sm gap-1" aria-label="Save category">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
          <button onClick={remove} className="text-gray-400 hover:text-red-500 p-1.5" aria-label="Delete category">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Icon & descriptions — shown on the public category pages */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
        <button
          onClick={() => setDetailsOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? "rotate-90" : ""}`} />
          Icon &amp; Description
        </button>
        {detailsOpen && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-muted block mb-1">Icon (public card)</label>
              <select
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                className="admin-input text-sm w-full"
              >
                {ICON_OPTIONS.map((i) => (
                  <option key={i} value={i}>{i || "Default (gear)"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1">Description (EN)</label>
              <textarea
                rows={2}
                value={form.description_en}
                onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
                className="admin-input text-sm w-full resize-none"
                placeholder="Shown as the category page subtitle"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1">বিবরণ (বাংলা)</label>
              <textarea
                rows={2}
                value={form.description_bn}
                onChange={(e) => setForm((f) => ({ ...f, description_bn: e.target.value }))}
                className="admin-input text-sm w-full resize-none"
                placeholder="ক্যাটাগরি পেজের সাবটাইটেল"
                dir="auto"
              />
            </div>
          </div>
        )}
      </div>

      {/* Subcategories */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          Subcategories ({category.subcategories?.length ?? 0})
        </button>

        {open && (
          <div className="mt-2 ml-4 space-y-1.5">
            {(category.subcategories ?? []).map((sub) => (
              <SubcategoryRow key={sub.id} sub={sub} onChanged={onChanged} />
            ))}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <CornerDownRight className="w-3.5 h-3.5 text-gray-400" />
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSub()}
                className="admin-input text-sm flex-1 max-w-xs"
                placeholder="New subcategory (EN)"
              />
              <input
                value={newSubBn}
                onChange={(e) => setNewSubBn(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSub()}
                className="admin-input text-sm flex-1 max-w-xs"
                placeholder="নাম (বাংলা, ঐচ্ছিক)"
                dir="auto"
              />
              <button onClick={addSub} className="admin-btn-secondary gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubcategoryRow({ sub, onChanged }: { sub: Subcategory; onChanged: () => void }) {
  const toast = useToastStore((s) => s.push);
  const [name, setName] = useState(sub.name_en);
  const [nameBn, setNameBn] = useState(sub.name_bn ?? "");
  // Slug is edited explicitly — renaming a subcategory must NOT silently
  // change its public /services/{cat}/{sub} URL.
  const [slug, setSlug] = useState(sub.slug);
  const [active, setActive] = useState(sub.is_active);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await categoriesAdminApi.updateSub(sub.id, {
        name_en: name.trim(),
        name_bn: nameBn.trim() || null,
        slug: slugify(slug || name),
        is_active: active,
      });
      toast("success", "Subcategory saved");
      onChanged();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Save failed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete subcategory "${sub.name_en}"?`)) return;
    try {
      await categoriesAdminApi.deleteSub(sub.id);
      toast("success", "Subcategory deleted");
      onChanged();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Delete failed"));
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <CornerDownRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="admin-input text-sm flex-1 max-w-[11rem]"
        placeholder="Name (EN)"
      />
      <input
        value={nameBn}
        onChange={(e) => setNameBn(e.target.value)}
        className="admin-input text-sm flex-1 max-w-[11rem]"
        placeholder="নাম (বাংলা)"
        dir="auto"
      />
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="admin-input text-sm flex-1 max-w-[10rem] font-mono"
        placeholder="slug"
        title="Public URL segment — changing this changes the page address"
      />
      <label className="inline-flex items-center gap-1 cursor-pointer text-[11px] text-muted">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-3.5 h-3.5 accent-brand-600" />
        Active
      </label>
      <button onClick={save} disabled={busy} className="text-brand-600 hover:text-brand-700 p-1" aria-label="Save subcategory">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      </button>
      <button onClick={remove} className="text-gray-400 hover:text-red-500 p-1" aria-label="Delete subcategory">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
