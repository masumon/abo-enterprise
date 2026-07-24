"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { categoriesAdminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import type { Category, Subcategory } from "@/types";
import ImageUpload from "@/components/admin/ImageUpload";
import LivePreview from "@/components/admin/LivePreview";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { cn } from "@/lib/utils";

function slugify(v: string): string {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const APPLIES = ["product", "service"] as const;
const PAGE_STEP = 10;

/** Accent palette — one per root vertical (cycles). Keeps each group visually distinct. */
const ACCENTS = [
  { rail: "#1565c0", from: "#1565c0", to: "#0d47a1" },
  { rail: "#e91e63", from: "#e91e63", to: "#c2185b" },
  { rail: "#0891b2", from: "#0891b2", to: "#0e7490" },
  { rail: "#7c3aed", from: "#7c3aed", to: "#6d28d9" },
  { rail: "#d97706", from: "#d97706", to: "#b45309" },
  { rail: "#059669", from: "#059669", to: "#047857" },
];

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
  name_en: "", name_bn: "", slug: "", icon: "", image_url: "", description_bn: "",
  applies_to: ["product"], is_active: true, sort_order: 0, parent_id: null,
};

const INP_CLS = "w-full text-sm rounded-[11px] px-3 py-2.5 bg-[var(--surface,#fff)] dark:bg-white/5 border border-[var(--border,#e2e8f3)] dark:border-white/10 text-heading outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition";
const LBL_CLS = "block text-[0.78rem] font-semibold text-gray-500 dark:text-gray-400 mb-1.5";

function getChildren(node: Node): Node[] {
  return (node.subcategories ?? []) as unknown as Node[];
}
function getNodeLabel(node: Node): string {
  return node.name_bn || node.name_en;
}
function tileGlyph(node: Node): string {
  const icon = (node.icon ?? "").trim();
  if (icon && [...icon].length <= 2) return icon; // emoji
  return (node.name_en || "?").charAt(0).toUpperCase();
}
function flattenAll(nodes: Node[], out: Node[] = []): Node[] {
  for (const n of nodes) { out.push(n); flattenAll(getChildren(n), out); }
  return out;
}
function flattenForSelect(nodes: Node[], depth = 0, out: { id: string; label: string; depth: number }[] = []) {
  for (const node of nodes) {
    out.push({ id: node.id, label: getNodeLabel(node), depth });
    flattenForSelect(getChildren(node), depth + 1, out);
  }
  return out;
}
function selfAndDescendantIds(node: Node, out: Set<string> = new Set()): Set<string> {
  out.add(node.id);
  for (const child of getChildren(node)) selfAndDescendantIds(child, out);
  return out;
}
/** Immutably update one node anywhere in the tree (used for optimistic toggles). */
function updateNodeInTree<T extends Node>(nodes: T[], id: string, fn: (n: T) => T): T[] {
  return nodes.map((n) => {
    if (n.id === id) return fn(n);
    const kids = n.subcategories as unknown as T[] | undefined;
    if (kids && kids.length) return { ...n, subcategories: updateNodeInTree(kids, id, fn) } as T;
    return n;
  });
}

