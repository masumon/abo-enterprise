"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Truck } from "lucide-react";
import { ordersApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";
import type { Order } from "@/types";

// Steadfast's own status vocabulary (core/steadfast.py ALL_KNOWN_STATUSES) —
// courier_status is NULL until the delivery-status webhook reports the first
// update, so "No status yet" covers orders sent to the courier before the
// webhook was configured, or awaiting Steadfast's first callback.
const STATUS_STYLE: Record<string, string> = {
  delivered: "bg-green-50 text-green-700",
  partial_delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  hold: "bg-amber-50 text-amber-700",
  in_review: "bg-amber-50 text-amber-700",
  unknown: "bg-gray-100 text-gray-600",
  pending: "bg-brand-50 text-brand-700",
};

const STATUS_OPTIONS = [
  "pending", "in_review", "hold", "delivered", "partial_delivered", "cancelled", "unknown",
];

export default function AdminTrackingPage() {
  const toast = useToastStore((s) => s.push);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ordersApi.list({
        has_courier: true,
        courier_status: statusFilter || undefined,
        page,
        per_page: PER_PAGE,
      });
      setOrders(r.data.data ?? []);
      setTotal(r.data.meta?.total ?? 0);
    } catch (err) {
      setOrders([]);
      toast("error", apiErrorMessage(err, "Failed to load courier tracking"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Courier Tracking"
        titleBn="কুরিয়ার ট্র্যাকিং"
        description="Every order handed to a courier, with its last reported delivery status"
        descriptionBn="কুরিয়ারে পাঠানো সব অর্ডার এবং তাদের সর্বশেষ ডেলিভারি স্ট্যাটাস"
        actions={
          <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-brand-700">
            <Truck className="w-4 h-4" />
            <span className="text-sm font-semibold">{total} shipped</span>
          </div>
        }
      />

      <AdminToolbar>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="admin-input w-auto text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </AdminToolbar>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No orders with this courier status</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium table-responsive min-w-[560px]">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Tracking ID</th>
                  <th>Courier Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-3" data-label="Order">
                      <Link href={`/sumon/orders?open=${o.id}`} className="font-medium text-brand-600 hover:underline">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3" data-label="Customer">
                      <p className="text-gray-900">{o.customer_name}</p>
                      <p className="text-xs text-gray-400">{o.customer_phone}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600" data-label="Tracking ID">{o.courier_tracking_id || "—"}</td>
                    <td className="px-5 py-3" data-label="Courier Status">
                      {o.courier_status ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[o.courier_status] ?? "bg-gray-100 text-gray-600"}`}>
                          {o.courier_status.replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400" title="The courier hasn't sent an update yet — this is normal right after handoff, not a problem.">No status yet</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap" data-label="Updated">
                      {o.updated_at ? new Date(o.updated_at).toLocaleDateString("en-BD") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PER_PAGE && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
          <button disabled={orders.length < PER_PAGE} onClick={() => setPage((p) => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}
    </div>
  );
}
