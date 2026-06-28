"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, ShoppingCart, ChevronDown, X, Package, Search, Download, CheckSquare, Square, ChevronRight } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { ordersApi, downloadCsv, downloadPdf } from "@/lib/api";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatPrice } from "@/lib/utils";
import { useToastStore } from "@/store/toast";

interface AdminOrderItem { product_name: string; quantity: number; product_price: number; subtotal: number; }
interface AdminOrder {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  customer_email?: string; delivery_address: string; payment_method: string;
  order_status: string; subtotal: number; delivery_charge: number; total: number;
  notes?: string; items: AdminOrderItem[]; created_at: string;
}

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
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
  const [csvDays, setCsvDays] = useState(30);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToastStore((s) => s.push);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const r = await ordersApi.list({ order_status: filter || undefined, search: search || undefined, page });
      setOrders((r.data.data ?? []) as unknown as AdminOrder[]);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => { load(); }, [load]);

  // Debounce search input
  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await ordersApi.updateStatus(id, status);
      await load();
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, order_status: status } : prev);
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
      setDetail(r.data.data as unknown as AdminOrder);
    } finally {
      setDetailLoading(false);
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
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total orders</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search name, phone, order#…"
              className="input pl-9 text-sm w-full sm:w-56"
            />
          </div>
          {/* Status filter */}
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="input w-auto text-sm">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          {/* CSV export */}
          <div className="flex items-center gap-1">
            <select
              value={csvDays}
              onChange={(e) => setCsvDays(Number(e.target.value))}
              className="input w-auto text-sm py-1.5 px-2"
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
              className="btn btn-outline btn-sm gap-1.5"
              title={`Export last ${csvDays} days to CSV`}
            >
              {csvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              CSV
            </button>
          </div>
        </div>
      </div>

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
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
          <button disabled={orders.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
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