export default function AdminCategoriesPage() {
  const [roots, setRoots] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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

  useEffect(() => { load(); }, [load]);

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
    if (name.length < 2) { toast("error", "Name (English) is required"); return; }
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
        if (!editor.node.parent_id && form.applies_to.length > 0) payload.applies_to = form.applies_to;
        await categoriesAdminApi.update(editor.node.id, payload);
        toast("success", "সংরক্ষিত হয়েছে");
      } else {
        payload.parent_id = form.parent_id ?? null;
        if (!form.parent_id) {
          if (form.applies_to.length === 0) { toast("error", "product/service অন্তত একটি বাছুন"); setBusy(false); return; }
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

  // Inline active toggle — optimistic, reverts on failure. Uses the same update API.
  const toggleActive = async (node: Node) => {
    const next = node.is_active === false;
    setRoots((prev) => updateNodeInTree(prev, node.id, (n) => ({ ...n, is_active: next })));
    try {
      await categoriesAdminApi.update(node.id, { is_active: next });
    } catch (err) {
      setRoots((prev) => updateNodeInTree(prev, node.id, (n) => ({ ...n, is_active: !next })));
      toast("error", apiErrorMessage(err, "Status change failed"));
    }
  };

  const normalizedQuery = searchValue.trim().toLowerCase();
  const searchActive = normalizedQuery.length > 0;

  const filterTree = useCallback(
    (nodes: Node[]): Node[] => {
      const out: Node[] = [];
      for (const node of nodes) {
        const children = filterTree(getChildren(node));
        const haystack = `${node.name_en} ${node.name_bn ?? ""} ${node.slug}`.toLowerCase();
        const matchesQuery = !searchActive || haystack.includes(normalizedQuery);
        const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? node.is_active : !node.is_active);
        if ((matchesQuery && matchesStatus) || children.length > 0) {
          out.push({ ...node, subcategories: children as unknown as Subcategory[] });
        }
      }
      return out;
    },
    [normalizedQuery, searchActive, statusFilter]
  );

  const filteredRoots = useMemo(() => filterTree(roots as unknown as Node[]), [filterTree, roots]);
  const shownRoots = searchActive ? filteredRoots : filteredRoots.slice(0, visibleCount);
  const hasMore = !searchActive && filteredRoots.length > visibleCount;

  const parentOptions = useMemo(() => {
    const all = flattenForSelect(roots as unknown as Node[]);
    const blocked = editor?.node ? selfAndDescendantIds(editor.node) : new Set<string>();
    return all.filter((o) => !blocked.has(o.id));
  }, [roots, editor]);

  const stats = useMemo(() => {
    const all = flattenAll(roots as unknown as Node[]);
    const active = all.filter((n) => n.is_active !== false).length;
    return { total: all.length, roots: roots.length, active, inactive: all.length - active };
  }, [roots]);

  const drawerOpen = editor !== null;

  // ---- Sub-category row ----
  const SubRow = ({ node, accent }: { node: Node; accent: typeof ACCENTS[number] }) => (
    <div className="flex items-center gap-2.5 sm:gap-3 rounded-xl border border-[var(--border,#e2e8f3)] bg-[var(--surface-2,#f4f7fc)] px-2.5 sm:px-3 py-2 transition-colors hover:bg-[var(--surface,#fff)] hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.03]">
      {node.image_url ? (
        <span className="relative w-9 h-9 rounded-[10px] overflow-hidden flex-shrink-0 ring-1 ring-black/5">
          <Image src={node.image_url} alt="" fill className="object-cover" sizes="36px" />
        </span>
      ) : (
        <span className="w-9 h-9 rounded-[10px] flex-shrink-0 grid place-items-center text-white text-sm font-semibold"
          style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
          {tileGlyph(node)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[0.92rem] text-heading truncate">{getNodeLabel(node)}</p>
        <p className="text-[0.72rem] text-gray-400 font-mono truncate">/{node.slug}</p>
      </div>
      <ToggleSwitch on={node.is_active !== false} onClick={() => void toggleActive(node)} />
      <IconBtn title="Edit" onClick={() => openEdit(node)}><Pencil className="w-3.5 h-3.5" /></IconBtn>
      <IconBtn title="Delete" danger onClick={() => void remove(node)}><Trash2 className="w-3.5 h-3.5" /></IconBtn>
    </div>
  );

  // ---- Recursive branch under a root ----
  const renderBranch = (node: Node, accent: typeof ACCENTS[number], depth: number): React.ReactNode => {
    const children = getChildren(node);
    return (
      <div key={node.id} className="space-y-2">
        <SubRow node={node} accent={accent} />
        {children.length > 0 && depth < 4 && (
          <div className="ml-3 sm:ml-5 border-l-2 border-dashed border-gray-200 dark:border-white/10 pl-2.5 sm:pl-3.5 space-y-2">
            {children.map((c) => renderBranch(c, accent, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ---------- Premium header ---------- */}
      <header
        className="relative overflow-hidden rounded-[20px] px-5 sm:px-7 py-6 sm:py-7 text-white shadow-[0_10px_40px_rgba(21,101,192,0.25)]"
        style={{ background: "radial-gradient(120% 140% at 85% -20%, rgba(233,30,99,.38), transparent 55%), linear-gradient(135deg, #0d47a1, #1565c0)" }}
      >
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-white/70">ABO Enterprise · Admin</p>
            <h1 className="mt-1.5 text-2xl sm:text-[2rem] font-extrabold tracking-tight text-balance">ক্যাটাগরি ব্যবস্থাপনা</h1>
            <p className="mt-1 text-white/80 text-sm max-w-[46ch]">পণ্য ও সেবার সব ক্যাটাগরি এক জায়গায় — সুন্দর, দ্রুত ও সহজ।</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} title="Refresh"
              className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white font-semibold text-sm px-3.5 py-2.5 rounded-xl transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => openCreate(null)}
              className="inline-flex items-center gap-2 bg-white text-[#0d47a1] font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform">
              <Plus className="w-4 h-4" /> নতুন ক্যাটাগরি
            </button>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
          {[
            { n: stats.total, l: "মোট ক্যাটাগরি" },
            { n: stats.roots, l: "Root গ্রুপ" },
            { n: stats.active, l: "Active" },
            { n: stats.inactive, l: "Inactive" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-white/12 border border-white/18 px-3.5 py-3 backdrop-blur-sm">
              <p className="text-2xl font-extrabold tabular-nums leading-none">{s.n}</p>
              <p className="text-[0.72rem] uppercase tracking-wide text-white/75 mt-1.5 font-semibold">{s.l}</p>
            </div>
          ))}
        </div>
      </header>

      {/* ---------- Toolbar ---------- */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchValue}
            onChange={(e) => { setSearchValue(e.target.value); setVisibleCount(PAGE_STEP); }}
            placeholder="নাম, বাংলা নাম বা slug দিয়ে খুঁজুন…"
            className="w-full text-sm rounded-xl border border-[var(--border,#e2e8f3)] bg-[var(--surface,#fff)] dark:bg-white/5 dark:border-white/10 pl-10 pr-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
          />
        </div>
        <div className="inline-flex bg-[var(--surface,#fff)] dark:bg-white/5 border border-[var(--border,#e2e8f3)] dark:border-white/10 rounded-xl p-1">
          {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "text-[0.82rem] font-semibold px-3.5 py-2 rounded-lg capitalize transition",
                statusFilter === s
                  ? "bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-md shadow-brand-600/25"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              )}
            >
              {s === "all" ? "সব" : s}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- List ---------- */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[86px] rounded-[20px] bg-gray-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : roots.length === 0 ? (
        <EmptyState onCreate={() => openCreate(null)} title="এখনো কোনো ক্যাটাগরি নেই" desc={'"নতুন ক্যাটাগরি" চাপুন — যেমন Products, Services বা Repair'} />
      ) : filteredRoots.length === 0 ? (
        <EmptyState title="কোনো ফলাফল পাওয়া যায়নি" desc="Search বা status filter পরিবর্তন করে আবার চেষ্টা করুন।" />
      ) : (
        <div className="space-y-3.5">
          {shownRoots.map((root, idx) => {
            const accent = ACCENTS[idx % ACCENTS.length];
            const kids = getChildren(root);
            const isOpen = !collapsed.has(root.id);
            const scope = ((root as Partial<Category>).applies_to ?? []) as string[];
            return (
              <div
                key={root.id}
                className="group relative overflow-hidden rounded-[20px] border border-[var(--border,#e2e8f3)] dark:border-white/10 bg-[var(--surface,#fff)] dark:bg-[#0f1d33] shadow-[0_1px_2px_rgba(16,40,80,.04),0_8px_24px_rgba(16,40,80,.06)] hover:shadow-[0_6px_16px_rgba(21,101,192,.10),0_18px_44px_rgba(16,40,80,.14)] hover:-translate-y-0.5 transition-all"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: accent.rail }} />
                <div className="flex items-center gap-3 sm:gap-3.5 pl-5 sm:pl-6 pr-3.5 sm:pr-4 py-3.5 sm:py-4">
                  {root.image_url ? (
                    <span className="relative w-12 h-12 sm:w-[54px] sm:h-[54px] rounded-[15px] overflow-hidden flex-shrink-0 ring-1 ring-black/5">
                      <Image src={root.image_url} alt="" fill className="object-cover" sizes="54px" />
                    </span>
                  ) : (
                    <span className="w-12 h-12 sm:w-[54px] sm:h-[54px] rounded-[15px] flex-shrink-0 grid place-items-center text-white text-xl font-bold shadow-inner"
                      style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}>
                      {tileGlyph(root)}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[1.02rem] sm:text-[1.06rem] text-heading tracking-tight truncate max-w-full">{root.name_en}</span>
                      {root.name_bn && <span className="text-sm text-gray-500 dark:text-gray-400">{root.name_bn}</span>}
                      <span className="text-[0.62rem] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-brand-500/12 text-brand-600">Root</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mt-1.5 text-xs">
                      <span className="font-mono text-gray-400 truncate max-w-[150px] sm:max-w-none">/{root.slug}</span>
                      {scope.map((s) => (
                        <span key={s} className={cn("px-2 py-0.5 rounded-full font-semibold text-[0.72rem]", s === "service" ? "bg-accent-500/10 text-accent-600" : "bg-brand-500/10 text-brand-600")}>
                          {s === "service" ? "Service" : "Product"}
                        </span>
                      ))}
                      {kids.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full font-semibold text-[0.72rem] bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10">{kids.length}টি সাব</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                    <ToggleSwitch on={root.is_active !== false} onClick={() => void toggleActive(root)} />
                    <IconBtn title="সাব যোগ" onClick={() => openCreate(root)} accentHover><Plus className="w-4 h-4" /></IconBtn>
                    <IconBtn title="Edit" onClick={() => openEdit(root)}><Pencil className="w-4 h-4" /></IconBtn>
                    <IconBtn title="Delete" danger onClick={() => void remove(root)}><Trash2 className="w-4 h-4" /></IconBtn>
                    {kids.length > 0 && (
                      <IconBtn
                        title={isOpen ? "বন্ধ" : "খুলুন"}
                        onClick={() => setCollapsed((prev) => {
                          const next = new Set(prev);
                          if (next.has(root.id)) next.delete(root.id); else next.add(root.id);
                          return next;
                        })}
                      >
                        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                      </IconBtn>
                    )}
                  </div>
                </div>

                {kids.length > 0 && (
                  <div className={cn("grid transition-all duration-300 ease-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                    <div className="overflow-hidden">
                      <div className="pl-5 sm:pl-6 pr-3.5 sm:pr-4 pb-4">
                        <div className="ml-[26px] sm:ml-8 border-l-2 border-dashed border-gray-200 dark:border-white/10 pl-3 sm:pl-4 space-y-2 pt-1">
                          {kids.map((c) => renderBranch(c, accent, 1))}
                          <button type="button" onClick={() => openCreate(root)}
                            className="inline-flex items-center gap-1.5 text-brand-600 border border-dashed border-gray-300 dark:border-white/15 rounded-[10px] px-3 py-2 text-[0.82rem] font-semibold hover:bg-brand-500/[0.06] hover:border-brand-500 transition mt-0.5">
                            <Plus className="w-3.5 h-3.5" /> সাব-ক্যাটাগরি যোগ
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && (
            <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_STEP)}
              className="block mx-auto mt-2 bg-[var(--surface,#fff)] dark:bg-white/5 border border-[var(--border,#e2e8f3)] dark:border-white/10 text-gray-500 dark:text-gray-400 font-semibold text-sm px-6 py-2.5 rounded-xl hover:border-brand-500 hover:text-brand-600 transition inline-flex items-center gap-1.5">
              <ChevronDown className="w-4 h-4" /> আরও দেখুন ({filteredRoots.length - visibleCount})
            </button>
          )}
        </div>
      )}

      {/* ---------- Drawer form ---------- */}
      <div
        onClick={() => setEditor(null)}
        className={cn("fixed inset-0 z-40 bg-[#08111f]/50 backdrop-blur-[2px] transition-opacity", drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none")}
      />
      <aside
        ref={editorRef}
        className={cn(
          "fixed z-50 bg-[var(--surface,#fff)] dark:bg-[#0f1d33] flex flex-col transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]",
          "left-0 right-0 bottom-0 rounded-t-3xl max-h-[94vh]",
          "sm:left-auto sm:top-0 sm:right-0 sm:bottom-0 sm:w-[440px] sm:max-h-none sm:rounded-none sm:border-l sm:border-[var(--border,#e2e8f3)] sm:dark:border-white/10",
          drawerOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border,#e2e8f3)] dark:border-white/10">
          <h3 className="font-bold text-[1.05rem] text-heading">
            {editor?.node ? `সম্পাদনা: ${getNodeLabel(editor.node)}` : editor?.parentId ? `নতুন সাব — ${editor.parentName ?? ""}` : "নতুন ক্যাটাগরি"}
          </h3>
          <button type="button" onClick={() => setEditor(null)} aria-label="বন্ধ" className="w-9 h-9 grid place-items-center rounded-[10px] bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-4">
          {/* live preview */}
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border,#e2e8f3)] dark:border-white/10 p-3 bg-gradient-to-br from-[var(--surface-2,#f4f7fc)] to-transparent dark:from-white/5">
            {form.image_url ? (
              <span className="relative w-[54px] h-[54px] rounded-[15px] overflow-hidden flex-shrink-0 ring-1 ring-black/5">
                <Image src={form.image_url} alt="" fill className="object-cover" sizes="54px" />
              </span>
            ) : (
              <span className="w-[54px] h-[54px] rounded-[15px] flex-shrink-0 grid place-items-center text-white text-xl font-bold" style={{ background: "linear-gradient(135deg,#1565c0,#0d47a1)" }}>
                {form.icon && [...form.icon].length <= 2 ? form.icon : (form.name_en || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-bold text-[1.02rem] text-heading truncate">{form.name_en || "নতুন ক্যাটাগরি"}</p>
              <p className="text-[0.76rem] text-gray-400 font-mono truncate">/{form.slug || slugify(form.name_en) || "slug"}</p>
            </div>
          </div>

          {/* Live website preview — the category tile as shown on the site */}
          <LivePreview showDevice={false}>
            <div className="p-1 pointer-events-none max-w-[210px] mx-auto">
              <div className="enterprise-card p-4 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl grid place-items-center text-white text-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#1565c0,#0d47a1)" }}>
                  {form.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- live admin preview
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                  ) : form.icon && [...form.icon].length <= 2 ? (
                    form.icon
                  ) : (
                    (form.name_bn || form.name_en || "?").charAt(0)
                  )}
                </div>
                <p className="font-bold text-sm text-heading">{form.name_bn || form.name_en || "ক্যাটাগরি"}</p>
                {form.description_bn && <p className="text-xs text-muted mt-1 line-clamp-2">{form.description_bn}</p>}
              </div>
            </div>
          </LivePreview>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (English) *">
              <input value={form.name_en} onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value, slug: p.slug || slugify(e.target.value) }))} className={INP_CLS} placeholder="Fast Chargers" />
            </Field>
            <Field label="নাম (বাংলা)">
              <input value={form.name_bn} onChange={(e) => setForm((p) => ({ ...p, name_bn: e.target.value }))} className={INP_CLS} placeholder="ফাস্ট চার্জার" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Slug (URL)">
              <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))} className={cn(INP_CLS, "font-mono")} placeholder="auto" />
            </Field>
            <Field label="Sort Order">
              <input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))} className={INP_CLS} />
            </Field>
          </div>

          {!editor?.node && (
            <Field label="Parent ক্যাটাগরি">
              <select value={form.parent_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value || null }))} className={INP_CLS}>
                <option value="">— None (root ক্যাটাগরি) —</option>
                {parentOptions.map((o) => (
                  <option key={o.id} value={o.id}>{"— ".repeat(o.depth)}{o.label}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Icon (ঐচ্ছিক)">
            <input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} className={INP_CLS} placeholder="lucide নাম বা emoji (📦)" />
          </Field>

          <Field label="বর্ণনা (ঐচ্ছিক)">
            <textarea rows={2} value={form.description_bn} onChange={(e) => setForm((p) => ({ ...p, description_bn: e.target.value }))} className={cn(INP_CLS, "resize-none")} />
          </Field>

          <div>
            <span className={LBL_CLS}>ছবি (কার্ড/ব্যানারে দেখাবে)</span>
            <ImageUpload value={form.image_url} onChange={(url) => setForm((p) => ({ ...p, image_url: url }))} />
          </div>

          {!form.parent_id && (
            <div>
              <span className={LBL_CLS}>কোন ধরনের ক্যাটাগরি?</span>
              <div className="flex gap-2">
                {APPLIES.map((s) => {
                  const on = form.applies_to.includes(s);
                  return (
                    <button key={s} type="button"
                      onClick={() => setForm((p) => ({ ...p, applies_to: on ? p.applies_to.filter((x) => x !== s) : [...p.applies_to, s] }))}
                      className={cn("flex-1 rounded-xl border py-2.5 text-sm font-semibold transition", on ? "border-brand-500 bg-brand-500/[0.08] text-brand-600" : "border-[var(--border,#e2e8f3)] dark:border-white/10 text-gray-500")}>
                      {s === "product" ? "Product (কেনাকাটা)" : "Service (বুকিং)"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <label className="inline-flex items-center gap-2.5 cursor-pointer text-sm">
            <ToggleSwitch on={form.is_active} onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))} />
            <span className="font-medium text-heading">সক্রিয় (সাইটে দেখাবে)</span>
          </label>
        </div>

        <div className="px-5 py-3.5 border-t border-[var(--border,#e2e8f3)] dark:border-white/10 flex gap-2.5">
          <button type="button" onClick={() => void save()} disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-br from-brand-600 to-brand-800 text-white font-bold text-[0.92rem] py-3 rounded-xl shadow-lg shadow-brand-600/25 disabled:opacity-60 transition">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editor?.node ? "সংরক্ষণ" : "তৈরি করুন"}
          </button>
          <button type="button" onClick={() => setEditor(null)} className="bg-gray-100 dark:bg-white/10 text-gray-500 font-semibold text-sm px-5 py-3 rounded-xl">বাতিল</button>
        </div>
      </aside>

    </div>
  );
}

/* ---------------- small building blocks ---------------- */

function ToggleSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={on ? "Active" : "Inactive"}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn("relative w-11 h-[26px] rounded-full flex-shrink-0 transition-colors", on ? "bg-emerald-500" : "bg-gray-300 dark:bg-white/20")}
    >
      <span className={cn("absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow transition-transform", on && "translate-x-[18px]")} />
    </button>
  );
}

function IconBtn({ children, title, onClick, danger, accentHover }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean; accentHover?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "w-9 h-9 rounded-[11px] grid place-items-center border border-transparent bg-[var(--surface-2,#f4f7fc)] dark:bg-white/5 text-gray-500 dark:text-gray-400 transition",
        danger ? "hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" : accentHover ? "hover:text-brand-600 hover:bg-brand-500/10" : "hover:text-brand-600 hover:border-gray-200 dark:hover:border-white/10"
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={LBL_CLS}>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ title, desc, onCreate }: { title: string; desc: string; onCreate?: () => void }) {
  return (
    <div className="rounded-[20px] border border-[var(--border,#e2e8f3)] dark:border-white/10 bg-[var(--surface,#fff)] dark:bg-[#0f1d33] p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-500/10 text-brand-600 grid place-items-center mb-4">
        <FolderTree className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-heading">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">{desc}</p>
      {onCreate && (
        <button type="button" onClick={onCreate} className="mt-5 inline-flex items-center gap-2 bg-gradient-to-br from-brand-600 to-brand-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-brand-600/25">
          <Plus className="w-4 h-4" /> প্রথম ক্যাটাগরি তৈরি করুন
        </button>
      )}
    </div>
  );
}
