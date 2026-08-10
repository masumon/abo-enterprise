"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Truck, AlertCircle, CheckCircle2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/apiBase";
import { getAdminToken } from "@/lib/adminAuth";

export default function CourierSyncPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const sync = async () => {
    const number = orderNumber.trim();
    if (!number) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    setResult(null);
    try {
      const token = getAdminToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const base = getApiBaseUrl();
      const list = await fetch(`${base}/api/v1/orders?search=${encodeURIComponent(number)}&per_page=10`, {
        credentials: "include",
        headers,
        cache: "no-store",
      });
      const listJson = await list.json().catch(() => null) as { data?: Array<{ id: string; order_number: string }> ; detail?: string } | null;
      if (!list.ok) throw new Error(listJson?.detail || `Order lookup failed (HTTP ${list.status})`);
      const order = listJson?.data?.find((item) => item.order_number === number) ?? listJson?.data?.[0];
      if (!order?.id) throw new Error("Order not found");

      const response = await fetch(`${base}/api/v1/courier/orders/${order.id}/steadfast/sync`, {
        method: "POST",
        credentials: "include",
        headers,
      });
      const json = await response.json().catch(() => null) as { data?: Record<string, unknown>; message?: string; detail?: string } | null;
      if (!response.ok) throw new Error(json?.detail || `Courier sync failed (HTTP ${response.status})`);
      setResult(json?.data ?? null);
      setMessage(json?.message || "Courier status synchronized from Steadfast.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Courier synchronization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="admin-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-700"><Truck className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Courier Status Sync</h1>
            <p className="text-sm text-gray-500 mt-1">Steadfast-এর আসল API response পড়ে order status synchronize করুন। কোনো tracking ID তৈরি করা হয় না।</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ABO-202608-ABC123" className="admin-input flex-1" />
          <button type="button" onClick={sync} disabled={loading || !orderNumber.trim()} className="admin-btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? "Syncing…" : "Sync Steadfast Status"}
          </button>
        </div>
      </div>

      {error && <div className="admin-card p-5 border border-red-200 bg-red-50 text-red-800 flex gap-3"><AlertCircle className="w-5 h-5 shrink-0" /><div><p className="font-semibold">Sync failed</p><p className="text-sm mt-1 break-words">{error}</p></div></div>}
      {message && <div className="admin-card p-5 border border-green-200 bg-green-50 text-green-800 flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" /><div><p className="font-semibold">Sync completed</p><p className="text-sm mt-1">{message}</p></div></div>}
      {result && <div className="admin-card p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div><span className="text-gray-500">Provider status</span><p className="font-semibold mt-1">{String(result.provider_status ?? "—")}</p></div>
        <div><span className="text-gray-500">Order status</span><p className="font-semibold mt-1">{String(result.order_status ?? "—")}</p></div>
        <div><span className="text-gray-500">Tracking</span><p className="font-semibold mt-1 break-all">{String(result.tracking_id ?? "—")}</p></div>
      </div>}
    </div>
  );
}
