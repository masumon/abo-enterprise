"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ShoppingCart, ChevronDown, X, Package } from "lucide-react";
import { ordersApi } from "@/lib/api";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatPrice } from "@/lib/utils";

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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ordersApi.list({ order_status: filter || undefined, page });
      setOrders((r.data.data ?? []) as unknown as AdminOrder[]);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

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

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await ordersApi.get(id);
      setDetail(r.data.data as unknown as AdminOrder);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total orders</p>
        </div>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No orders found</p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="cursor-pointer" onClick={() => openDetail(o.id)}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{o.order_number}</p>
                    <p className="text-xs text-gray-400">{o.items?.length ?? 0} items</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-900">{o.customer_name}</p>
                    <p className="text-xs text-gray-400">{o.customer_phone}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{o.payment_method}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{formatPrice(o.total)}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
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
                {/* Status */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={detail.order_status} />
                  <select
                    value={detail.order_status}
                    disabled={updatingId === detail.id}
                    onChange={(e) => updateStatus(detail.id, e.target.value)}
                    className="input w-auto text-sm"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Customer */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 text-sm">Customer Info</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Name</span><p className="font-medium">{detail.customer_name}</p></div>
                    <div><span className="text-gray-500">Phone</span><p className="font-medium">{detail.customer_phone}</p></div>
                    {detail.customer_email && <div className="col-span-2"><span className="text-gray-500">Email</span><p className="font-medium">{detail.customer_email}</p></div>}
                    <div className="col-span-2"><span className="text-gray-500">Address</span><p className="font-medium">{detail.delivery_address}</p></div>
                  </div>
                </div>

                {/* Items */}
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

                {/* Totals */}
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
    </div>
  );
}
