"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
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
import { categoriesAdminApi, productsApi, servicesAdminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import type { Category, Product, Service, Subcategory } from "@/types";
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
const PAGE_SIZE = 100;
const VIEW_STATE_KEY = "abo_admin_categories_treegrid_state_v1";

type Node = Category | Subcategory;
type SortKey = "category" | "parent" | "products" | "services" | "children" | "status" | "sort_order";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";
type ScopeFilter = "all" | "product" | "service";

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
}

interface RowMetrics {
  products: number;
  services: number;
  children: number;
}

interface TreeRow {
  node: Node;
  depth: number;
  parent: Node | null;
  metrics: RowMetrics;
  isExpanded: boolean;
  hasChildren: boolean;
  scope: string[];
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
};

function getChildren(node: Node): Node[] {
  return (node.subcategories ?? []) as unknown as Node[];
}

function getNodeLabel(node: Node): string {
  return node.name_bn || node.name_en;
}

function HierarchyGuides({ depth }: { depth: number }) {
  if (depth <= 0) return <span className="w-0" aria-hidden />;
  return (
    <span className="flex items-stretch gap-2 pr-1.5" aria-hidden>
      {Array.from({ length: depth }).map((_, index) => (
        <span key={index} className="w-px self-stretch rounded-full bg-gradient-to-b from-brand-100 via-brand-200/80 to-transparent" />
      ))}
    </span>
  );
}

function countByAssignedNode<T extends { category_id?: string | null; subcategory_id?: string | null }>(items: T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const nodeId = item.subcategory_id || item.category_id;
    if (!nodeId) continue;
    counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
  }
  return counts;
}

