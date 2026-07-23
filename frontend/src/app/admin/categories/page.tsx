"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  FolderTree,
  ImageOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { categoriesAdminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import type { Category, Subcategory } from "@/types";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";
import ImageUpload from "@/components/admin/ImageUpload";
import StatusBadge from "@/components/admin/StatusBadge";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { cn } from "@/lib/utils";

function slugify(v: string): string {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const APPLIES = ["product", "service"] as const;
const PAGE_STEP = 10; // "See more" reveals this many more root categories at a time.

type Node = Category | Subcategory;
type StatusFilter = "all" | "active" | "inactive";

interface EditorState {
  node: Node | null;
  parentId: string | null;
  parentName?: string;
}

interface FormState {
  name_en: string;
  name_bn: string;
  slug: string;
  icon: string;
  image_url: string;
  description_bn: string;
  applies_to: string[];
  is_active: boolean;
  sort_order: number;
  parent_id: string | null;
}

const EMPTY_FORM: FormState = {
  name_en: "",
  name_bn: "",
  slug: "",
  icon: "",
  image_url: "",
  description_bn: "",
  applies_to: ["product"],
  is_active: true,
  sort_order: 0,
  parent_id: null,
};

function getChildren(node: Node): Node[] {
  return (node.subcategories ?? []) as unknown as Node[];
}

function getNodeLabel(node: Node): string {
  return node.name_bn || node.name_en;
}

/** Flat {id,label,depth} list of every node — used for the Parent dropdown. */
function flattenForSelect(nodes: Node[], depth = 0, out: { id: string; label: string; depth: number }[] = []) {
  for (const node of nodes) {
    out.push({ id: node.id, label: getNodeLabel(node), depth });
    flattenForSelect(getChildren(node), depth + 1, out);
  }
  return out;
}

/** IDs of a node and all its descendants — excluded from the Parent dropdown to avoid cycles. */
function selfAndDescendantIds(node: Node, out: Set<string> = new Set()): Set<string> {
  out.add(node.id);
  for (const child of getChildren(node)) selfAndDescendantIds(child, out);
  return out;
}

export default function AdminCategoriesPage() {
  const [roots, setRoots] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const toast = useToastStore((s) => s.push);
  const editorRef = useFocusTrap(editor !== null, () => setEditor(null));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesAdminApi.list();
      setRoots(res.data.data ?? []);
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to load categories"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = (parent: Node | null) => {
    setForm({
      ...EMPTY_FORM,
      applies_to: parent ? [] : ["product"],
      sort_order: parent ? getChildren(parent).length : roots.length,
      parent_id: parent?.id ?? null,
    });
    setEditor({ node: null, parentId: parent?.id ?? null, parentName: parent ? getNodeLabel(parent) : undefined });
  };

  const openEdit = (node: Node) => {
    setForm({
      name_en: node.name_en,
      name_bn: node.name_bn ?? "",
      slug: node.slug,
      icon: node.icon ?? "",
      image_url: node.image_url ?? "",
      description_bn: node.description_bn ?? "",
      applies_to: ((node as Partial<Category>).applies_to ?? []) as string[],
      is_active: node.is_active !== false,
      sort_order: node.sort_order ?? 0,
      parent_id: node.parent_id ?? null,
    });
    setEditor({ node, parentId: node.parent_id ?? null });
  };

  const save = async () => {
    const name = form.name_en.trim();
    if (name.length < 2) {
      toast("error", "Name (English) is required");
      return;
    }
    const slug = form.slug.trim() || slugify(name);
    setBusy(true);
    try {
      const payload: Partial<Category> = {
        name_en: name,
        name_bn: form.name_bn.trim() || undefined,
        slug,
        icon: form.icon.trim() || undefined,
        image_url: form.image_url || undefined,
        description_bn: form.description_bn.trim() || undefined,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };

      if (editor?.node) {
        // Edit — keep the node where it is (no re-parenting, matches prior safe behavior).
        if (!editor.node.parent_id && form.applies_to.length > 0) payload.applies_to = form.applies_to;
        await categoriesAdminApi.update(editor.node.id, payload);
        toast("success", "সংরক্ষিত হয়েছে");
      } else {
        payload.parent_id = form.parent_id ?? null;
        if (!form.parent_id) {
          if (form.applies_to.length === 0) {
            toast("error", "product/service অন্তত একটি বাছুন");
            setBusy(false);
            return;
          }
          payload.applies_to = form.applies_to;
        }
        await categoriesAdminApi.create(payload);
        toast("success", "তৈরি হয়েছে");
      }

      setEditor(null);
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Save failed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (node: Node) => {
    if (!confirm(`"${getNodeLabel(node)}" এবং এর নিচের সব শাখা মুছে যাবে। নিশ্চিত?`)) return;
    try {
      await categoriesAdminApi.delete(node.id);
      toast("success", "মুছে ফেলা হয়েছে");
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Delete failed — এই শাখায় পণ্য/সেবা থাকলে আগে সরান"));
    }
  };

  const normalizedQuery = searchValue.trim().toLowerCase();
  const searchActive = normalizedQuery.length > 0;

  // Recursively keep a node if it (or any descendant) matches search + status.
  const filterTree = useCallback(
    (nodes: Node[]): Node[] => {
      const out: Node[] = [];
      for (const node of nodes) {
        const children = filterTree(getChildren(node));
        const haystack = `${node.name_en} ${node.name_bn ?? ""} ${node.slug}`.toLowerCase();
        const matchesQuery = !searchActive || haystack.includes(normalizedQuery);
        const matchesStatus =
          statusFilter === "all" || (statusFilter === "active" ? node.is_active : !node.is_active);
        if ((matchesQuery && matchesStatus) || children.length > 0) {
          out.push({ ...node, subcategories: children as unknown as Subcategory[] });
        }
      }
      return out;
    },
    [normalizedQuery, searchActive, statusFilter]
  );

  const filteredRoots = useMemo(() => filterTree(roots as unknown as Node[]), [filterTree, roots]);

  // "See more" only applies when browsing (search shows all matches).
  const shownRoots = searchActive ? filteredRoots : filteredRoots.slice(0, visibleCount);
  const hasMore = !searchActive && filteredRoots.length > visibleCount;

  const parentOptions = useMemo(() => {
    const all = flattenForSelect(roots as unknown as Node[]);
    // When editing, prevent picking self/descendants (avoids cycles). Not shown on edit anyway.
    const blocked = editor?.node ? selfAndDescendantIds(editor.node) : new Set<string>();
    return all.filter((o) => !blocked.has(o.id));
  }, [roots, editor]);

  const totalNodes = useMemo(() => flattenForSelect(roots as unknown as Node[]).length, [roots]);

  const renderNode = (node: Node, depth: number): React.ReactNode => {
    const children = getChildren(node);
    const scope = ((node as Partial<Category>).applies_to ?? []) as string[];
    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 transition-colors hover:border-brand-200",
            depth === 0 ? "border-brand-100" : "border-gray-100"
          )}
          style={{ marginLeft: depth > 0 ? `${Math.min(depth, 4) * 18}px` : undefined }}
        >
          {node.image_url ? (
            <span className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 ring-1 ring-gray-100">
              <Image src={node.image_url} alt="" fill className="object-cover" sizes="44px" />
            </span>
          ) : (
            <span className="w-11 h-11 rounded-lg bg-amber-50 text-amber-400 flex items-center justify-center flex-shrink-0 ring-1 ring-amber-100" title="ছবি নেই">
              <ImageOff className="w-4 h-4" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 truncate">{getNodeLabel(node)}</span>
              {depth === 0 ? (
                <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">Root</span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">Sub</span>
              )}
              <StatusBadge status={node.is_active ? "active" : "inactive"} />
            </div>
            <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs text-gray-400">
              <span className="font-mono">/{node.slug}</span>
              {scope.map((s) => (
                <span key={`${node.id}-${s}`} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-medium capitalize text-gray-600">{s}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={() => openCreate(node)} title="সাব-ক্যাটাগরি যোগ" aria-label={`Add child to ${getNodeLabel(node)}`} className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50">
              <Plus className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => openEdit(node)} title="Edit" aria-label={`Edit ${getNodeLabel(node)}`} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50">
              <Pencil className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => void remove(node)} title="Delete" aria-label={`Delete ${getNodeLabel(node)}`} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {children.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title="Categories"
        titleBn="ক্যাটাগরি"
        description={`${totalNodes} categories across ${roots.length} root groups`}
        descriptionBn={`${roots.length}টি root গ্রুপে মোট ${totalNodes}টি ক্যাটাগরি`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void load()} className="btn btn-outline btn-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button type="button" onClick={() => openCreate(null)} className="admin-btn-primary">
              <Plus className="w-4 h-4" /> নতুন ক্যাটাগরি
            </button>
          </div>
        }
      />

      <AdminToolbar
        searchValue={searchValue}
        onSearchChange={(v) => {
          setSearchValue(v);
          setVisibleCount(PAGE_STEP);
        }}
        searchPlaceholder="নাম, বাংলা নাম বা slug দিয়ে খুঁজুন…"
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="admin-input min-w-[140px]"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </AdminToolbar>

      {loading ? (
        <div className="admin-card p-12 flex justify-center">
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      ) : roots.length === 0 ? (
        <div className="admin-card">
          <AdminEmptyState
            icon={FolderTree}
            title="এখনো কোনো ক্যাটাগরি নেই"
            description={'"নতুন ক্যাটাগরি" চাপুন — যেমন Products, Services বা Repair'}
            action={
              <button type="button" onClick={() => openCreate(null)} className="admin-btn-primary">
                <Plus className="w-4 h-4" /> প্রথম ক্যাটাগরি তৈরি করুন
              </button>
            }
          />
        </div>
      ) : filteredRoots.length === 0 ? (
        <div className="admin-card">
          <AdminEmptyState
            icon={FolderTree}
            title="কোনো ফলাফল পাওয়া যায়নি"
            description="Search বা status filter পরিবর্তন করে আবার চেষ্টা করুন।"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {shownRoots.map((root) => (
            <div key={root.id} className="admin-card p-3 sm:p-4">
              {renderNode(root, 0)}
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_STEP)}
                className="btn btn-outline btn-sm"
              >
                <ChevronDown className="w-4 h-4" />
                আরও দেখুন ({filteredRoots.length - visibleCount})
              </button>
            </div>
          )}
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true">
          <div ref={editorRef} className="bg-white dark:bg-[var(--surface-card)] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-heading">
                  {editor.node
                    ? `সম্পাদনা: ${getNodeLabel(editor.node)}`
                    : editor.parentId
                      ? `নতুন সাব-ক্যাটাগরি — ${editor.parentName ?? ""}-এর ভেতরে`
                      : "নতুন ক্যাটাগরি"}
                </h2>
                {editor.node && <p className="text-xs text-gray-400 mt-1 font-mono">/{form.slug}</p>}
              </div>
              <button type="button" onClick={() => setEditor(null)} aria-label="Close" className="p-1.5 text-muted hover:text-heading">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cat-name-en" className="form-label">Name (English) *</label>
                  <input
                    id="cat-name-en"
                    value={form.name_en}
                    onChange={(e) => setForm((prev) => ({ ...prev, name_en: e.target.value, slug: prev.slug || slugify(e.target.value) }))}
                    className="admin-input text-sm"
                    placeholder="Fast Chargers"
                  />
                </div>
                <div>
                  <label htmlFor="cat-name-bn" className="form-label">নাম (বাংলা)</label>
                  <input
                    id="cat-name-bn"
                    value={form.name_bn}
                    onChange={(e) => setForm((prev) => ({ ...prev, name_bn: e.target.value }))}
                    className="admin-input text-sm"
                    placeholder="ফাস্ট চার্জার"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cat-slug" className="form-label">Slug (URL)</label>
                  <input
                    id="cat-slug"
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                    className="admin-input text-sm font-mono"
                    placeholder="auto"
                  />
                </div>
                <div>
                  <label htmlFor="cat-sort-order" className="form-label">Sort Order</label>
                  <input
                    id="cat-sort-order"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))}
                    className="admin-input text-sm"
                  />
                </div>
              </div>

              {/* Parent picker — only when creating (editing keeps the node in place, no re-parenting). */}
              {!editor.node && (
                <div>
                  <label htmlFor="cat-parent" className="form-label">Parent ক্যাটাগরি</label>
                  <select
                    id="cat-parent"
                    value={form.parent_id ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, parent_id: e.target.value || null }))}
                    className="admin-input text-sm"
                  >
                    <option value="">— None (root ক্যাটাগরি) —</option>
                    {parentOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {"— ".repeat(o.depth)}{o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="cat-icon" className="form-label">Icon (ঐচ্ছিক)</label>
                <input
                  id="cat-icon"
                  value={form.icon}
                  onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                  className="admin-input text-sm"
                  placeholder="lucide নাম বা emoji"
                />
              </div>

              <div>
                <label htmlFor="cat-desc-bn" className="form-label">বর্ণনা (ঐচ্ছিক)</label>
                <textarea
                  id="cat-desc-bn"
                  value={form.description_bn}
                  rows={2}
                  onChange={(e) => setForm((prev) => ({ ...prev, description_bn: e.target.value }))}
                  className="admin-input text-sm resize-none"
                />
              </div>

              <div>
                <span className="form-label block">ছবি (কার্ড/ব্যানারে দেখাবে)</span>
                <ImageUpload value={form.image_url} onChange={(url) => setForm((prev) => ({ ...prev, image_url: url }))} />
              </div>

              {/* Scope only applies to root categories (children inherit it). */}
              {!form.parent_id && (
                <fieldset>
                  <legend className="form-label">কোন ধরনের ক্যাটাগরি?</legend>
                  <div className="flex gap-4 mt-1">
                    {APPLIES.map((scope) => (
                      <label key={scope} className="inline-flex items-center gap-1.5 cursor-pointer text-sm capitalize">
                        <input
                          type="checkbox"
                          checked={form.applies_to.includes(scope)}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            applies_to: e.target.checked
                              ? [...prev.applies_to, scope]
                              : prev.applies_to.filter((value) => value !== scope),
                          }))}
                          className="w-4 h-4 text-brand-600 rounded"
                        />
                        {scope === "product" ? "Product (কেনাকাটা)" : "Service (বুকিং)"}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-brand-600 rounded"
                />
                সক্রিয় (সাইটে দেখাবে)
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => void save()} disabled={busy} className="admin-btn-primary flex-1">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editor.node ? "সংরক্ষণ" : "তৈরি করুন"}
              </button>
              <button type="button" onClick={() => setEditor(null)} className="btn btn-outline btn-md">বাতিল</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
