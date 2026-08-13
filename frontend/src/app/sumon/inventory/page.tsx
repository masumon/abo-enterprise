"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Plus, Search, Archive, RefreshCw, ArrowDown, ArrowUp, History, Tags, Loader2 } from "lucide-react";
import { brandsApi, inventoryApi, type Brand, type InventoryItem, type InventoryMovement } from "@/lib/brandsInventoryApi";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

type Tab = "inventory" | "brands";

export default function AdminInventoryPage() {
  const toast = useToastStore((s) => s.push);
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "brands" ? "brands" : "inventory");
  const [summary, setSummary] = useState({ products: 0, low_stock: 0, out_of_stock: 0, units: 0 });
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [adjusting, setAdjusting] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [movementType, setMovementType] = useState("adjustment");
  const [brandModal, setBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState({ slug: "", name_en: "", name_bn: "", description_en: "", description_bn: "", logo_url: "", website_url: "", sort_order: 0, is_active: true });
  const [archiveBrand, setArchiveBrand] = useState<Brand | null>(null);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([inventoryApi.summary(), inventoryApi.list({ search: search || undefined, per_page: 100 })]);
      setSummary(s.data.data);
      setItems(r.data.data);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load inventory"));
    } finally { setLoading(false); }
  };

  const loadBrands = async () => {
    setLoading(true);
    try {
      const r = await brandsApi.list({ search: search || undefined, include_inactive: true, per_page: 100 });
      setBrands(r.data.data);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load brands"));
    } finally { setLoading(false); }
  };

  const reload = () => (tab === "inventory" ? loadInventory() : loadBrands());
  useEffect(() => { reload(); }, [tab]);
  useEffect(() => { setTab(searchParams.get("tab") === "brands" ? "brands" : "inventory"); }, [searchParams]);

  const lowStock = useMemo(() => items.filter((p) => p.stock_quantity <= p.low_stock_threshold).length, [items]);

  const openMovements = async (item: InventoryItem) => {
    setSelected(item);
    try {
      const r = await inventoryApi.movements(item.id);
      setMovements(r.data.data);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load stock history"));
    }
  };

  const submitAdjustment = async () => {
    const amount = Number(delta);
    if (!Number.isInteger(amount) || amount === 0 || !reason.trim() || !selected) return;
    setAdjusting(true);
    try {
      await inventoryApi.adjust(selected.id, { delta: amount, movement_type: movementType, reason: reason.trim() });
      setDelta(""); setReason("");
      await loadInventory();
      const fresh = items.find((p) => p.id === selected.id);
      await openMovements(fresh ? { ...fresh, stock_quantity: fresh.stock_quantity + amount } : selected);
      toast("success", "Stock adjustment saved");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to save stock adjustment"));
    } finally { setAdjusting(false); }
  };

  const openBrand = (brand?: Brand) => {
    setEditingBrand(brand ?? null);
    setBrandForm(brand ? {
      slug: brand.slug, name_en: brand.name_en, name_bn: brand.name_bn ?? "", description_en: brand.description_en ?? "", description_bn: brand.description_bn ?? "",
      logo_url: brand.logo_url ?? "", website_url: brand.website_url ?? "", sort_order: brand.sort_order, is_active: brand.is_active,
    } : { slug: "", name_en: "", name_bn: "", description_en: "", description_bn: "", logo_url: "", website_url: "", sort_order: 0, is_active: true });
    setBrandModal(true);
  };

  const saveBrand = async () => {
    const payload = { ...brandForm, name_bn: brandForm.name_bn || null, description_en: brandForm.description_en || null, description_bn: brandForm.description_bn || null, logo_url: brandForm.logo_url || null, website_url: brandForm.website_url || null };
    try {
      if (editingBrand) await brandsApi.update(editingBrand.id, payload); else await brandsApi.create(payload);
      setBrandModal(false); await loadBrands();
      toast("success", editingBrand ? "Brand updated" : "Brand created");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to save brand"));
    }
  };

  const confirmArchive = async () => {
    if (!archiveBrand) return;
    try {
      await brandsApi.archive(archiveBrand.id); setArchiveBrand(null); await loadBrands();
      toast("success", "Brand archived");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to archive brand"));
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Inventory & Brands" description="Real stock balances, movement history, low-stock monitoring and brand master data." />
      <div className="flex gap-2 border-b border-border">
        <button className={`px-4 py-2 font-medium ${tab === "inventory" ? "border-b-2 border-brand text-brand" : "text-muted"}`} onClick={() => setTab("inventory")}>Inventory</button>
        <button className={`px-4 py-2 font-medium ${tab === "brands" ? "border-b-2 border-brand text-brand" : "text-muted"}`} onClick={() => setTab("brands")}>Brands</button>
      </div>

      {tab === "inventory" ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Products" value={summary.products} icon={<Package className="w-4 h-4" />} />
            <Stat label="Units in stock" value={summary.units} icon={<Package className="w-4 h-4" />} />
            <Stat label="Low stock" value={summary.low_stock} icon={<ArrowDown className="w-4 h-4" />} />
            <Stat label="Out of stock" value={summary.out_of_stock} icon={<ArrowDown className="w-4 h-4" />} />
          </div>
          <AdminToolbar>
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><input className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-surface" placeholder="Search product, SKU or brand" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadInventory()} /></div>
            <button className="p-2 rounded-lg border border-border" onClick={loadInventory} aria-label="Refresh"><RefreshCw className="w-4 h-4" /></button>
          </AdminToolbar>
          <div className="rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="p-3">Product</th><th className="p-3">SKU</th><th className="p-3">Brand</th><th className="p-3">Stock</th><th className="p-3">Threshold</th><th className="p-3">Action</th></tr></thead>
              <tbody>{items.map((p) => <tr key={p.id} className="border-b border-border/60"><td className="p-3"><div className="font-medium">{p.name_en}</div><div className="text-xs text-muted">{p.name_bn}</div></td><td className="p-3">{p.sku || "—"}</td><td className="p-3">{p.brand || "—"}</td><td className="p-3"><span className="font-semibold">{p.stock_quantity}</span></td><td className="p-3">{p.low_stock_threshold}</td><td className="p-3"><button className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border" onClick={() => openMovements(p)}><History className="w-3.5 h-3.5" /> History</button></td></tr>)}</tbody>
            </table>
            {loading && <div className="p-8 flex items-center justify-center gap-2 text-muted"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>}
            {!items.length && !loading && <div className="p-8 text-center text-muted">No inventory records found.</div>}
          </div>

          {selected && <div className="rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between"><div><h2 className="font-semibold">{selected.name_en}</h2><p className="text-sm text-muted">Current stock: {selected.stock_quantity}</p></div><button className="text-muted" onClick={() => setSelected(null)}>Close</button></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select className="rounded-lg border border-border p-2 bg-surface" value={movementType} onChange={(e) => setMovementType(e.target.value)}><option value="adjustment">Adjustment</option><option value="purchase">Purchase</option><option value="return">Return</option><option value="damage">Damage</option><option value="correction">Correction</option></select>
              <input className="rounded-lg border border-border p-2 bg-surface" type="number" step="1" placeholder="Quantity (+/-)" value={delta} onChange={(e) => setDelta(e.target.value)} />
              <input className="rounded-lg border border-border p-2 bg-surface md:col-span-2" placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button className="md:col-span-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand text-white py-2 disabled:opacity-50" disabled={adjusting} onClick={submitAdjustment}>{Number(delta) >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />} {adjusting ? "Saving..." : "Apply stock adjustment"}</button>
            </div>
            <div className="max-h-64 overflow-auto border border-border rounded-lg"><table className="w-full text-xs"><thead><tr className="border-b border-border text-left"><th className="p-2">Time</th><th className="p-2">Type</th><th className="p-2">Change</th><th className="p-2">Balance</th><th className="p-2">Reason</th></tr></thead><tbody>{movements.map((m) => <tr key={m.id} className="border-b border-border/50"><td className="p-2">{new Date(m.created_at).toLocaleString()}</td><td className="p-2">{m.movement_type}</td><td className="p-2">{m.quantity_delta > 0 ? "+" : ""}{m.quantity_delta}</td><td className="p-2">{m.quantity_after}</td><td className="p-2">{m.reason || "—"}</td></tr>)}</tbody></table></div>
          </div>}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between"><AdminToolbar><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" /><input className="pl-9 pr-3 py-2 rounded-lg border border-border bg-surface" placeholder="Search brands" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadBrands()} /></div></AdminToolbar><button className="inline-flex items-center gap-2 rounded-lg bg-brand text-white px-3 py-2" onClick={() => openBrand()}><Plus className="w-4 h-4" /> Add brand</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{brands.map((b) => <div key={b.id} className="rounded-xl border border-border p-4 space-y-3"><div className="flex items-start justify-between"><div className="flex items-center gap-3">{b.logo_url ? <img src={b.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain border border-border" /> : <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center"><Tags className="w-5 h-5 text-muted" /></div>}<div><div className="font-semibold">{b.name_en}</div><div className="text-xs text-muted">{b.name_bn || b.slug}</div></div></div><StatusBadge status={b.is_active ? "active" : "inactive"} /></div><div className="text-sm text-muted">Slug: {b.slug} · Products: {b.product_count}</div><div className="flex gap-2"><button className="px-2 py-1 rounded border border-border" onClick={() => openBrand(b)}>Edit</button><button className="px-2 py-1 rounded border border-border text-red-600" onClick={() => setArchiveBrand(b)}><Archive className="w-3.5 h-3.5 inline mr-1" />Archive</button></div></div>)}</div>
          {loading && <div className="p-8 flex items-center justify-center gap-2 text-muted"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>}
          {!brands.length && !loading && <div className="p-8 text-center text-muted">No brands found.</div>}
        </>
      )}

      {brandModal && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><div className="w-full max-w-2xl rounded-2xl bg-surface p-5 shadow-xl space-y-4"><h2 className="text-lg font-semibold">{editingBrand ? "Edit brand" : "Add brand"}</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[["slug","Slug"],["name_en","Name (English)"],["name_bn","Name (বাংলা)"],["logo_url","Logo URL"],["website_url","Website URL"],["sort_order","Sort order"]].map(([key,label]) => <label key={key} className="text-sm space-y-1"><span>{label}</span><input className="w-full rounded-lg border border-border p-2 bg-surface" value={(brandForm as Record<string, unknown>)[key] as string | number} onChange={(e) => setBrandForm((v) => ({ ...v, [key]: key === "sort_order" ? Number(e.target.value) : e.target.value }))} disabled={key === "slug" && !!editingBrand} /></label>)}</div><label className="text-sm space-y-1 block"><span>Description (English)</span><textarea className="w-full rounded-lg border border-border p-2 bg-surface" value={brandForm.description_en} onChange={(e) => setBrandForm((v) => ({ ...v, description_en: e.target.value }))} /></label><label className="text-sm space-y-1 block"><span>Description (বাংলা)</span><textarea className="w-full rounded-lg border border-border p-2 bg-surface" value={brandForm.description_bn} onChange={(e) => setBrandForm((v) => ({ ...v, description_bn: e.target.value }))} /></label><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={brandForm.is_active} onChange={(e) => setBrandForm((v) => ({ ...v, is_active: e.target.checked }))} /> Active</label><div className="flex justify-end gap-2"><button className="px-3 py-2 rounded border border-border" onClick={() => setBrandModal(false)}>Cancel</button><button className="px-3 py-2 rounded bg-brand text-white" onClick={saveBrand}>Save</button></div></div></div>}
      <ConfirmDialog open={!!archiveBrand} title="Archive brand?" description="This preserves the brand record and existing product data." confirmLabel="Archive" onConfirm={confirmArchive} onCancel={() => setArchiveBrand(null)} />
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="rounded-xl border border-border p-4 flex items-center justify-between"><div><div className="text-xs text-muted">{label}</div><div className="text-2xl font-semibold">{value.toLocaleString()}</div></div>{icon}</div>;
}