async function fetchAllProducts(): Promise<Product[]> {
  const items: Product[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await productsApi.adminList({ page, per_page: PAGE_SIZE });
    items.push(...(res.data.data ?? []));
    totalPages = res.data.meta?.total_pages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return items;
}

async function fetchAllServices(): Promise<Service[]> {
  const items: Service[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await servicesAdminApi.list({ page, per_page: PAGE_SIZE });
    items.push(...(res.data.data ?? []));
    totalPages = res.data.meta?.total_pages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return items;
}

function collectExpandableIds(nodes: Node[]): Set<string> {
  const ids = new Set<string>();
  const walk = (items: Node[]) => {
    for (const node of items) {
      const children = getChildren(node);
      if (children.length > 0) {
        ids.add(node.id);
        walk(children);
      }
    }
  };
  walk(nodes);
  return ids;
}

export default function AdminCategoriesPage() {
  const [roots, setRoots] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("sort_order");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [productCounts, setProductCounts] = useState<Map<string, number>>(new Map());
  const [serviceCounts, setServiceCounts] = useState<Map<string, number>>(new Map());
  const [countsReady, setCountsReady] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const toast = useToastStore((s) => s.push);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const editorRef = useFocusTrap(editor !== null, () => setEditor(null));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VIEW_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        expanded?: string[];
        searchValue?: string;
        statusFilter?: StatusFilter;
        scopeFilter?: ScopeFilter;
        sortKey?: SortKey;
        sortDirection?: SortDirection;
      };
      if (saved.expanded?.length) setExpanded(new Set(saved.expanded));
      if (saved.searchValue) setSearchValue(saved.searchValue);
      if (saved.statusFilter) setStatusFilter(saved.statusFilter);
      if (saved.scopeFilter) setScopeFilter(saved.scopeFilter);
      if (saved.sortKey) setSortKey(saved.sortKey);
      if (saved.sortDirection) setSortDirection(saved.sortDirection);
    } catch {
      // Ignore invalid localStorage state.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        VIEW_STATE_KEY,
        JSON.stringify({
          expanded: Array.from(expanded),
          searchValue,
          statusFilter,
          scopeFilter,
          sortKey,
          sortDirection,
        })
      );
    } catch {
      // Ignore storage issues.
    }
  }, [expanded, scopeFilter, searchValue, sortDirection, sortKey, statusFilter]);

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

  useEffect(() => {
    let active = true;

    if (roots.length === 0) {
      setProductCounts(new Map());
      setServiceCounts(new Map());
      setCountsReady(true);
      return () => {
        active = false;
      };
    }

    const loadMetrics = async () => {
      setMetricsLoading(true);
      try {
        const [products, services] = await Promise.all([fetchAllProducts(), fetchAllServices()]);
        if (!active) return;
        setProductCounts(countByAssignedNode(products));
        setServiceCounts(countByAssignedNode(services));
        setCountsReady(true);
      } catch (err) {
        if (!active) return;
        setCountsReady(false);
        toast("error", apiErrorMessage(err, "Category metrics could not be loaded"));
      } finally {
        if (active) setMetricsLoading(false);
      }
    };

    void loadMetrics();
    return () => {
      active = false;
    };
  }, [roots, toast]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = useCallback(() => {
    setExpanded(collectExpandableIds(roots as unknown as Node[]));
  }, [roots]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const openCreate = (parent: Node | null) => {
    setForm({
      ...EMPTY_FORM,
      applies_to: parent ? [] : ["product"],
      sort_order: parent ? getChildren(parent).length : roots.length,
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
        icon: form.icon || undefined,
        image_url: form.image_url || undefined,
        description_bn: form.description_bn.trim() || undefined,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };

      if (editor?.node) {
        if (form.applies_to.length > 0) payload.applies_to = form.applies_to;
        await categoriesAdminApi.update(editor.node.id, payload);
        toast("success", "সংরক্ষিত হয়েছে");
      } else {
        payload.parent_id = editor?.parentId ?? null;
        if (!editor?.parentId) {
          if (form.applies_to.length === 0) {
            toast("error", "product/service অন্তত একটি বাছুন");
            setBusy(false);
            return;
          }
          payload.applies_to = form.applies_to;
        }
        await categoriesAdminApi.create(payload);
        toast("success", "তৈরি হয়েছে");
        if (editor?.parentId) setExpanded((prev) => new Set(prev).add(editor.parentId!));
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

  const reorder = async (siblings: Node[], index: number, dir: -1 | 1) => {
    const target = siblings[index + dir];
    if (!target) return;
    const current = siblings[index];
    try {
      await Promise.all([
        categoriesAdminApi.update(current.id, { sort_order: index + dir }),
        categoriesAdminApi.update(target.id, { sort_order: index }),
      ]);
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "Reorder failed"));
    }
  };

  const parentById = useMemo(() => {
    const map = new Map<string, Node | null>();
    const scopeMap = new Map<string, string[]>();

    const walk = (nodes: Node[], parent: Node | null, inheritedScope: string[]) => {
      for (const node of nodes) {
        map.set(node.id, parent);
        const ownScope = (node as Partial<Category>).applies_to ?? [];
        const scope = ownScope.length > 0 ? ownScope : inheritedScope;
        scopeMap.set(node.id, scope);
        walk(getChildren(node), node, scope);
      }
    };

    walk(roots as unknown as Node[], null, []);
    return { parentMap: map, scopeMap };
  }, [roots]);

  const metricsMap = useMemo(() => {
    const map = new Map<string, RowMetrics>();

    const walk = (node: Node): { products: number; services: number } => {
      const children = getChildren(node);
      let products = productCounts.get(node.id) ?? 0;
      let services = serviceCounts.get(node.id) ?? 0;

      for (const child of children) {
        const childTotals = walk(child);
        products += childTotals.products;
        services += childTotals.services;
      }

      map.set(node.id, { products, services, children: children.length });
      return { products, services };
    };

    for (const root of roots as unknown as Node[]) walk(root);
    return map;
  }, [productCounts, roots, serviceCounts]);

  const collator = useMemo(() => new Intl.Collator("en", { numeric: true, sensitivity: "base" }), []);

  const compareNodes = useCallback((a: Node, b: Node) => {
    const aMetrics = metricsMap.get(a.id) ?? { products: 0, services: 0, children: 0 };
    const bMetrics = metricsMap.get(b.id) ?? { products: 0, services: 0, children: 0 };
    const aParent = parentById.parentMap.get(a.id);
    const bParent = parentById.parentMap.get(b.id);
    const direction = sortDirection === "asc" ? 1 : -1;

    let result = 0;
    switch (sortKey) {
      case "category":
        result = collator.compare(getNodeLabel(a), getNodeLabel(b));
        break;
      case "parent":
        result = collator.compare(aParent ? getNodeLabel(aParent) : "", bParent ? getNodeLabel(bParent) : "");
        break;
      case "products":
        result = aMetrics.products - bMetrics.products;
        break;
      case "services":
        result = aMetrics.services - bMetrics.services;
        break;
      case "children":
        result = aMetrics.children - bMetrics.children;
        break;
      case "status":
        result = Number(a.is_active) - Number(b.is_active);
        break;
      case "sort_order":
        result = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        break;
    }

    if (result === 0) {
      result = collator.compare(getNodeLabel(a), getNodeLabel(b));
    }

    return result * direction;
  }, [collator, metricsMap, parentById.parentMap, sortDirection, sortKey]);

  const sortedTree = useMemo(() => {
    const sortBranch = (nodes: Node[]): Node[] => {
      return nodes
        .map((node) => ({
          ...node,
          subcategories: sortBranch(getChildren(node)) as unknown as Subcategory[],
        }))
        .sort(compareNodes);
    };
    return sortBranch(roots as unknown as Node[]);
  }, [compareNodes, roots]);

  const normalizedQuery = searchValue.trim().toLowerCase();
  const hasActiveFilters = normalizedQuery.length > 0 || statusFilter !== "all" || scopeFilter !== "all";

  const filteredTree = useMemo(() => {
    const filterNode = (node: Node): Node | null => {
      const children = getChildren(node)
        .map(filterNode)
        .filter(Boolean) as Node[];
      const haystack = `${node.name_en} ${node.name_bn ?? ""} ${node.slug}`.toLowerCase();
      const scope = parentById.scopeMap.get(node.id) ?? [];
      const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? node.is_active : !node.is_active);
      const matchesScope = scopeFilter === "all" || scope.includes(scopeFilter);
      const selfMatch = matchesQuery && matchesStatus && matchesScope;

      if (!selfMatch && children.length === 0) return null;
      return {
        ...node,
        subcategories: children as unknown as Subcategory[],
      };
    };

    return (sortedTree as Node[])
      .map(filterNode)
      .filter(Boolean) as Node[];
  }, [normalizedQuery, parentById.scopeMap, scopeFilter, sortedTree, statusFilter]);

  const effectiveExpanded = useMemo(() => {
    return hasActiveFilters ? collectExpandableIds(filteredTree) : expanded;
  }, [expanded, filteredTree, hasActiveFilters]);

  const rows = useMemo(() => {
    const visibleRows: TreeRow[] = [];

    const walk = (nodes: Node[], depth: number, parent: Node | null) => {
      for (const node of nodes) {
        const children = getChildren(node);
        const metrics = metricsMap.get(node.id) ?? { products: 0, services: 0, children: children.length };
        const isExpanded = effectiveExpanded.has(node.id);
        visibleRows.push({
          node,
          depth,
          parent,
          metrics,
          isExpanded,
          hasChildren: children.length > 0,
          scope: parentById.scopeMap.get(node.id) ?? [],
        });
        if (children.length > 0 && isExpanded) {
          walk(children, depth + 1, node);
        }
      }
    };

    walk(filteredTree, 0, null);
    return visibleRows;
  }, [effectiveExpanded, filteredTree, metricsMap, parentById.scopeMap]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "sort_order" ? "asc" : "desc");
  };

  const focusRow = (rowId: string) => {
    rowRefs.current[rowId]?.focus();
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, row: TreeRow, rowIndex: number) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return;

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const next = rows[rowIndex + 1];
        if (next) focusRow(next.node.id);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const prev = rows[rowIndex - 1];
        if (prev) focusRow(prev.node.id);
        break;
      }
      case "ArrowRight": {
        if (row.hasChildren && !row.isExpanded) {
          event.preventDefault();
          toggle(row.node.id);
        }
        break;
      }
      case "ArrowLeft": {
        if (row.hasChildren && row.isExpanded) {
          event.preventDefault();
          toggle(row.node.id);
        } else if (row.parent) {
          event.preventDefault();
          focusRow(row.parent.id);
        }
        break;
      }
      case "Home": {
        event.preventDefault();
        if (rows[0]) focusRow(rows[0].node.id);
        break;
      }
      case "End": {
        event.preventDefault();
        const last = rows[rows.length - 1];
        if (last) focusRow(last.node.id);
        break;
      }
      case "Enter": {
        event.preventDefault();
        openEdit(row.node);
        break;
      }
      case " ": {
        if (row.hasChildren) {
          event.preventDefault();
          toggle(row.node.id);
        }
        break;
      }
    }
  };

  const renderCount = (value: number) => {
    if (metricsLoading && !countsReady) {
      return <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" aria-hidden />;
    }
    return <span className="font-semibold text-gray-900">{value}</span>;
  };

  const canReorder = sortKey === "sort_order" && sortDirection === "asc";
  const activeFilterCount = Number(normalizedQuery.length > 0) + Number(statusFilter !== "all") + Number(scopeFilter !== "all");
  const rootCount = filteredTree.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title="Categories"
        titleBn="ক্যাটাগরি ট্রিগ্রিড"
        description={`${rows.length} visible rows across ${roots.length} roots — unlimited nested taxonomy management`}
        descriptionBn={`${rows.length}টি দৃশ্যমান সারি, ${roots.length}টি root — অসীম nested taxonomy ব্যবস্থাপনা`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={expandAll} className="btn btn-outline btn-sm">সব খুলুন</button>
            <button type="button" onClick={collapseAll} className="btn btn-outline btn-sm">সব বন্ধ</button>
            <button type="button" onClick={() => void load()} className="btn btn-outline btn-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button type="button" onClick={() => openCreate(null)} className="admin-btn-primary">
              <Plus className="w-4 h-4" /> নতুন Vertical
            </button>
          </div>
        }
      />

      <AdminToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="নাম, বাংলা নাম বা slug দিয়ে খুঁজুন…"
      >
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="admin-input min-w-[140px]">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)} className="admin-input min-w-[140px]">
          <option value="all">All Scope</option>
          <option value="product">Products</option>
          <option value="service">Services</option>
        </select>
      </AdminToolbar>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-3 py-1 font-medium text-gray-600">
          {rows.length} visible rows
        </span>
        <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-3 py-1 font-medium text-gray-600">
          {rootCount} root groups
        </span>
        <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-3 py-1 font-medium text-gray-600">
          Sorted by {sortKey.replace("_", " ")} ({sortDirection})
        </span>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-brand-50 border border-brand-100 px-3 py-1 font-medium text-brand-700">
            {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
          </span>
        )}
        {!canReorder && (
          <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-3 py-1 font-medium text-amber-700">
            Move actions unlock in Sort Order ascending view
          </span>
        )}
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : roots.length === 0 ? (
          <AdminEmptyState
            icon={FolderTree}
            title="এখনো কোনো শাখা নেই"
            description={'"নতুন Vertical" চাপুন — যেমন Products, Services বা Repair'}
            action={
              <button type="button" onClick={() => openCreate(null)} className="admin-btn-primary">
                <Plus className="w-4 h-4" /> প্রথম Vertical তৈরি করুন
              </button>
            }
          />
        ) : rows.length === 0 ? (
          <AdminEmptyState
            icon={FolderTree}
            title="কোনো ফলাফল পাওয়া যায়নি"
            description="Search, status বা scope filter পরিবর্তন করে আবার চেষ্টা করুন।"
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[72vh] overflow-auto">
              <table role="treegrid" aria-label="Admin Categories Tree Grid" className="table-premium min-w-[1120px]">
                <thead>
                  <tr>
                    {[
                      ["Category", "category"],
                      ["Parent", "parent"],
                      ["Products", "products"],
                      ["Services", "services"],
                      ["Children", "children"],
                      ["Status", "status"],
                      ["Sort Order", "sort_order"],
                    ].map(([label, key]) => (
                      <th key={key} className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/85">
                        <button
                          type="button"
                          onClick={() => handleSort(key as SortKey)}
                          className="inline-flex items-center gap-1.5 hover:text-gray-800 transition-colors"
                        >
                          <span>{label}</span>
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                    ))}
                    <th className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/85 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const siblings = row.parent ? getChildren(row.parent) : (filteredTree as Node[]);
                    const siblingIndex = siblings.findIndex((item) => item.id === row.node.id);
                    return (
                      <tr
                        key={row.node.id}
                        ref={(node) => {
                          rowRefs.current[row.node.id] = node;
                        }}
                        role="row"
                        tabIndex={0}
                        aria-level={row.depth + 1}
                        aria-expanded={row.hasChildren ? row.isExpanded : undefined}
                        onKeyDown={(event) => handleRowKeyDown(event, row, index)}
                        onDoubleClick={() => openEdit(row.node)}
                        className={cn(
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset",
                          row.depth === 0 && "bg-brand-50/30"
                        )}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-start gap-3" style={{ paddingLeft: `${row.depth * 10}px` }}>
                            <HierarchyGuides depth={row.depth} />
                            <button
                              type="button"
                              onClick={() => row.hasChildren && toggle(row.node.id)}
                              className={cn("mt-1 w-5 h-5 flex items-center justify-center rounded text-muted hover:bg-gray-100", !row.hasChildren && "invisible")}
                              aria-label={row.isExpanded ? "Collapse row" : "Expand row"}
                            >
                              {row.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>

                            {row.node.image_url ? (
                              <span className="relative w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 ring-1 ring-gray-100">
                                <Image src={row.node.image_url} alt="" fill className="object-cover" sizes="40px" />
                              </span>
                            ) : (
                              <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0 ring-1 ring-amber-100" title="ছবি নেই">
                                <ImageOff className="w-4 h-4" />
                              </span>
                            )}

                            <div className="min-w-0 flex-1">
                              <button type="button" onClick={() => openEdit(row.node)} className="text-left min-w-0 max-w-full">
                                <span className="block font-semibold text-gray-900 truncate">
                                  {getNodeLabel(row.node)}
                                  {row.depth === 0 && (
                                    <span className="ml-2 inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                                      Root
                                    </span>
                                  )}
                                </span>
                              </button>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                {row.scope.map((scope) => (
                                  <span key={`${row.node.id}-${scope}`} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-medium capitalize text-gray-600">
                                    {scope}
                                  </span>
                                ))}
                                {row.parent && <span className="lg:hidden">Parent: {getNodeLabel(row.parent)}</span>}
                                <span className="md:hidden">P: {row.metrics.products}</span>
                                <span className="md:hidden">S: {row.metrics.services}</span>
                                <span className="md:hidden">C: {row.metrics.children}</span>
                                <span className="xl:hidden">Sort: {row.node.sort_order ?? 0}</span>
                                {row.hasChildren && <span className="text-brand-600">{row.isExpanded ? "Expanded" : "Collapsed"}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell text-gray-600">{row.parent ? getNodeLabel(row.parent) : <span className="text-gray-400">Root</span>}</td>
                        <td className="hidden md:table-cell">{renderCount(row.metrics.products)}</td>
                        <td className="hidden md:table-cell">{renderCount(row.metrics.services)}</td>
                        <td className="hidden md:table-cell text-gray-700">{row.metrics.children}</td>
                        <td>
                          <StatusBadge status={row.node.is_active ? "active" : "inactive"} />
                        </td>
                        <td className="hidden xl:table-cell text-gray-700 font-medium">{row.node.sort_order ?? 0}</td>
                        <td className="px-5 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => reorder(siblings, siblingIndex, -1)}
                              disabled={!canReorder || siblingIndex <= 0}
                              aria-label={`Move ${getNodeLabel(row.node)} up`}
                              title={canReorder ? "Move up" : "Sort by Sort Order to move items"}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => reorder(siblings, siblingIndex, 1)}
                              disabled={!canReorder || siblingIndex === siblings.length - 1}
                              aria-label={`Move ${getNodeLabel(row.node)} down`}
                              title={canReorder ? "Move down" : "Sort by Sort Order to move items"}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openCreate(row.node)}
                              aria-label={`Add child to ${getNodeLabel(row.node)}`}
                              title="Add Child"
                              className="p-1.5 rounded-lg text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(row.node)}
                              aria-label={`Edit ${getNodeLabel(row.node)}`}
                              title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(row.node)}
                              aria-label={`Delete ${getNodeLabel(row.node)}`}
                              title="Delete"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true">
          <div ref={editorRef} className="bg-white dark:bg-[var(--surface-card)] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-heading">
                  {editor.node
                    ? `সম্পাদনা: ${getNodeLabel(editor.node)}`
                    : editor.parentId
                      ? `নতুন শাখা — ${editor.parentName ?? ""}-এর ভেতরে`
                      : "নতুন Vertical"}
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

              {!editor.parentId && !editor.node?.parent_id && (
                <fieldset>
                  <legend className="form-label">কোন ধরনের Vertical?</legend>
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