"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, Plus, Trash2, ChevronRight, ChevronDown, Pencil,
  ArrowUp, ArrowDown, ImageOff, X, Save, FolderTree,
} from "lucide-react";
import Image from "next/image";
import { categoriesAdminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import type { Category, Subcategory } from "@/types";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import ImageUpload from "@/components/admin/ImageUpload";
import { cn } from "@/lib/utils";

function slugify(v: string): string {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const APPLIES = ["product", "service"] as const;

type Node = Subcategory; // unified tree node (Category is structurally compatible)

interface EditorState {
  /** null = creating; otherwise the node being edited */
  node: Node | null;
  /** parent for a new node (null = new root/vertical) */
  parentId: string | null;
  parentName?: string;
}

/**
 * File-manager style taxonomy tree editor — unlimited depth. Every node can
 * hold an image (shown as a thumbnail; ⚠ badge when missing), children are
 * created in place, and ↑/↓ reorders siblings. New verticals (roots) are
 * created with the same form, choosing product/service.
 */
export default function AdminCategoriesPage() {
  const [roots, setRoots] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name_en: "", name_bn: "", slug: "", icon: "", image_url: "",
    description_bn: "", applies_to: ["product"] as string[], is_active: true,
  });
  const toast = useToastStore((s) => s.push);

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

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openCreate = (parent: Node | null) => {
    setForm({
      name_en: "", name_bn: "", slug: "", icon: "", image_url: "",
      description_bn: "", applies_to: parent ? [] : ["product"], is_active: true,
    });
    setEditor({ node: null, parentId: parent?.id ?? null, parentName: parent?.name_bn || parent?.name_en });
  };

  const openEdit = (node: Node) => {
    setForm({
      name_en: node.name_en, name_bn: node.name_bn ?? "", slug: node.slug,
      icon: node.icon ?? "", image_url: node.image_url ?? "",
      description_bn: node.description_bn ?? "",
      applies_to: ((node as unknown as Category).applies_to ?? []) as string[],
      is_active: node.is_active !== false,
    });
    setEditor({ node, parentId: node.parent_id ?? null });
  };

  const save = async () => {
    const name = form.name_en.trim();
    if (name.length < 2) { toast("error", "Name (English) is required"); return; }
    const slug = form.slug.trim() || slugify(name);
    setBusy(true);
    try {
      const payload: Partial<Category> = {
        name_en: name,
        name_bn: form.name_bn.trim() || undefined,
        slug,
        icon: form.icon || undefined,
        image_url: form.image_url || undefined,
        description_bn: form.description_bn.trim() || undefined,
        is_active: form.is_active,
      };
      if (editor?.node) {
        if (form.applies_to.length > 0) payload.applies_to = form.applies_to;
        await categoriesAdminApi.update(editor.node.id, payload);
        toast("success", "সংরক্ষিত হয়েছে");
      } else {
        payload.parent_id = editor?.parentId ?? null;
        if (!editor?.parentId) {
          if (form.applies_to.length === 0) { toast("error", "product/service অন্তত একটি বাছুন"); setBusy(false); return; }
          payload.applies_to = form.applies_to;
        }
        await categoriesAdminApi.create(payload);
        toast("success", "তৈরি হয়েছে");
        if (editor?.parentId) setExpanded((p) => new Set(p).add(editor.parentId!));
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
    if (!confirm(`"${node.name_bn || node.name_en}" এবং এর নিচের সব শাখা মুছে যাবে। নিশ্চিত?`)) return;
    try {
      await categoriesAdminApi.delete(node.id);
      toast("success", "মুছে ফেলা হয়েছে");
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Delete failed — এই শাখায় পণ্য/সেবা থাকলে আগে সরান"));
    }
  };

  const reorder = async (siblings: Node[], index: number, dir: -1 | 1) => {
    const target = siblings[index + dir];
    if (!target) return;
    const a = siblings[index];
    try {
      await Promise.all([
        categoriesAdminApi.update(a.id, { sort_order: index + dir }),
        categoriesAdminApi.update(target.id, { sort_order: index }),
      ]);
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Reorder failed"));
    }
  };

  const renderNode = (node: Node, depth: number, siblings: Node[], index: number) => {
    const children = (node.subcategories ?? []) as Node[];
    const isOpen = expanded.has(node.id);
    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 group",
            node.is_active === false && "opacity-50"
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          <button
            type="button"
            onClick={() => toggle(node.id)}
            className={cn("w-5 h-5 flex items-center justify-center text-muted", children.length === 0 && "invisible")}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Thumbnail / missing-image badge */}
          {node.image_url ? (
            <span className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              <Image src={node.image_url} alt="" fill className="object-cover" sizes="32px" />
            </span>
          ) : (
            <span
              className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center flex-shrink-0"
              title="ছবি নেই — Edit-এ গিয়ে ছবি দিন"
            >
              <ImageOff className="w-4 h-4" />
            </span>
          )}

          <button type="button" onClick={() => openEdit(node)} className="min-w-0 text-left flex-1">
            <span className="text-sm font-medium text-heading truncate block">
              {node.name_bn || node.name_en}
              {node.is_active === false && <span className="ml-2 text-[10px] text-amber-600">(off)</span>}
            </span>
            <span className="text-[11px] text-muted truncate block">
              /{node.slug}
              {children.length > 0 && ` · ${children.length}`}
            </span>
          </button>

          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => reorder(siblings, index, -1)} disabled={index === 0}
              className="p-1.5 text-muted hover:text-heading disabled:opacity-30" aria-label="Move up">
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => reorder(siblings, index, 1)} disabled={index === siblings.length - 1}
              className="p-1.5 text-muted hover:text-heading disabled:opacity-30" aria-label="Move down">
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => openCreate(node)}
              className="p-1.5 text-brand-600 hover:text-brand-700" aria-label="Add child" title="নতুন শাখা">
              <Plus className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => openEdit(node)}
              className="p-1.5 text-muted hover:text-heading" aria-label="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => remove(node)}
              className="p-1.5 text-gray-400 hover:text-red-500" aria-label="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {isOpen && children.map((c, i) => renderNode(c, depth + 1, children, i))}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title="Catalog Tree"
        titleBn="ক্যাটালগ গাছ"
        description="Unlimited nested taxonomy — verticals, categories & sub-branches shared by products and services"
      />

      <div className="admin-card p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 px-2">
          <p className="text-sm font-semibold text-heading">
            {roots.length} vertical{roots.length === 1 ? "" : "s"}
          </p>
          <button type="button" onClick={() => openCreate(null)} className="admin-btn-primary !py-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> নতুন Vertical
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
        ) : roots.length === 0 ? (
          <AdminEmptyState
            icon={FolderTree}
            title="এখনো কোনো শাখা নেই"
            description={'"নতুন Vertical" চাপুন — যেমন Products, Services বা রিপেয়ার'}
          />
        ) : (
          <div>{(roots as unknown as Node[]).map((r, i) => renderNode(r, 0, roots as unknown as Node[], i))}</div>
        )}
      </div>

      {/* Editor sheet */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-[var(--surface-card)] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-heading">
                {editor.node
                  ? `সম্পাদনা: ${editor.node.name_bn || editor.node.name_en}`
                  : editor.parentId
                    ? `নতুন শাখা — ${editor.parentName ?? ""}-এর ভেতরে`
                    : "নতুন Vertical"}
              </h2>
              <button type="button" onClick={() => setEditor(null)} aria-label="Close" className="p-1.5 text-muted hover:text-heading">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cat-name-en" className="form-label">Name (English) *</label>
                  <input id="cat-name-en" value={form.name_en}
                    onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                    className="admin-input text-sm" placeholder="Fast Chargers" />
                </div>
                <div>
                  <label htmlFor="cat-name-bn" className="form-label">নাম (বাংলা)</label>
                  <input id="cat-name-bn" value={form.name_bn}
                    onChange={(e) => setForm((f) => ({ ...f, name_bn: e.target.value }))}
                    className="admin-input text-sm" placeholder="ফাস্ট চার্জার" />
                </div>
              </div>
              <div>
                <label htmlFor="cat-slug" className="form-label">Slug (URL)</label>
                <input id="cat-slug" value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                  className="admin-input text-sm font-mono" placeholder="auto" />
              </div>
              <div>
                <label htmlFor="cat-desc-bn" className="form-label">বর্ণনা (ঐচ্ছিক)</label>
                <textarea id="cat-desc-bn" value={form.description_bn} rows={2}
                  onChange={(e) => setForm((f) => ({ ...f, description_bn: e.target.value }))}
                  className="admin-input text-sm resize-none" />
              </div>
              <div>
                <span className="form-label block">ছবি (কার্ড/ব্যানারে দেখাবে)</span>
                <ImageUpload value={form.image_url} onChange={(url) => setForm((f) => ({ ...f, image_url: url }))} />
              </div>
              {!editor.parentId && !editor.node?.parent_id && (
                <fieldset>
                  <legend className="form-label">কোন ধরনের Vertical?</legend>
                  <div className="flex gap-4 mt-1">
                    {APPLIES.map((a) => (
                      <label key={a} className="inline-flex items-center gap-1.5 cursor-pointer text-sm capitalize">
                        <input type="checkbox" checked={form.applies_to.includes(a)}
                          onChange={(e) => setForm((f) => ({
                            ...f,
                            applies_to: e.target.checked ? [...f.applies_to, a] : f.applies_to.filter((x) => x !== a),
                          }))}
                          className="w-4 h-4 text-brand-600 rounded" />
                        {a === "product" ? "Product (কেনাকাটা)" : "Service (বুকিং)"}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 text-brand-600 rounded" />
                সক্রিয় (সাইটে দেখাবে)
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={save} disabled={busy} className="admin-btn-primary flex-1">
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
