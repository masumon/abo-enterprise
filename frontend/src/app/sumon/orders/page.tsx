"use client";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2, ShoppingCart, ChevronDown, X, Package, Download, CheckSquare, Square, ChevronRight } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { ordersApi, downloadCsv, downloadPdf } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatPrice, buildCustomerWhatsAppLink, cn } from "@/lib/utils";
import { useToastStore } from "@/store/toast";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useAdminT } from "@/lib/i18n/adminText";

const ComposeEmailModal = dynamic(() => import("@/components/admin/ComposeEmailModal"), { ssr: false });

interface AdminOrderItem { product_name: string; quantity: number; product_price: number; subtotal: number; }
interface AdminOrder {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  customer_email?: string; delivery_address: string; payment_method: string; payment_status?: string;
  order_status: string; subtotal: number; delivery_charge: number; total: number;
  advance_amount?: number; advance_paid?: boolean;
  courier_provider?: string | null; courier_tracking_id?: string | null; courier_status?: string | null;
  refund_amount?: number | null; refund_method?: string | null; refund_note?: string | null; refunded_at?: string | null;
  courier_dispatch_at?: string | null; courier_error?: string | null;
  /** Institutional invoice identity (manual_sql/0009); all null on a personal order. */
  company_name?: string | null; company_bin?: string | null; company_tin?: string | null;
  po_number?: string | null; billing_address?: string | null;
  notes?: string; items: AdminOrderItem[]; created_at: string;
}

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
const COURIER_CHOICES: [string, string][] = [["steadfast", "Steadfast"], ["pathao", "Pathao"], ["redx", "RedX"]];
const REFUND_METHODS: [string, string][] = [["cash", "নগদ"], ["bkash", "bKash"], ["nagad", "Nagad"], ["rocket", "Rocket"], ["bank", "ব্যাংক"], ["card", "কার্ড"], ["other", "অন্যান্য"]];
const COURIERS = ["pathao", "steadfast", "redx", "other"];

