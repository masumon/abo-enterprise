"use client";

import { useEffect, useState } from "react";
import { Loader2, Briefcase, ChevronDown, X } from "lucide-react";
import { bookingsApi } from "@/lib/api";
import type { Booking } from "@/types";
import StatusBadge from "@/components/admin/StatusBadge";

const STATUSES = ["pending", "contacted", "in_progress", "completed", "cancelled"];
const SERVICE_TYPES = ["printing", "legal", "web_development", "ai_solutions", "automation", "software"];

interface AdminBooking extends Booking {
  booking_number: string;
  created_at: string;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminBooking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await bookingsApi.list({ service_type: typeFilter || undefined, status: statusFilter || undefined, page });
      setBookings((r.data.data ?? []) as unknown as AdminBooking[]);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter, page]);

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
          <p className="text-gray-500 text-sm mt-1">{total} total bookings</p>
        </div>
        <div className="flex gap-2">
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input w-auto text-sm">
            <option value="">All Services</option>
            {SERVICE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto text-sm">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No bookings found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openDetail(b.id!)}>
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
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
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
          <button disabled={bookings.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {/* Booking Detail Modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
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
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
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
    </div>
  );
}
