"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Briefcase, ChevronDown, X, Search, Download } from "lucide-react";
import { bookingsApi, serviceBookingsAdminApi, downloadCsv } from "@/lib/api";
import type { Booking, BookingV2 } from "@/types";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToastStore } from "@/store/toast";

const STATUSES_V1 = ["pending", "contacted", "in_progress", "completed", "cancelled"];
const STATUSES_V2 = ["pending", "in_progress", "completed", "cancelled", "on_hold"];
const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "refunded"];
const SERVICE_TYPES = ["printing", "legal", "web_development", "ai_solutions", "automation", "software"];

interface AdminBooking extends Booking {
  booking_number: string;
  created_at: string;
}

export default function AdminBookingsPage() {
  const [tab, setTab] = useState<"v1" | "v2">("v2");

  // V1 state
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminBooking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // V2 state
  const [bookingsV2, setBookingsV2] = useState<BookingV2[]>([]);
  const [loadingV2, setLoadingV2] = useState(false);
  const [statusFilterV2, setStatusFilterV2] = useState("");
  const [paymentFilterV2, setPaymentFilterV2] = useState("");
  const [pageV2, setPageV2] = useState(1);
  const [totalV2, setTotalV2] = useState(0);
  const [updatingIdV2, setUpdatingIdV2] = useState<string | null>(null);
  const [detailV2, setDetailV2] = useState<BookingV2 | null>(null);

  const toast = useToastStore((s) => s.push);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await bookingsApi.list({ service_type: typeFilter || undefined, status: statusFilter || undefined, search: search || undefined, page });
      setBookings((r.data.data ?? []) as unknown as AdminBooking[]);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search, page]);

  const loadV2 = useCallback(async () => {
    setLoadingV2(true);
    try {
      const r = await serviceBookingsAdminApi.list({ status: statusFilterV2 || undefined, payment_status: paymentFilterV2 || undefined, page: pageV2 });
      setBookingsV2(r.data.data ?? []);
      setTotalV2(r.data.meta?.total ?? 0);
    } finally {
      setLoadingV2(false);
    }
  }, [statusFilterV2, paymentFilterV2, pageV2]);

  useEffect(() => { if (tab === "v1") load(); }, [load, tab]);
  useEffect(() => { if (tab === "v2") loadV2(); }, [loadV2, tab]);

  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 400);
  };

  const handleCsvExport = async () => {
    setCsvLoading(true);
    try {
      await downloadCsv("/api/v1/admin/bulk/export/bookings", "bookings.csv");
    } catch {
      toast("error", "CSV export failed");
    } finally {
      setCsvLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await bookingsApi.updateStatus(id, status);
      await load();
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: status as AdminBooking["status"] } : prev);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateStatusV2 = async (id: string, status: string) => {
    setUpdatingIdV2(id);
    try {
      await serviceBookingsAdminApi.updateStatus(id, status);
      await loadV2();
      if (detailV2?.id === id) setDetailV2(prev => prev ? { ...prev, status } : prev);
    } finally {
      setUpdatingIdV2(null);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await bookingsApi.get(id);
      setDetail(r.data.data as unknown as AdminBooking);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">{tab === "v1" ? total : totalV2} total bookings</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tab === "v1" && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  value={searchInput}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="Search name, phone, booking#…"
                  className="input pl-9 text-sm w-56"
                />
              </div>
              <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input w-auto text-sm">
                <option value="">All Services</option>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto text-sm">
                <option value="">All Status</option>
                {STATUSES_V1.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
              <button
                onClick={handleCsvExport}
                disabled={csvLoading}
                className="btn btn-outline btn-sm gap-1.5"
                title="Export all bookings to CSV"
              >
                {csvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                CSV
              </button>
            </>
          )}
          {tab === "v2" && (
            <>
              <select value={statusFilterV2} onChange={(e) => { setStatusFilterV2(e.target.value); setPageV2(1); }} className="input w-auto text-sm">
                <option value="">All Status</option>
                {STATUSES_V2.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
              <select value={paymentFilterV2} onChange={(e) => { setPaymentFilterV2(e.target.value); setPageV2(1); }} className="input w-auto text-sm">
                <option value="">All Payment</option>
                {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("v1")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "v1" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Simple Bookings
        </button>
        <button
          onClick={() => setTab("v2")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "v2" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Service Bookings
        </button>
      </div>

      {/* V1 Table */}
      {tab === "v1" && (
        <div className="admin-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No bookings found</p>
            </div>
          ) : (
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="cursor-pointer" onClick={() => openDetail(b.id!)}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{b.booking_number}</p>
                      {b.service_subtype && <p className="text-xs text-gray-400">{b.service_subtype.replace(/_/g, " ")}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-900">{b.customer_name}</p>
                      <p className="text-xs text-gray-400">{b.customer_phone}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600 capitalize">{b.service_type.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString("en-BD")}
                    </td>
                    <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                      <div className="relative">
                        <select
                          value={b.status ?? "pending"}
                          disabled={updatingId === b.id}
                          onChange={(e) => updateStatus(b.id!, e.target.value)}
                          className="appearance-none pl-2 pr-7 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          {STATUSES_V1.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
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
      )}

      {/* V2 Table */}
      {tab === "v2" && (
        <div className="admin-card overflow-hidden">
          {loadingV2 ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
          ) : bookingsV2.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No service bookings found</p>
            </div>
          ) : (
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Pricing</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookingsV2.map((b) => (
                  <tr key={b.id} className="cursor-pointer" onClick={() => setDetailV2(b)}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{b.booking_number}</p>
                      <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString("en-BD")}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-900">{b.customer_name}</p>
                      <p className="text-xs text-gray-400">{b.customer_phone}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-800">{b.service_name}</p>
                      {b.service_tier && <p className="text-xs text-gray-400">{b.service_tier}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <p className="capitalize text-xs">{b.pricing_type}</p>
                      <p className="font-medium text-gray-900">
                        {b.final_price != null ? `৳${b.final_price.toLocaleString()}` : b.quoted_price != null ? `৳${b.quoted_price.toLocaleString()}` : "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        b.payment_status === "paid" ? "bg-green-100 text-green-700" :
                        b.payment_status === "partial" ? "bg-yellow-100 text-yellow-700" :
                        b.payment_status === "refunded" ? "bg-purple-100 text-purple-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                      <div className="relative">
                        <select
                          value={b.status}
                          disabled={updatingIdV2 === b.id}
                          onChange={(e) => updateStatusV2(b.id, e.target.value)}
                          className="appearance-none pl-2 pr-7 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          {STATUSES_V2.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
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
      )}

      {/* Pagination */}
      {tab === "v1" && total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
          <button disabled={bookings.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}
      {tab === "v2" && totalV2 > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={pageV2 === 1} onClick={() => setPageV2(p => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {pageV2}</span>
          <button disabled={bookingsV2.length < 20} onClick={() => setPageV2(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {/* V1 Booking Detail Modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setDetail(null)}>
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in" style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {detail ? `Booking ${detail.booking_number}` : "Loading..."}
              </h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {detailLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
            ) : detail ? (
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
                <div className="flex items-center justify-between">
                  <StatusBadge status={detail.status ?? "pending"} />
                  <select
                    value={detail.status ?? "pending"}
                    disabled={updatingId === detail.id}
                    onChange={(e) => updateStatus(detail.id!, e.target.value)}
                    className="input w-auto text-sm"
                  >
                    {STATUSES_V1.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Customer Info</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-gray-500 text-xs">Name</p><p className="font-medium">{detail.customer_name}</p></div>
                    <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{detail.customer_phone}</p></div>
                    {detail.customer_email && (
                      <div className="col-span-2"><p className="text-gray-500 text-xs">Email</p><p className="font-medium">{detail.customer_email}</p></div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Service Info</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-gray-500 text-xs">Service Type</p><p className="font-medium capitalize">{detail.service_type.replace(/_/g, " ")}</p></div>
                    {detail.service_subtype && (
                      <div><p className="text-gray-500 text-xs">Sub-type</p><p className="font-medium capitalize">{detail.service_subtype.replace(/_/g, " ")}</p></div>
                    )}
                    <div><p className="text-gray-500 text-xs">Date</p><p className="font-medium">{new Date(detail.created_at).toLocaleDateString("en-BD")}</p></div>
                  </div>
                  {detail.details && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-gray-500 text-xs mb-1">Details</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{detail.details}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* V2 Booking Detail Modal */}
      {detailV2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setDetailV2(null)}>
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in" style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Booking {detailV2.booking_number}</h2>
              <button onClick={() => setDetailV2(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              <div className="flex items-center justify-between">
                <StatusBadge status={detailV2.status} />
                <select
                  value={detailV2.status}
                  disabled={updatingIdV2 === detailV2.id}
                  onChange={(e) => updateStatusV2(detailV2.id, e.target.value)}
                  className="input w-auto text-sm"
                >
                  {STATUSES_V2.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Customer</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Name</p><p className="font-medium">{detailV2.customer_name}</p></div>
                  <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{detailV2.customer_phone}</p></div>
                  {detailV2.customer_email && <div><p className="text-gray-500 text-xs">Email</p><p className="font-medium">{detailV2.customer_email}</p></div>}
                  {detailV2.customer_company && <div><p className="text-gray-500 text-xs">Company</p><p className="font-medium">{detailV2.customer_company}</p></div>}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Service & Pricing</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Service</p><p className="font-medium">{detailV2.service_name}</p></div>
                  {detailV2.service_tier && <div><p className="text-gray-500 text-xs">Tier</p><p className="font-medium">{detailV2.service_tier}</p></div>}
                  <div><p className="text-gray-500 text-xs">Pricing Type</p><p className="font-medium capitalize">{detailV2.pricing_type}</p></div>
                  <div><p className="text-gray-500 text-xs">Payment</p><p className="font-medium capitalize">{detailV2.payment_status}</p></div>
                  {detailV2.quoted_price != null && <div><p className="text-gray-500 text-xs">Quoted</p><p className="font-medium">৳{detailV2.quoted_price.toLocaleString()}</p></div>}
                  {detailV2.final_price != null && <div><p className="text-gray-500 text-xs">Final</p><p className="font-medium">৳{detailV2.final_price.toLocaleString()}</p></div>}
                  {detailV2.hours_worked != null && <div><p className="text-gray-500 text-xs">Hours</p><p className="font-medium">{detailV2.hours_worked}h</p></div>}
                  <div><p className="text-gray-500 text-xs">Created</p><p className="font-medium">{new Date(detailV2.created_at).toLocaleDateString("en-BD")}</p></div>
                </div>
                {detailV2.requirements && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-gray-500 text-xs mb-1">Requirements</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{detailV2.requirements}</p>
                  </div>
                )}
                {detailV2.notes && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-gray-500 text-xs mb-1">Notes</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{detailV2.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
