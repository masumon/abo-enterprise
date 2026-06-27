"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, FileText, X } from "lucide-react";
import api from "@/lib/api";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatPrice } from "@/lib/utils";

interface AdminInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

const PAYMENT_STATUSES = ["pending", "paid", "overdue", "cancelled", "refunded"];

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<AdminInvoice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/v1/invoices/admin/invoices", {
        params: { payment_status: filter || undefined, page, per_page: 20 },
      });
      setInvoices((r.data.data ?? []) as AdminInvoice[]);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total invoices</p>
        </div>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">All Status</option>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No invoices found</p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="cursor-pointer" onClick={() => setDetail(inv)}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{inv.invoice_number}</p>
                    {inv.payment_method && <p className="text-xs text-gray-400 capitalize">{inv.payment_method}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-900">{inv.customer_name}</p>
                    <p className="text-xs text-gray-400">{inv.customer_email ?? inv.customer_phone ?? "—"}</p>
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{formatPrice(inv.total_amount)}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(inv.created_at).toLocaleDateString("en-BD")}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={inv.payment_status} />
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
          <button disabled={invoices.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setDetail(null)}>
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in" style={{ background: "rgba(255,255,255,0.98)", boxShadow: "0 24px 64px rgba(30,91,168,0.16), 0 8px 24px rgba(0,0,0,0.08)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Invoice {detail.invoice_number}</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={detail.payment_status} />
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/invoices/${detail.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm text-xs"
                >
                  Download PDF
                </a>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 text-sm">Customer Info</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Name</span><p className="font-medium">{detail.customer_name}</p></div>
                  {detail.customer_email && <div><span className="text-gray-500">Email</span><p className="font-medium">{detail.customer_email}</p></div>}
                  {detail.customer_phone && <div><span className="text-gray-500">Phone</span><p className="font-medium">{detail.customer_phone}</p></div>}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(detail.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(detail.tax_amount)}</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                  <span>Total</span><span className="text-accent-500">{formatPrice(detail.total_amount)}</span>
                </div>
                {detail.payment_method && (
                  <div className="flex justify-between text-gray-500 pt-1"><span>Payment</span><span className="capitalize">{detail.payment_method}</span></div>
                )}
              </div>
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
