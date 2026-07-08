"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, ShoppingCart, ChevronDown, X, Package, Download, CheckSquare, Square, ChevronRight } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { ordersApi, downloadCsv, downloadPdf } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatPrice, buildCustomerWhatsAppLink } from "@/lib/utils";
import { useToastStore } from "@/store/toast";

interface AdminOrderItem { product_name: string; quantity: number; product_price: number; subtotal: number; }
interface AdminOrder {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  customer_email?: string; delivery_address: string; payment_method: string; payment_status?: string;
  order_status: string; subtotal: number; delivery_charge: number; total: number;
  courier_provider?: string | null; courier_tracking_id?: string | null;
  notes?: string; items: AdminOrderItem[]; created_at: string;
}

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const COURIERS = ["pathao", "steadfast", "redx", "other"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [days, setDays] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  const [csvDays, setCsvDays] = useState(30);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [courierSaving, setCourierSaving] = useState(false);
  const [courierProvider, setCourierProvider] = useState("");
  const [courierTracking, setCourierTracking] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToastStore((s) => s.push);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const r = await ordersApi.list({ order_status: filter || undefined, search: search || undefined, days: days || undefined, page });
      setOrders((r.data.data ?? []) as unknown as AdminOrder[]);
      setTotal(r.data.meta?.total ?? 0);
      setLoadError(null);
    } catch (err) {
      setLoadError(apiErrorMessage(err, "Failed to load orders. Please retry."));
      console.error("Orders load error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, search, days, page]);

  useEffect(() => { load(); }, [load]);

  // Deep link: /admin/orders?open=<order_id> opens that order's detail directly
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("open");
    if (id) {
      openedFromUrl.current = true;
      openDetail(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search input
  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const r = await ordersApi.updateStatus(id, status);
      if (!r?.data?.data) {
        toast("error", "Failed to update order status");
        return;
      }
      await load();
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, order_status: status } : prev);
      toast("success", `Order status updated to ${status}`);
    } catch (err) {
      toast("error", "Failed to update order status");
      console.error("Status update error:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkUpdate = () => {
    if (!bulkStatus || selected.size === 0) return;
    setConfirmState({
      title: `Update ${selected.size} order${selected.size > 1 ? "s" : ""} to "${bulkStatus}"?`,
      message: `This will change the status of ${selected.size} selected order${selected.size > 1 ? "s" : ""}. This action cannot be undone.`,
      action: doBulkUpdate,
    });
  };

  const doBulkUpdate = async () => {
    setConfirmState(null);
    setBulkLoading(true);
    try {
      const r = await ordersApi.bulkUpdateStatus(Array.from(selected), bulkStatus);
      const updated = (r.data.data as { updated: number })?.updated ?? 0;
      toast("success", `${updated} orders updated to "${bulkStatus}"`);
      setBulkStatus("");
      await load();
    } catch {
      toast("error", "Bulk update failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCsvExport = async () => {
    setCsvLoading(true);
    try {
      await downloadCsv(`/api/v1/admin/bulk/export/orders?days=${csvDays}`, `orders_last${csvDays}days.csv`);
    } catch {
      toast("error", "CSV export failed");
    } finally {
      setCsvLoading(false);
    }
  };

  const handlePdfExport = async () => {
    setExportPdfLoading(true);
    try {
      await downloadPdf(`/api/v1/admin/bulk/export/orders/pdf?days=${csvDays}`, `orders_last${csvDays}days.pdf`);
    } catch {
      toast("error", "PDF export failed");
    } finally {
      setExportPdfLoading(false);
    }
  };

  const handleDownloadPdf = async (order: AdminOrder) => {
    setPdfLoading(order.id);
    try {
      await downloadPdf(
        `/api/v1/invoices/admin/orders/${order.id}/pdf`,
        `invoice-${order.order_number}.pdf`
      );
    } catch {
      toast("error", "PDF download failed");
    } finally {
      setPdfLoading(null);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await ordersApi.get(id);
      if (!r?.data?.data) {
        toast("error", "Order details not found in response");
        console.error("Empty order response", r);
        return;
      }
      const data = r.data.data as unknown as AdminOrder;
      if (!data.id || !data.order_number) {
        toast("error", "Invalid order data structure");
        console.error("Invalid order structure", data);
        return;
      }
      setDetail(data);
      setCourierProvider(data.courier_provider ?? "");
      setCourierTracking(data.courier_tracking_id ?? "");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast("error", `Failed to load order: ${errorMsg}`);
      console.error("Order detail error:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveCourier = async () => {
    if (!detail) return;
    setCourierSaving(true);
    try {
      await ordersApi.updateCourier(detail.id, {
        courier_provider: courierProvider || undefined,
        courier_tracking_id: courierTracking || undefined,
      });
      toast("success", "Courier info updated");
      await load();
      setDetail((prev) => prev ? {
        ...prev,
        courier_provider: courierProvider || null,
        courier_tracking_id: courierTracking || null,
        order_status: courierTracking && ["confirmed", "processing"].includes(prev.order_status) ? "shipped" : prev.order_status,
      } : prev);
    } catch {
      toast("error", "Could not update courier");
    } finally {
      setCourierSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map(o => o.id)));
    }
  };

  const allSelected = orders.length > 0 && selected.size === orders.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        title="Orders"
        titleBn="অর্ডার ব্যবস্থাপনা"
        description={`${total} total orders — status update, bulk actions, courier tracking`}
      />

      <AdminToolbar
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        searchPlaceholder="নাম, ফোন, অর্ডার#…"
      >
        <select value={days} onChange={(e) => { setDays(Number(e.target.value)); setPage(1); }} className="admin-input w-auto text-sm py-2" aria-label="Date range">
          <option value={0}>All time</option>
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="admin-input w-auto text-sm py-2">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <select
            value={csvDays}
            onChange={(e) => setCsvDays(Number(e.target.value))}
            className="admin-input w-auto text-sm py-2"
            title="Export range"
          >
            <option value={7}>7d</option>
            <option value={30}>30d</option>
            <option value={90}>90d</option>
            <option value={365}>1yr</option>
          </select>
          <button
            onClick={handleCsvExport}
            disabled={csvLoading}
            className="admin-btn-secondary !py-2 gap-1.5"
            title={`Export last ${csvDays} days`}
          >
            {csvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            CSV
          </button>
          <button
            onClick={handlePdfExport}
            disabled={exportPdfLoading}
            className="admin-btn-secondary !py-2 gap-1.5"
            title={`Export last ${csvDays} days as PDF`}
          >
            {exportPdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </button>
        </div>
      </AdminToolbar>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-brand-800">{selected.size} selected</span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
            className="input w-auto text-sm py-1"
          >
            <option value="">Set status…</option>
            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <button
            onClick={handleBulkUpdate}
            disabled={!bulkStatus || bulkLoading}
            className="btn btn-primary btn-sm gap-1"
          >
            {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Apply
          </button>
          <button onClick={() => setSelected(new Set())} className="btn btn-ghost btn-sm ml-auto">
            Clear
          </button>
        </div>
      )}

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : loadError ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-red-600 font-medium">অর্ডার লোড করা যায়নি — {loadError}</p>
            <button onClick={load} className="btn btn-outline btn-sm">Retry / আবার চেষ্টা করুন</button>
          </div>
        ) : orders.length === 0 ? (
          <AdminEmptyState
            icon={ShoppingCart}
            title="No orders found"
            description="Orders will appear here when customers checkout."
          />
        ) : (
          <>
          {/* Mobile card view — table stays untouched for sm+ screens */}
          <div className="sm:hidden divide-y divide-gray-50">
            {orders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => openDetail(o.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/80"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{o.customer_name}</p>
                  <p className="text-xs text-gray-400">{o.order_number} · {new Date(o.created_at).toLocaleDateString("en-BD")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(o.total)}</p>
                  <StatusBadge status={o.order_status} />
                </div>
              </button>
            ))}
          </div>
          <div className="overflow-x-auto hidden sm:block">
            <table className="table-premium min-w-[580px]">
              <thead>
                <tr>
                  <th className="px-4 py-3 w-8">
                    <button onClick={toggleAll} className="text-gray-400 hover:text-brand-600">
                      {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th className="hidden sm:table-cell">Payment</th>
                  <th>Total</th>
                  <th className="hidden md:table-cell">Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className={selected.has(o.id) ? "bg-brand-50/40" : ""}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleSelect(o.id)} className="text-gray-400 hover:text-brand-600">
                        {selected.has(o.id) ? <CheckSquare className="w-4 h-4 text-brand-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-5 py-3 cursor-pointer" onClick={() => openDetail(o.id)}>
                      <p className="font-medium text-gray-900">{o.order_number}</p>
                      <p className="text-xs text-gray-400">{o.items?.length ?? 0} items</p>
                    </td>
                    <td className="px-5 py-3 cursor-pointer" onClick={() => openDetail(o.id)}>
                      <p className="text-gray-900">{o.customer_name}</p>
                      <p className="text-xs text-gray-400">{o.customer_phone}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600 capitalize hidden sm:table-cell">{o.payment_method}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{formatPrice(o.total)}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">
                      {new Date(o.created_at).toLocaleDateString("en-BD")}
                    </td>
                    <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                      <div className="relative">
                        <select
                          value={o.order_status}
                          disabled={updatingId === o.id}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="appearance-none pl-2 pr-7 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                        <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </td>
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
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil(total / 20))}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {/* Order Detail Modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setDetail(null)}>
          <div className="rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-scale-in" style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {detail ? `Order ${detail.order_number}` : "Loading..."}
              </h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {detailLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
            ) : detail ? (
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <StatusBadge status={detail.order_status} />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(detail)}
                      disabled={pdfLoading === detail.id}
                      className="btn btn-outline btn-sm gap-1.5"
                    >
                      {pdfLoading === detail.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Invoice PDF
                    </button>
                    <select
                      value={detail.order_status}
                      disabled={updatingId === detail.id}
                      onChange={(e) => updateStatus(detail.id, e.target.value)}
                      className="input w-auto text-sm"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">Customer Info</h3>
                    <div className="flex gap-2">
                      <a href={`tel:${detail.customer_phone}`} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">📞 Call</a>
                      <a href={buildCustomerWhatsAppLink(detail.customer_phone, `Hello ${detail.customer_name}, your order ${detail.order_number} at ABO Enterprise (${formatPrice(detail.total)}) has been received. We will confirm shortly. Thank you!`)} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">💬 WhatsApp</a>
                      {detail.customer_email && <a href={`mailto:${detail.customer_email}`} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors font-medium">✉ Email</a>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Name</span><p className="font-medium">{detail.customer_name}</p></div>
                    <div><span className="text-gray-500">Phone</span><p className="font-medium">{detail.customer_phone}</p></div>
                    {detail.customer_email && <div className="col-span-2"><span className="text-gray-500">Email</span><p className="font-medium">{detail.customer_email}</p></div>}
                    <div className="col-span-2"><span className="text-gray-500">Address</span><p className="font-medium">{detail.delivery_address}</p></div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Items</h3>
                  <div className="space-y-2">
                    {detail.items?.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-brand-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                          <p className="text-xs text-gray-400">{formatPrice(item.product_price)} × {item.quantity}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatPrice(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(detail.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>{formatPrice(detail.delivery_charge)}</span></div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                    <span>Total</span><span className="text-accent-500">{formatPrice(detail.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 pt-1"><span>Payment</span><span className="capitalize">{detail.payment_method}</span></div>
                </div>

                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 text-sm">Courier / Delivery</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Provider</label>
                      <select value={courierProvider} onChange={(e) => setCourierProvider(e.target.value)} className="input text-sm mt-1">
                        <option value="">— Select —</option>
                        {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Tracking ID</label>
                      <input value={courierTracking} onChange={(e) => setCourierTracking(e.target.value)} className="input text-sm mt-1" placeholder="Consignment ID" />
                    </div>
                  </div>
                  <button type="button" onClick={saveCourier} disabled={courierSaving} className="btn btn-primary btn-sm gap-1">
                    {courierSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Save Courier
                  </button>
                </div>

                {detail.notes && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs text-amber-700 font-medium mb-1">Notes</p>
                    <p className="text-sm text-amber-900">{detail.notes}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel="Update"
        variant="warning"
        onConfirm={() => confirmState?.action()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
