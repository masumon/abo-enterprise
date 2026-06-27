"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, FileText, X, Trash2, Download, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatPrice } from "@/lib/utils";
import { useToastStore } from "@/store/toast";

interface AdminInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string | null;
  payment_status: string;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
}

const PAYMENT_STATUSES = ["pending", "paid", "overdue", "cancelled", "refunded"];

export default function AdminInvoicesPage() {
  const toast = useToastStore((s) => s.push);
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<AdminInvoice | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/v1/invoices/admin/invoices", {
        params: { payment_status: filter || undefined, page, per_page: 20 },
      });
      setInvoices((r.data.data ?? []) as AdminInvoice[]);
      setTotal(r.data.meta?.total ?? 0);
    } catch {
      toast("error", "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [filter, page, toast]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (invoice: AdminInvoice, newStatus: string) => {
    if (newStatus === invoice.payment_status) return;
    setStatusUpdating(true);
    try {
      const r = await api.patch(
        `/api/v1/invoices/admin/invoices/${invoice.id}/payment-status`,
        null,
        { params: { payment_status: newStatus } }
      );
      const updated = r.data.data as AdminInvoice;
      setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? updated : i)));
      setDetail(updated);
      toast("success", "Payment status updated");
    } catch {
      toast("error", "Status update failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async (invoice: AdminInvoice) => {
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/invoices/admin/invoices/${invoice.id}`);
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
      setTotal((t) => t - 1);
      setDetail(null);
      toast("success", "Invoice deleted");
    } catch {
      toast("error", "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total invoices</p>
        </div>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">All Status</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => setDetail(inv)}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{inv.invoice_number}</p>
                      {inv.payment_method && (
                        <p className="text-xs text-gray-400 capitalize">{inv.payment_method.replace(/_/g, " ")}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-900">{inv.customer_name}</p>
                      <p className="text-xs text-gray-400">{inv.customer_email ?? inv.customer_phone ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{formatPrice(inv.total)}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(inv.created_at).toLocaleDateString("en-BD")}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={inv.payment_status} />
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
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
          <button
            disabled={invoices.length < 20}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setDetail(null)}
        >
          <div
            className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
            style={{
              background: "rgba(255,255,255,0.98)",
              boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{detail.invoice_number}</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {/* Status + Actions */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <select
                    value={detail.payment_status}
                    onChange={(e) => updateStatus(detail, e.target.value)}
                    disabled={statusUpdating}
                    className="w-full appearance-none border border-gray-200 rounded-lg text-sm px-3 py-2 pr-8 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <a
                  href={`${apiBase}/api/v1/invoices/${detail.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </a>
                <button
                  onClick={() => handleDelete(detail)}
                  disabled={deleting}
                  title="Delete invoice"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              {/* Customer */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 text-sm">Customer</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block">Name</span>
                    <p className="font-medium text-gray-900">{detail.customer_name}</p>
                  </div>
                  {detail.customer_email && (
                    <div>
                      <span className="text-xs text-gray-400 block">Email</span>
                      <p className="font-medium text-gray-900 truncate">{detail.customer_email}</p>
                    </div>
                  )}
                  {detail.customer_phone && (
                    <div>
                      <span className="text-xs text-gray-400 block">Phone</span>
                      <p className="font-medium text-gray-900">{detail.customer_phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              {detail.items?.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400">Item</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-400">Qty</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {detail.items.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2.5 text-gray-700">{item.name}</td>
                          <td className="px-4 py-2.5 text-center text-gray-500">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right text-gray-900 font-medium">{formatPrice(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(detail.subtotal)}</span>
                </div>
                {detail.tax > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax</span>
                    <span>{formatPrice(detail.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-accent-500">{formatPrice(detail.total)}</span>
                </div>
                {detail.payment_method && (
                  <div className="flex justify-between text-gray-500 pt-1">
                    <span>Payment</span>
                    <span className="capitalize">{detail.payment_method.replace(/_/g, " ")}</span>
                  </div>
                )}
              </div>

              {/* Dates */}
              {(detail.issued_date || detail.due_date || detail.paid_date) && (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {detail.issued_date && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 block mb-1">Issued</span>
                      <p className="font-medium text-gray-900 text-xs">
                        {new Date(detail.issued_date).toLocaleDateString("en-BD")}
                      </p>
                    </div>
                  )}
                  {detail.due_date && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 block mb-1">Due</span>
                      <p className="font-medium text-gray-900 text-xs">
                        {new Date(detail.due_date).toLocaleDateString("en-BD")}
                      </p>
                    </div>
                  )}
                  {detail.paid_date && (
                    <div className="bg-green-50 rounded-xl p-3">
                      <span className="text-xs text-green-400 block mb-1">Paid</span>
                      <p className="font-medium text-green-700 text-xs">
                        {new Date(detail.paid_date).toLocaleDateString("en-BD")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {detail.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs text-amber-700 font-medium mb-1">Notes</p>
                  <p className="text-sm text-amber-900">{detail.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