export default function AdminOrdersPage() {
  const tx = useAdminT();
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
  const [composeEmail, setComposeEmail] = useState<{ to: string; subject: string; context: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [courierSaving, setCourierSaving] = useState(false);
  const [refundForm, setRefundForm] = useState<{ amount: string; method: string; note: string; restock: boolean } | null>(null);
  const [refundSaving, setRefundSaving] = useState(false);
  const [courierProvider, setCourierProvider] = useState("");
  const [courierTracking, setCourierTracking] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToastStore((s) => s.push);
  const detailRef = useFocusTrap(!!detail || detailLoading, () => setDetail(null));

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const r = await ordersApi.list({ order_status: filter || undefined, search: search || undefined, days: days || undefined, page });
      setOrders((r.data.data ?? []) as unknown as AdminOrder[]);
      setTotal(r.data.meta?.total ?? 0);
      setLoadError(null);
    } catch (err) {
      setLoadError(apiErrorMessage(err, "অর্ডার আনা যায়নি — আবার চেষ্টা করুন।"));
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

  // Courier AUTO: after "confirmed" the server sends in 15 s — show an undo bar meanwhile.
  const [pendingCourier, setPendingCourier] = useState<{ id: string; number: string; until: number } | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [courierChoice, setCourierChoice] = useState("steadfast");
  const [courierBusy, setCourierBusy] = useState(false);
  useEffect(() => {
    if (!pendingCourier) return;
    const t = setInterval(() => {
      setNowTick(Date.now());
      if (Date.now() > pendingCourier.until) { setPendingCourier(null); void load(); }
    }, 500);
    return () => clearInterval(t);
  }, [pendingCourier]); // eslint-disable-line react-hooks/exhaustive-deps
  const undoCourier = async () => {
    if (!pendingCourier) return;
    try {
      await ordersApi.courierUndo(pendingCourier.id);
      toast("success", "কুরিয়ারে পাঠানো বাতিল হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "বাতিল করা যায়নি"));
    } finally {
      setPendingCourier(null);
      void load();
    }
  };
  const sendCourier = async () => {
    if (!detail) return;
    setCourierBusy(true);
    try {
      const r = await ordersApi.courierSend(detail.id, courierChoice);
      const u = r.data.data as unknown as AdminOrder;
      setDetail((prev) => prev ? { ...prev, ...u, items: prev.items } : prev);
      toast("success", r.data.message || "কুরিয়ারে পাঠানো হয়েছে");
      void load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "কুরিয়ারে পাঠানো যায়নি"), { label: "কুরিয়ার সেটিং", href: `/sumon/couriers#${courierChoice}` });
    } finally {
      setCourierBusy(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const r = await ordersApi.updateStatus(id, status);
      if (!r?.data?.data) {
        toast("error", "অর্ডারের অবস্থা বদলানো যায়নি");
        return;
      }
      await load();
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, order_status: status } : prev);
      toast("success", `অর্ডারের অবস্থা বদলেছে: ${status}`);
      const upd = r.data.data as unknown as AdminOrder;
      if (upd?.courier_dispatch_at) {
        setNowTick(Date.now());
        setPendingCourier({ id, number: upd.order_number, until: new Date(upd.courier_dispatch_at).getTime() });
      }
    } catch (err) {
      toast("error", apiErrorMessage(err, "অর্ডারের অবস্থা বদলানো যায়নি"));
    } finally {
      setUpdatingId(null);
    }
  };

  const markAdvanceReceived = async (id: string) => {
    setUpdatingId(id);
    try {
      const r = await ordersApi.markAdvanceReceived(id);
      const updated = r?.data?.data;
      if (updated && detail?.id === id) {
        setDetail((prev) => prev ? { ...prev, advance_paid: true, order_status: updated.order_status ?? prev.order_status } : prev);
      }
      await load();
      toast("success", r?.data?.message || "Advance marked received");
    } catch (err) {
      toast("error", apiErrorMessage(err, "আপডেট করা যায়নি"));
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
      toast("error", "একসাথে আপডেট করা যায়নি");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCsvExport = async () => {
    setCsvLoading(true);
    try {
      await downloadCsv(`/api/v1/admin/bulk/export/orders?days=${csvDays}`, `orders_last${csvDays}days.csv`);
    } catch {
      toast("error", "CSV ডাউনলোড করা যায়নি");
    } finally {
      setCsvLoading(false);
    }
  };

  const handlePdfExport = async () => {
    setExportPdfLoading(true);
    try {
      await downloadPdf(`/api/v1/admin/bulk/export/orders/pdf?days=${csvDays}`, `orders_last${csvDays}days.pdf`);
    } catch {
      toast("error", "PDF তৈরি করা যায়নি");
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
      toast("error", "PDF ডাউনলোড করা যায়নি");
    } finally {
      setPdfLoading(null);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await ordersApi.get(id);
      if (!r?.data?.data) {
        toast("error", "অর্ডারের তথ্য পাওয়া যায়নি");
        return;
      }
      const data = r.data.data as unknown as AdminOrder;
      if (!data.id || !data.order_number) {
        toast("error", "অর্ডারের তথ্য ঠিক নেই");
        return;
      }
      setDetail(data);
      setCourierProvider(data.courier_provider ?? "");
      setCourierTracking(data.courier_tracking_id ?? "");
    } catch (err: unknown) {
      toast("error", `অর্ডার আনা যায়নি: ${apiErrorMessage(err, "অজানা সমস্যা")}`);
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
      toast("success", "কুরিয়ারের তথ্য আপডেট হয়েছে");
      await load();
      setDetail((prev) => prev ? {
        ...prev,
        courier_provider: courierProvider || null,
        courier_tracking_id: courierTracking || null,
        order_status: courierTracking && ["confirmed", "processing"].includes(prev.order_status) ? "shipped" : prev.order_status,
      } : prev);
    } catch (err) {
      toast("error", apiErrorMessage(err, "কুরিয়ারের তথ্য বদলানো যায়নি"));
    } finally {
      setCourierSaving(false);
    }
  };

  const saveRefund = async () => {
    if (!detail || !refundForm) return;
    const amount = Number(refundForm.amount);
    if (!(amount > 0)) { toast("error", "রিফান্ডের টাকার পরিমাণ লিখুন"); return; }
    setRefundSaving(true);
    try {
      const r = await ordersApi.refund(detail.id, { amount, method: refundForm.method, note: refundForm.note, restock: refundForm.restock });
      const u = r.data.data as unknown as AdminOrder;
      setDetail((prev) => prev ? { ...prev, ...u, items: prev.items } : prev);
      setOrders((prev) => prev.map((o) => o.id === detail.id ? { ...o, order_status: u.order_status, payment_status: u.payment_status } : o));
      setRefundForm(null);
      toast("success", "রিফান্ড সংরক্ষিত হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "রিফান্ড সংরক্ষণ করা যায়নি"));
    } finally {
      setRefundSaving(false);
    }
  };

  const [steadfastSending, setSteadfastSending] = useState(false);
  const sendToSteadfast = async () => {
    if (!detail) return;
    setSteadfastSending(true);
    try {
      const res = await ordersApi.sendToSteadfast(detail.id);
      const updated = res.data.data as unknown as AdminOrder | undefined;
      const tracking = updated?.courier_tracking_id ?? "";
      toast("success", `Steadfast-এ পাঠানো হয়েছে — ট্র্যাকিং ${tracking}`);
      await load();
      setDetail((prev) => prev ? {
        ...prev,
        courier_provider: "steadfast",
        courier_tracking_id: tracking,
        order_status: updated?.order_status ?? prev.order_status,
      } : prev);
      setCourierProvider("steadfast");
      setCourierTracking(tracking);
    } catch (e) {
      // Axios Error.message hides FastAPI detail behind "Request failed with status code 502".
      toast("error", apiErrorMessage(e, "Steadfast-এ পাঠানো যায়নি"));
    } finally {
      setSteadfastSending(false);
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
    <div className="admin-page">
      <AdminPageHeader
        title="Orders"
        titleBn="অর্ডার ব্যবস্থাপনা"
        description={`${total} total orders — status update, bulk actions, courier tracking`}
        descriptionBn={`মোট ${String(total).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d])}টি অর্ডার — স্ট্যাটাস আপডেট, একসাথে অ্যাকশন, কুরিয়ার ট্র্যাকিং`}
      />

      <AdminToolbar
        searchValue={searchInput}
        onSearchChange={handleSearchChange}
        searchPlaceholder="নাম, ফোন, অর্ডার#…"
      >
        <select value={days} onChange={(e) => { setDays(Number(e.target.value)); setPage(1); }} className="admin-input w-auto text-sm py-2" aria-label={tx("Date range")}>
          <option value={0}>{tx("All time")}</option>
          <option value={1}>{tx("Today")}</option>
          <option value={7}>{tx("Last 7 days")}</option>
          <option value={30}>{tx("Last 30 days")}</option>
          <option value={90}>{tx("Last 90 days")}</option>
        </select>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="admin-input w-auto text-sm py-2">
          <option value="">{tx("All Status")}</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <select
            value={csvDays}
            onChange={(e) => setCsvDays(Number(e.target.value))}
            className="admin-input w-auto text-sm py-2"
            title={tx("Export range")}
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
            <option value="">{tx("Set status…")}</option>
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
            {tx("Clear")}
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
            title={tx("No orders found")}
            description={tx("Orders will appear here when customers checkout.")}
          />
        ) : (
          <>
          {/* Mobile card view — table stays untouched for sm+ screens */}
          <div className="min-[641px]:hidden divide-y divide-gray-50">
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
          <div className="overflow-x-auto hidden min-[641px]:block">
            <table className="table-premium min-w-[580px]">
              <thead>
                <tr>
                  <th className="px-4 py-3 w-8">
                    <button type="button" onClick={toggleAll} aria-label={allSelected ? "সব বাছাই তুলুন" : "সব অর্ডার বাছুন"} className="text-gray-400 hover:text-brand-600">
                      {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th>{tx("Order")}</th>
                  <th>{tx("Customer")}</th>
                  <th className="hidden sm:table-cell">{tx("Payment")}</th>
                  <th>{tx("Total")}</th>
                  <th className="hidden md:table-cell">{tx("Date")}</th>
                  <th>{tx("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className={selected.has(o.id) ? "bg-brand-50/40" : ""}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button type="button" onClick={() => toggleSelect(o.id)} aria-label={`অর্ডার ${o.order_number} বাছুন`} aria-pressed={selected.has(o.id)} className="text-gray-400 hover:text-brand-600">
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
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm">{tx("Previous")}</button>
          <span className="px-4 py-2 text-sm text-gray-600">{tx("Page")} {page} / {Math.max(1, Math.ceil(total / 20))}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">{tx("Next")}</button>
        </div>
      )}

      {pendingCourier && (
        <div role="status" className="fixed inset-x-3 bottom-3 sm:left-auto sm:right-6 sm:w-[26rem] z-[60] rounded-2xl bg-gray-900 text-white shadow-2xl p-3 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin flex-none" aria-hidden />
          <p className="flex-1 text-sm">
            #{pendingCourier.number} কুরিয়ারে যাবে <b>{Math.max(0, Math.ceil((pendingCourier.until - nowTick) / 1000)).toLocaleString("bn-BD")}</b> সেকেন্ডে
          </p>
          <button type="button" onClick={undoCourier} className="btn btn-sm min-h-11 bg-white text-gray-900 hover:bg-gray-100">↶ ফিরিয়ে নিন</button>
          <button type="button" onClick={undoCourier} aria-label="বাতিল" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* Order Detail Modal */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 max-[640px]:items-end max-[640px]:p-0"
          style={ADMIN_MODAL_BACKDROP_STYLE}
          onClick={() => setDetail(null)}
          role="dialog"
          aria-modal="true"
          aria-label={tx("Order details")}
        >
          <div
            ref={detailRef}
            className="rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-scale-in max-[640px]:max-h-[94dvh] max-[640px]:rounded-b-none max-[640px]:rounded-t-2xl"
            style={ADMIN_MODAL_PANEL_STYLE}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {detail ? `Order ${detail.order_number}` : "Loading..."}
              </h2>
              <button aria-label="বন্ধ করুন" type="button" onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
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
                    <h3 className="font-semibold text-gray-900 text-sm">{tx("Customer Info")}</h3>
                    <div className="flex gap-2">
                      <a href={`tel:${detail.customer_phone}`} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">📞 Call</a>
                      <a href={buildCustomerWhatsAppLink(detail.customer_phone, `Hello ${detail.customer_name}, your order ${detail.order_number} at ABO Enterprise (${formatPrice(detail.total)}) has been received. We will confirm shortly. Thank you!`)} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">💬 WhatsApp</a>
                      {detail.customer_email && (
                        <button
                          type="button"
                          onClick={() => setComposeEmail({ to: detail.customer_email!, subject: `Regarding your order ${detail.order_number}`, context: `Order ${detail.order_number}` })}
                          title={tx("Compose and send an email to the customer from no-reply@aboenterprise.com")}
                          className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                        >
                          ✉ Email
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">{tx("Name")}</span><p className="font-medium">{detail.customer_name}</p></div>
                    <div><span className="text-gray-500">{tx("Phone")}</span><p className="font-medium">{detail.customer_phone}</p></div>
                    {detail.customer_email && <div className="col-span-2"><span className="text-gray-500">{tx("Email")}</span><p className="font-medium">{detail.customer_email}</p></div>}
                    <div className="col-span-2"><span className="text-gray-500">{tx("Address")}</span><p className="font-medium">{detail.delivery_address}</p></div>
                    {/* X4 — an institutional order must be recognisable here,
                        or the invoice goes out in the wrong name. */}
                    {detail.company_name && <div className="col-span-2"><span className="text-gray-500">{tx("Company")}</span><p className="font-medium">{detail.company_name}</p></div>}
                    {detail.company_bin && <div><span className="text-gray-500">BIN</span><p className="font-medium font-mono">{detail.company_bin}</p></div>}
                    {detail.company_tin && <div><span className="text-gray-500">TIN</span><p className="font-medium font-mono">{detail.company_tin}</p></div>}
                    {detail.po_number && <div className="col-span-2"><span className="text-gray-500">PO number</span><p className="font-medium font-mono">{detail.po_number}</p></div>}
                    {detail.billing_address && <div className="col-span-2"><span className="text-gray-500">{tx("Billing address")}</span><p className="font-medium whitespace-pre-line">{detail.billing_address}</p></div>}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">{tx("Items")}</h3>
                  <div className="space-y-2">
                    {detail.items?.map((item, i) => {
                      // Combo lines are stored with a "[Combo] " name prefix
                      // (backend orders.py); surface them as a distinct bundle
                      // row so staff never mistake one for a single product.
                      const isCombo = item.product_name.startsWith("[Combo] ");
                      const displayName = isCombo ? item.product_name.slice(8) : item.product_name;
                      return (
                        <div key={i} className={cn("flex items-center gap-3 py-2 border-b border-gray-50 last:border-0", isCombo && "-mx-2 px-2 rounded-lg bg-accent-50/60")}>
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", isCombo ? "bg-accent-100" : "bg-brand-50")}>
                            <Package className={cn("w-4 h-4", isCombo ? "text-accent-600" : "text-brand-400")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {isCombo && <span className="mr-1.5 align-middle inline-block px-1.5 py-0.5 rounded bg-accent-500 text-[#14182b] text-[10px] font-bold">COMBO</span>}
                              {displayName}
                            </p>
                            <p className="text-xs text-gray-400">{formatPrice(item.product_price)} × {item.quantity}</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{formatPrice(item.subtotal)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{tx("Subtotal")}</span><span>{formatPrice(detail.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{tx("Delivery")}</span><span>{formatPrice(detail.delivery_charge)}</span></div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                    <span>{tx("Total")}</span><span className="text-accent-500">{formatPrice(detail.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 pt-1"><span>{tx("Payment")}</span><span className="capitalize">{detail.payment_method}</span></div>
                  {(detail.advance_amount ?? 0) > 0 && (
                    <div className={`mt-2 rounded-lg px-3 py-2 text-xs border flex items-center justify-between gap-2 ${detail.advance_paid ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                      <span>
                        {detail.advance_paid
                          ? `✓ Advance ${formatPrice(detail.advance_amount ?? 0)} received`
                          : `Advance ${formatPrice(detail.advance_amount ?? 0)} pending`}
                      </span>
                      {!detail.advance_paid && (
                        <button type="button" onClick={() => markAdvanceReceived(detail.id)} disabled={updatingId === detail.id} className="btn btn-brand btn-xs disabled:opacity-60 whitespace-nowrap">
                          {updatingId === detail.id ? "…" : "Mark received"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{tx("Courier / Delivery")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">{tx("Provider")}</label>
                      <select value={courierProvider} onChange={(e) => setCourierProvider(e.target.value)} className="input text-sm mt-1">
                        <option value="">— Select —</option>
                        {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">{tx("Tracking ID")}</label>
                      <input value={courierTracking} onChange={(e) => setCourierTracking(e.target.value)} className="input text-sm mt-1" placeholder={tx("Consignment ID")} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={saveCourier} disabled={courierSaving} className="btn btn-primary btn-sm gap-1">
                      {courierSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Save Courier
                    </button>
                    {detail.courier_tracking_id ? (
                      <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 font-medium">
                        ✓ {detail.courier_provider ?? "courier"}: {detail.courier_tracking_id}
                        {detail.courier_status ? ` · ${detail.courier_status.replace(/_/g, " ")}` : ""}
                      </span>
                    ) : (
                      <span className="inline-flex flex-wrap items-center gap-2">
                      <select value={courierChoice} onChange={(e) => setCourierChoice(e.target.value)} className="input text-sm min-h-11 w-auto" aria-label="কুরিয়ার বাছুন">
                        {COURIER_CHOICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={sendCourier}
                        disabled={courierBusy || ["cancelled", "delivered", "returned"].includes(detail.order_status)}
                        className="btn btn-sm min-h-11 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                        title="কুরিয়ারে পার্সেল বুক করুন"
                      >
                        {courierBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        কুরিয়ারে পাঠান
                      </button>
                      </span>
                    )}
                    {detail.courier_error && !detail.courier_tracking_id && (
                      <p className="w-full text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">⚠️ {detail.courier_error}{" "}
                        <a href={`/sumon/couriers#${detail.courier_provider || courierChoice}`} className="underline font-medium">কুরিয়ার সেটিং ঠিক করুন →</a></p>
                    )}
                  </div>
                </div>

                {/* Refund / return — money is only recorded here; the shop sends it by cash/bKash/bank. */}
                {(() => {
                  const refunded = Number(detail.refund_amount ?? 0);
                  const left = Math.max(0, Number(detail.total) - refunded);
                  return (
                    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900 flex-1">রিফান্ড / ফেরত</p>
                        {refunded > 0 && <span className="text-sm text-orange-800">ফেরত দেওয়া হয়েছে: <b>{formatPrice(refunded)}</b></span>}
                      </div>
                      {detail.refund_note && <p className="text-xs text-gray-700 whitespace-pre-line">{detail.refund_note}</p>}
                      {!refundForm ? (
                        left > 0 && (
                          <button type="button" className="btn btn-outline btn-sm min-h-11"
                            onClick={() => setRefundForm({ amount: String(left), method: "cash", note: "", restock: false })}>
                            {refunded > 0 ? "আরও রিফান্ড দিন" : "রিফান্ড / ফেরত নিন"}
                          </button>
                        )
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <label className="text-sm">কত টাকা ফেরত দিচ্ছেন (সর্বোচ্চ {formatPrice(left)})
                            <input type="number" inputMode="decimal" min={1} max={left} className="input w-full min-h-11 text-base"
                              value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} />
                          </label>
                          <label className="text-sm">কীভাবে ফেরত দিয়েছেন
                            <select className="input w-full min-h-11 text-base" value={refundForm.method}
                              onChange={(e) => setRefundForm({ ...refundForm, method: e.target.value })}>
                              {REFUND_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </label>
                          <label className="text-sm sm:col-span-2">কারণ / নোট (ঐচ্ছিক)
                            <input className="input w-full min-h-11 text-base" value={refundForm.note} maxLength={500}
                              placeholder="যেমন: পণ্য ভাঙা ছিল, ট্রানজেকশন আইডি…" onChange={(e) => setRefundForm({ ...refundForm, note: e.target.value })} />
                          </label>
                          <label className="flex items-start gap-2 text-sm sm:col-span-2 min-h-11">
                            <input type="checkbox" className="w-5 h-5 mt-0.5" checked={refundForm.restock}
                              onChange={(e) => setRefundForm({ ...refundForm, restock: e.target.checked })} />
                            পণ্য ফেরত এসেছে — স্টকে যোগ করুন ও অর্ডারকে “Returned” করুন
                          </label>
                          <p className="text-xs text-gray-600 sm:col-span-2">টাকা আপনি নিজে পাঠাবেন (নগদ/bKash/ব্যাংক)। এখানে শুধু হিসাব রাখা হয় — রিপোর্টে আয় থেকে এই টাকা বাদ যাবে।</p>
                          <div className="flex gap-2 sm:col-span-2">
                            <button type="button" className="btn btn-brand min-h-11" disabled={refundSaving} onClick={saveRefund}>
                              {refundSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "সংরক্ষণ করুন"}
                            </button>
                            <button type="button" className="btn btn-outline min-h-11" onClick={() => setRefundForm(null)}>বাতিল</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {detail.notes && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs text-amber-700 font-medium mb-1">{tx("Notes")}</p>
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
        confirmLabel={tx("Update")}
        variant="warning"
        onConfirm={() => confirmState?.action()}
        onCancel={() => setConfirmState(null)}
      />

      <ComposeEmailModal
        open={!!composeEmail}
        onClose={() => setComposeEmail(null)}
        to={composeEmail?.to ?? ""}
        defaultSubject={composeEmail?.subject ?? ""}
        contextLabel={composeEmail?.context}
      />
    </div>
  );
}
