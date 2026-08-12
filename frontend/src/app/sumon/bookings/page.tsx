"use client";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Briefcase, ChevronDown, X, Download, Trash2 } from "lucide-react";
import { serviceBookingsAdminApi, downloadCsv, downloadPdf } from "@/lib/api";
import type { BookingV2 } from "@/types";
import { buildCustomerWhatsAppLink } from "@/lib/utils";
import { BD_DISTRICTS } from "@/hooks/useDistrictUpazila";
import { apiErrorMessage } from "@/lib/apiError";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToastStore } from "@/store/toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useFocusTrap } from "@/lib/useFocusTrap";

const ComposeEmailModal = dynamic(() => import("@/components/admin/ComposeEmailModal"), { ssr: false });
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminToolbar from "@/components/admin/AdminToolbar";

const STATUSES_V2 = ["pending", "confirmed", "in_progress", "completed", "cancelled", "on_hold"];
// "pending" is the value every new booking starts at — omitting it made the
// payment filter match nothing at all.
const PAYMENT_STATUSES = ["pending", "unpaid", "partial", "paid", "refunded"];

export default function AdminBookingsPage() {
  const [bookingsV2, setBookingsV2] = useState<BookingV2[]>([]);
  const [loadingV2, setLoadingV2] = useState(false);
  const [statusFilterV2, setStatusFilterV2] = useState("");
  const [paymentFilterV2, setPaymentFilterV2] = useState("");
  const [districtFilterV2, setDistrictFilterV2] = useState("");
  const [pageV2, setPageV2] = useState(1);
  const [totalV2, setTotalV2] = useState(0);
  const [updatingIdV2, setUpdatingIdV2] = useState<string | null>(null);
  const [detailV2, setDetailV2] = useState<BookingV2 | null>(null);
  const [composeEmail, setComposeEmail] = useState<{ to: string; subject: string; context: string } | null>(null);
  // Fulfilment/payment edit for the open V2 booking. Nothing else in the
  // system writes final_price or payment_status, so this is what makes booking
  // revenue reportable at all.
  const [editV2, setEditV2] = useState<Partial<BookingV2> | null>(null);
  const [savingV2, setSavingV2] = useState(false);

  const toast = useToastStore((s) => s.push);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  const detailV2Ref = useFocusTrap(!!detailV2, () => setDetailV2(null));

  const loadV2 = async () => {
    setLoadingV2(true);
    try {
      const r = await serviceBookingsAdminApi.list({ status: statusFilterV2 || undefined, payment_status: paymentFilterV2 || undefined, district: districtFilterV2 || undefined, page: pageV2 });
      setBookingsV2(r.data.data ?? []);
      setTotalV2(r.data.meta?.total ?? 0);
    } catch (err) {
      toast("error", "Failed to load service bookings");
    } finally {
      setLoadingV2(false);
    }
  };

  useEffect(() => { loadV2(); }, [statusFilterV2, paymentFilterV2, districtFilterV2, pageV2]);

  const handleCsvExport = async () => {
    setCsvLoading(true);
    try {
      await downloadCsv("/api/v1/admin/bulk/export/bookings", "service-bookings.csv");
    } catch {
      toast("error", "CSV export failed");
    } finally {
      setCsvLoading(false);
    }
  };

  const handlePdfExport = async () => {
    setExportPdfLoading(true);
    try {
      await downloadPdf("/api/v1/admin/bulk/export/bookings/pdf", "service-bookings.pdf");
    } catch {
      toast("error", "PDF export failed");
    } finally {
      setExportPdfLoading(false);
    }
  };

  const handleDownloadPdf = async (id: string, bookingNumber: string) => {
    setPdfLoading(id);
    try {
      await downloadPdf(`/api/v1/invoices/admin/bookings-v2/${id}/pdf`, `receipt-${bookingNumber}.pdf`);
    } catch {
      toast("error", "PDF download failed");
    } finally {
      setPdfLoading(null);
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

  const handleDeleteV2 = (id: string, bookingNumber: string) => {
    setConfirmState({
      title: `Delete booking ${bookingNumber}?`,
      message: "This action cannot be undone.",
      action: async () => {
        setConfirmState(null);
        setUpdatingIdV2(id);
        try {
          await serviceBookingsAdminApi.delete(id);
          setBookingsV2((prev) => prev.filter((b) => b.id !== id));
          setTotalV2((t) => t - 1);
          if (detailV2?.id === id) setDetailV2(null);
          toast("success", "Booking deleted");
        } catch {
          toast("error", "Delete failed");
        } finally {
          setUpdatingIdV2(null);
        }
      },
    });
  };

  const saveEditV2 = async () => {
    if (!detailV2 || !editV2) return;
    setSavingV2(true);
    try {
      const r = await serviceBookingsAdminApi.update(detailV2.id, editV2);
      const saved = r.data.data;
      if (saved) {
        setDetailV2((prev) => (prev ? { ...prev, ...saved } : prev));
        setBookingsV2((prev) => prev.map((b) => (b.id === saved.id ? { ...b, ...saved } : b)));
      }
      setEditV2(null);
      toast("success", "Booking updated");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to update booking"));
    } finally {
      setSavingV2(false);
    }
  };

  const markAdvanceReceived = async () => {
    if (!detailV2) return;
    setSavingV2(true);
    try {
      const r = await serviceBookingsAdminApi.markAdvanceReceived(detailV2.id);
      const saved = r.data.data;
      if (saved) {
        setDetailV2((prev) => (prev ? { ...prev, ...saved } : prev));
        setBookingsV2((prev) => prev.map((b) => (b.id === saved.id ? { ...b, ...saved } : b)));
      }
      toast("success", "Advance marked received; booking confirmed");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to mark advance received"));
    } finally {
      setSavingV2(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="Bookings"
        titleBn="বুকিং ব্যবস্থাপনা"
        description={`${totalV2} total bookings — service intake, status management, receipts, and fulfillment tracking`}
        descriptionBn={`${totalV2}টি বুকিং — service intake, status management, receipt এবং fulfillment tracking`}
        actions={
          <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-brand-700">
            <Briefcase className="w-4 h-4" />
            <span className="text-sm font-semibold">{totalV2} bookings</span>
          </div>
        }
      />

      <AdminToolbar>
        <select value={statusFilterV2} onChange={(e) => { setStatusFilterV2(e.target.value); setPageV2(1); }} className="admin-input w-auto text-sm">
          <option value="">All Status</option>
          {STATUSES_V2.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select value={paymentFilterV2} onChange={(e) => { setPaymentFilterV2(e.target.value); setPageV2(1); }} className="admin-input w-auto text-sm">
          <option value="">All Payment</option>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select value={districtFilterV2} onChange={(e) => { setDistrictFilterV2(e.target.value); setPageV2(1); }} className="admin-input w-auto text-sm">
          <option value="">All Districts</option>
          {BD_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button
          onClick={handleCsvExport}
          disabled={csvLoading}
          className="admin-btn-secondary !py-2 gap-1.5"
          title="Export all bookings to CSV"
        >
          {csvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          CSV
        </button>
        <button
          onClick={handlePdfExport}
          disabled={exportPdfLoading}
          className="admin-btn-secondary !py-2 gap-1.5"
          title="Export all bookings as PDF"
        >
          {exportPdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          PDF
        </button>
      </AdminToolbar>

      {/* Bookings table. Legacy v1 rows were merged into bookings_v2 by
          alembic 0015 under their original booking numbers, so this table
          is the single, complete view. */}
      <div className="admin-card overflow-hidden">
        {loadingV2 ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : bookingsV2.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No service bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium min-w-[620px]">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th className="hidden sm:table-cell">Service</th>
                  <th className="hidden md:table-cell">Pricing</th>
                  <th className="hidden sm:table-cell">Payment</th>
                  <th>Status</th>
                  <th />
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
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <p className="text-gray-800">{b.service_name}</p>
                      {b.service_tier && <p className="text-xs text-gray-400">{b.service_tier}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-600 hidden md:table-cell">
                      <p className="capitalize text-xs">{b.pricing_type}</p>
                      <p className="font-medium text-gray-900">
                        {b.final_price != null ? `৳${b.final_price.toLocaleString()}` : b.quoted_price != null ? `৳${b.quoted_price.toLocaleString()}` : "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
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
                      <div className="flex items-center gap-2">
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
                        <button
                          onClick={() => handleDeleteV2(b.id, b.booking_number)}
                          disabled={updatingIdV2 === b.id}
                          title="Delete booking"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalV2 > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={pageV2 === 1} onClick={() => setPageV2(p => p - 1)} className="btn btn-outline btn-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {pageV2}</span>
          <button disabled={bookingsV2.length < 20} onClick={() => setPageV2(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {/* Booking Detail Modal */}
      {detailV2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={ADMIN_MODAL_BACKDROP_STYLE}
          onClick={() => setDetailV2(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Service booking details"
        >
          <div
            ref={detailV2Ref}
            className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in"
            style={ADMIN_MODAL_PANEL_STYLE}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Booking {detailV2.booking_number}</h2>
              <button onClick={() => setDetailV2(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <StatusBadge status={detailV2.status} />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(detailV2.id, detailV2.booking_number)}
                    disabled={pdfLoading === detailV2.id}
                    className="btn btn-outline btn-sm gap-1.5"
                  >
                    {pdfLoading === detailV2.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Receipt PDF
                  </button>
                  <select
                    value={detailV2.status}
                    disabled={updatingIdV2 === detailV2.id}
                    onChange={(e) => updateStatusV2(detailV2.id, e.target.value)}
                    className="input w-auto text-sm"
                  >
                    {STATUSES_V2.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">Customer</h3>
                  <div className="flex gap-2">
                    {detailV2.customer_phone && <a href={`tel:${detailV2.customer_phone}`} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">📞 Call</a>}
                    {detailV2.customer_phone && <a href={buildCustomerWhatsAppLink(detailV2.customer_phone, `Hello ${detailV2.customer_name}, regarding your booking ${detailV2.booking_number} at ABO Enterprise. How can we help you?`)} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-medium">💬 WhatsApp</a>}
                    {detailV2.customer_email && <button type="button" onClick={() => setComposeEmail({ to: detailV2.customer_email!, subject: `Regarding your booking ${detailV2.booking_number}`, context: `Booking ${detailV2.booking_number}` })} title="Compose and send an email to the customer from no-reply@aboenterprise.com" className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors font-medium">✉ Email</button>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Name</p><p className="font-medium">{detailV2.customer_name}</p></div>
                  <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{detailV2.customer_phone}</p></div>
                  {detailV2.customer_email && <div><p className="text-gray-500 text-xs">Email</p><p className="font-medium">{detailV2.customer_email}</p></div>}
                  {detailV2.customer_company && <div><p className="text-gray-500 text-xs">Company</p><p className="font-medium">{detailV2.customer_company}</p></div>}
                  {(detailV2.district || detailV2.upazila) && (
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs">Location</p>
                      <p className="font-medium">{[detailV2.upazila, detailV2.district].filter(Boolean).join(", ")}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Service &amp; Pricing</h3>
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
                {detailV2.details && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-gray-500 text-xs mb-1">Details</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{detailV2.details}</p>
                  </div>
                )}
                {detailV2.requirements && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-gray-500 text-xs mb-1">Requirements</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{detailV2.requirements}</p>
                  </div>
                )}
                {detailV2.form_data && Object.keys(detailV2.form_data).length > 0 && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-gray-500 text-xs mb-2">Booking Form Answers</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(detailV2.form_data).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-gray-500 text-xs">{detailV2.form_labels?.[key] ?? key.replace(/_/g, " ")}</p>
                          <p className="font-medium break-words">
                            {Array.isArray(value) ? value.join(", ") : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(detailV2.attachments?.length ?? 0) > 0 && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-gray-500 text-xs mb-2">Attachments</p>
                    <ul className="space-y-1">
                      {detailV2.attachments!.map((url, i) => (
                        <li key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-brand-600 hover:underline break-all"
                          >
                            Document {i + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {detailV2.notes && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-gray-500 text-xs mb-1">Notes</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{detailV2.notes}</p>
                  </div>
                )}
              </div>

              {/* Advance / consultancy fee — the booking stays pending until
                  this is settled, mirroring the order-side rule. */}
              {(detailV2.advance_amount ?? 0) > 0 && (
                <div className={`rounded-xl p-4 ${detailV2.advance_paid ? "bg-green-50" : "bg-amber-50"}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">Advance / Consultancy Fee</h3>
                      <p className="text-sm text-gray-700 mt-0.5">
                        ৳{Number(detailV2.advance_amount).toLocaleString()}{" "}
                        <span className={detailV2.advance_paid ? "text-green-700" : "text-amber-700"}>
                          — {detailV2.advance_paid ? "received" : "awaiting payment"}
                        </span>
                      </p>
                    </div>
                    {!detailV2.advance_paid && (
                      <button
                        type="button"
                        onClick={markAdvanceReceived}
                        disabled={savingV2}
                        className="btn btn-primary btn-sm text-xs gap-1"
                      >
                        {savingV2 && <Loader2 className="w-3 h-3 animate-spin" />}
                        Mark Received
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Fulfilment & payment — the only writer of final_price /
                  payment_status, which analytics reports revenue from. */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">Fulfilment &amp; Payment</h3>
                  {!editV2 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEditV2({
                          final_price: detailV2.final_price ?? undefined,
                          payment_status: detailV2.payment_status,
                          payment_method: detailV2.payment_method ?? "",
                          hours_worked: detailV2.hours_worked ?? undefined,
                          estimated_completion_date: detailV2.estimated_completion_date
                            ? detailV2.estimated_completion_date.slice(0, 10)
                            : "",
                          notes: detailV2.notes ?? "",
                        })
                      }
                      className="btn btn-outline btn-sm text-xs"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditV2(null)} className="btn btn-outline btn-sm text-xs">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEditV2}
                        disabled={savingV2}
                        className="btn btn-primary btn-sm text-xs gap-1"
                      >
                        {savingV2 && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {editV2 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="form-label text-[11px]">Final Price (৳)</label>
                      <input
                        type="number"
                        min={0}
                        value={editV2.final_price ?? ""}
                        onChange={(e) =>
                          setEditV2((p) => ({ ...p, final_price: e.target.value ? Number(e.target.value) : undefined }))
                        }
                        placeholder={detailV2.quoted_price != null ? String(detailV2.quoted_price) : "0"}
                        className="input w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="form-label text-[11px]">Payment Status</label>
                      <select
                        value={editV2.payment_status ?? "pending"}
                        onChange={(e) => setEditV2((p) => ({ ...p, payment_status: e.target.value }))}
                        className="input w-full text-sm"
                      >
                        {PAYMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label text-[11px]">Payment Method</label>
                      <input
                        value={editV2.payment_method ?? ""}
                        onChange={(e) => setEditV2((p) => ({ ...p, payment_method: e.target.value }))}
                        placeholder="bKash / Nagad / Cash"
                        className="input w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="form-label text-[11px]">Hours Worked</label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={editV2.hours_worked ?? ""}
                        onChange={(e) =>
                          setEditV2((p) => ({ ...p, hours_worked: e.target.value ? Number(e.target.value) : undefined }))
                        }
                        className="input w-full text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label text-[11px]">Estimated Completion</label>
                      <input
                        type="date"
                        value={(editV2.estimated_completion_date ?? "").slice(0, 10)}
                        onChange={(e) =>
                          setEditV2((p) => ({
                            ...p,
                            estimated_completion_date: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : undefined,
                          }))
                        }
                        className="input w-full text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label text-[11px]">Internal Notes</label>
                      <textarea
                        rows={3}
                        value={editV2.notes ?? ""}
                        onChange={(e) => setEditV2((p) => ({ ...p, notes: e.target.value }))}
                        className="input w-full text-sm resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Final Price</p>
                      <p className="font-medium">
                        {detailV2.final_price != null ? `৳${detailV2.final_price.toLocaleString()}` : "— not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Payment Method</p>
                      <p className="font-medium">{detailV2.payment_method || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Est. Completion</p>
                      <p className="font-medium">
                        {detailV2.estimated_completion_date
                          ? new Date(detailV2.estimated_completion_date).toLocaleDateString("en-BD")
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Hours Worked</p>
                      <p className="font-medium">{detailV2.hours_worked ?? "—"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel="Delete"
        variant="danger"
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
