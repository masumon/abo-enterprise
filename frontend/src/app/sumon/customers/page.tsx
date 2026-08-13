"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Users, RefreshCw, ChevronLeft, ChevronRight, X, Pencil, History, Save } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";
import { useToastStore } from "@/store/toast";
import { apiErrorMessage } from "@/lib/apiError";

interface CustomerRow {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  company: string | null;
  address: string | null;
  status: string;
  order_count: number;
  booking_count: number;
  lead_count: number;
  order_value: number;
  booking_value: number;
  last_activity: string | null;
}

interface PageMeta { page: number; per_page: number; total: number; total_pages: number }
interface CustomerHistory {
  customer: CustomerRow;
  orders: Array<{ id: string; order_number: string; status: string; payment_status: string; total: number; created_at: string | null }>;
  bookings: Array<{ id: string; booking_number: string; status: string; payment_status: string | null; total: number; created_at: string | null }>;
  leads: Array<{ id: string; status: string; source: string; created_at: string | null }>;
}

export default function CustomersPage() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const toast = useToastStore((s) => s.push);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, per_page: 25, total: 0, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", address: "" });

  const load = useCallback(async (page = 1, q = query) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "25" });
      if (q.trim()) params.set("search", q.trim());
      const res = await api.get(`/api/v1/admin/customers?${params.toString()}`);
      setRows(res.data.data ?? []);
      setMeta(res.data.meta ?? { page, per_page: 25, total: 0, total_pages: 1 });
    } catch (error) {
      toast("error", apiErrorMessage(error, bn ? "গ্রাহক ডেটা লোড করা যায়নি" : "Failed to load customer data"));
    } finally {
      setLoading(false);
    }
  }, [bn, query, toast]);

  useEffect(() => { void load(1, query); }, [load, query]);

  const openCustomer = async (row: CustomerRow) => {
    setSelected(row);
    setHistory(null);
    setDetailLoading(true);
    try {
      const [detailRes, historyRes] = await Promise.all([
        api.get(`/api/v1/admin/customers/${row.id}`),
        api.get(`/api/v1/admin/customers/${row.id}/history`),
      ]);
      const detail = detailRes.data.data ?? row;
      setSelected(detail);
      setHistory(historyRes.data.data ?? null);
      setForm({
        name: detail.name ?? "",
        email: detail.email ?? "",
        company: detail.company ?? "",
        address: detail.address ?? "",
      });
    } catch (error) {
      toast("error", apiErrorMessage(error, bn ? "গ্রাহকের বিস্তারিত তথ্য লোড করা যায়নি" : "Failed to load customer details"));
    } finally {
      setDetailLoading(false);
    }
  };

  const saveCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/admin/customers/${selected.id}`, form);
      const refreshed = await api.get(`/api/v1/admin/customers/${selected.id}`);
      const detail = refreshed.data.data as CustomerRow;
      setSelected(detail);
      setForm({ name: detail.name ?? "", email: detail.email ?? "", company: detail.company ?? "", address: detail.address ?? "" });
      setEditOpen(false);
      setRows((current) => current.map((item) => item.id === detail.id ? detail : item));
      toast("success", bn ? "গ্রাহকের তথ্য আপডেট হয়েছে" : "Customer profile updated");
    } catch (error) {
      toast("error", apiErrorMessage(error, bn ? "গ্রাহকের তথ্য আপডেট করা যায়নি" : "Failed to update customer"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customers"
        titleBn="গ্রাহক"
        description="Canonical customer profiles with orders, bookings and leads history"
        descriptionBn="ক্যানোনিকাল গ্রাহক প্রোফাইল এবং অর্ডার, বুকিং ও লিডের ইতিহাস"
      />

      <div className="admin-card p-4 flex flex-col sm:flex-row gap-3">
        <form className="flex-1 relative" onSubmit={(e) => { e.preventDefault(); setQuery(search); }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={bn ? "নাম, ফোন, ইমেইল বা কোম্পানি" : "Name, phone, email or company"} className="admin-input w-full pl-9" />
        </form>
        <button type="button" onClick={() => void load(meta.page, query)} className="admin-btn-secondary px-3" aria-label={bn ? "রিফ্রেশ" : "Refresh"} title={bn ? "রিফ্রেশ" : "Refresh"}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><RefreshCw className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><Users className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>{bn ? "কোনো গ্রাহক পাওয়া যায়নি" : "No customer records found"}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium table-responsive min-w-[1040px]">
              <thead><tr>
                <th>{bn ? "গ্রাহক" : "Customer"}</th><th>{bn ? "যোগাযোগ" : "Contact"}</th><th>{bn ? "অর্ডার" : "Orders"}</th><th>{bn ? "বুকিং" : "Bookings"}</th><th>{bn ? "লিড" : "Leads"}</th><th>{bn ? "অর্ডার মূল্য" : "Order value"}</th><th>{bn ? "বুকিং মূল্য" : "Booking value"}</th><th>{bn ? "সর্বশেষ" : "Last activity"}</th><th>{bn ? "অ্যাকশন" : "Action"}</th>
              </tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id}>
                  <td data-label={bn ? "গ্রাহক" : "Customer"}><button type="button" onClick={() => void openCustomer(row)} className="text-left"><div className="font-medium text-gray-900 hover:underline">{row.name || "—"}</div>{row.company && <div className="text-xs text-gray-400">{row.company}</div>}</button></td>
                  <td data-label={bn ? "যোগাযোগ" : "Contact"}><div className="text-sm text-gray-700">{row.phone}</div><div className="text-xs text-gray-400">{row.email || "—"}</div></td>
                  <td data-label={bn ? "অর্ডার" : "Orders"}>{row.order_count}</td><td data-label={bn ? "বুকিং" : "Bookings"}>{row.booking_count}</td><td data-label={bn ? "লিড" : "Leads"}>{row.lead_count}</td>
                  <td className="font-medium" data-label={bn ? "অর্ডার মূল্য" : "Order value"}>{formatPrice(row.order_value)}</td><td className="font-medium" data-label={bn ? "বুকিং মূল্য" : "Booking value"}>{formatPrice(row.booking_value)}</td>
                  <td className="text-xs text-gray-500" data-label={bn ? "সর্বশেষ" : "Last activity"}>{row.last_activity ? new Date(row.last_activity).toLocaleString("en-BD") : "—"}</td>
                  <td data-label={bn ? "অ্যাকশন" : "Action"}><button type="button" onClick={() => void openCustomer(row)} className="admin-btn-secondary px-3 py-2 inline-flex items-center gap-2"><History className="w-4 h-4" />{bn ? "দেখুন" : "View"}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {meta.total_pages > 1 && <div className="flex items-center justify-center gap-3 p-4 border-t border-gray-100"><button disabled={meta.page <= 1} onClick={() => void load(meta.page - 1, query)} className="admin-btn-secondary px-3 py-2 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span className="text-sm text-gray-500">{bn ? `পৃষ্ঠা ${meta.page} / ${meta.total_pages}` : `Page ${meta.page} / ${meta.total_pages}`}</span><button disabled={meta.page >= meta.total_pages} onClick={() => void load(meta.page + 1, query)} className="admin-btn-secondary px-3 py-2 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 sm:p-8 overflow-y-auto" role="dialog" aria-modal="true" aria-label={bn ? "গ্রাহক বিস্তারিত" : "Customer details"}>
          <div className="mx-auto max-w-5xl admin-card bg-white min-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100"><div><h2 className="text-xl font-semibold">{selected.name || selected.phone}</h2><p className="text-sm text-gray-500">{selected.phone} · {selected.email || "—"}</p></div><button type="button" onClick={() => { setSelected(null); setHistory(null); setEditOpen(false); }} className="admin-btn-secondary p-2" aria-label={bn ? "বন্ধ করুন" : "Close"}><X className="w-5 h-5" /></button></div>
            {detailLoading ? <div className="p-16 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div> : (
              <div className="p-5 space-y-6">
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="admin-card p-4"><div className="text-xs text-gray-500">{bn ? "অর্ডার" : "Orders"}</div><div className="text-xl font-semibold">{selected.order_count}</div></div>
                  <div className="admin-card p-4"><div className="text-xs text-gray-500">{bn ? "বুকিং" : "Bookings"}</div><div className="text-xl font-semibold">{selected.booking_count}</div></div>
                  <div className="admin-card p-4"><div className="text-xs text-gray-500">{bn ? "লিড" : "Leads"}</div><div className="text-xl font-semibold">{selected.lead_count}</div></div>
                  <div className="admin-card p-4"><div className="text-xs text-gray-500">{bn ? "মোট ব্যবসা" : "Commercial value"}</div><div className="text-xl font-semibold">{formatPrice(selected.order_value + selected.booking_value)}</div></div>
                </section>

                <section className="admin-card p-5"><div className="flex items-center justify-between gap-3 mb-4"><h3 className="font-semibold">{bn ? "প্রোফাইল" : "Profile"}</h3><button type="button" onClick={() => setEditOpen((value) => !value)} className="admin-btn-secondary px-3 py-2 inline-flex items-center gap-2"><Pencil className="w-4 h-4" />{bn ? "এডিট" : "Edit"}</button></div>
                  {editOpen ? <form onSubmit={saveCustomer} className="grid gap-4 sm:grid-cols-2"><label className="text-sm">{bn ? "নাম" : "Name"}<input className="admin-input w-full mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={255} /></label><label className="text-sm">{bn ? "ইমেইল" : "Email"}<input type="email" className="admin-input w-full mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} /></label><label className="text-sm">{bn ? "কোম্পানি" : "Company"}<input className="admin-input w-full mt-1" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={255} /></label><label className="text-sm sm:col-span-2">{bn ? "ঠিকানা" : "Address"}<textarea className="admin-input w-full mt-1 min-h-24" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={5000} /></label><div className="sm:col-span-2 flex justify-end"><button disabled={saving} className="admin-btn-primary px-4 py-2 inline-flex items-center gap-2"><Save className="w-4 h-4" />{saving ? (bn ? "সংরক্ষণ হচ্ছে…" : "Saving…") : (bn ? "সংরক্ষণ" : "Save changes")}</button></div></form> : <div className="grid gap-4 sm:grid-cols-2 text-sm"><div><span className="text-gray-500">{bn ? "নাম" : "Name"}</span><div className="font-medium">{selected.name || "—"}</div></div><div><span className="text-gray-500">{bn ? "ফোন" : "Phone"}</span><div className="font-medium">{selected.phone}</div></div><div><span className="text-gray-500">{bn ? "ইমেইল" : "Email"}</span><div>{selected.email || "—"}</div></div><div><span className="text-gray-500">{bn ? "কোম্পানি" : "Company"}</span><div>{selected.company || "—"}</div></div><div className="sm:col-span-2"><span className="text-gray-500">{bn ? "ঠিকানা" : "Address"}</span><div>{selected.address || "—"}</div></div></div>}
                </section>

                <section className="admin-card p-5"><h3 className="font-semibold mb-4">{bn ? "ইতিহাস" : "History"}</h3>{history && <div className="space-y-6"><div><h4 className="text-sm font-medium mb-2">{bn ? "অর্ডার" : "Orders"}</h4>{history.orders.length ? <div className="overflow-x-auto"><table className="table-premium table-responsive min-w-[620px]"><thead><tr><th>No.</th><th>Status</th><th>Payment</th><th>Total</th><th>Date</th></tr></thead><tbody>{history.orders.map((item) => <tr key={item.id}><td data-label="No.">{item.order_number}</td><td data-label="Status">{item.status}</td><td data-label="Payment">{item.payment_status}</td><td data-label="Total">{formatPrice(item.total)}</td><td data-label="Date">{item.created_at ? new Date(item.created_at).toLocaleString("en-BD") : "—"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-gray-500">{bn ? "কোনো অর্ডার নেই" : "No orders"}</p>}</div><div><h4 className="text-sm font-medium mb-2">{bn ? "বুকিং" : "Bookings"}</h4>{history.bookings.length ? <div className="overflow-x-auto"><table className="table-premium table-responsive min-w-[620px]"><thead><tr><th>No.</th><th>Status</th><th>Payment</th><th>Total</th><th>Date</th></tr></thead><tbody>{history.bookings.map((item) => <tr key={item.id}><td data-label="No.">{item.booking_number}</td><td data-label="Status">{item.status}</td><td data-label="Payment">{item.payment_status || "—"}</td><td data-label="Total">{formatPrice(item.total)}</td><td data-label="Date">{item.created_at ? new Date(item.created_at).toLocaleString("en-BD") : "—"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-gray-500">{bn ? "কোনো বুকিং নেই" : "No bookings"}</p>}</div><div><h4 className="text-sm font-medium mb-2">{bn ? "লিড" : "Leads"}</h4>{history.leads.length ? <div className="overflow-x-auto"><table className="table-premium table-responsive min-w-[520px]"><thead><tr><th>Status</th><th>Source</th><th>Date</th></tr></thead><tbody>{history.leads.map((item) => <tr key={item.id}><td data-label="Status">{item.status}</td><td data-label="Source">{item.source}</td><td data-label="Date">{item.created_at ? new Date(item.created_at).toLocaleString("en-BD") : "—"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-gray-500">{bn ? "কোনো লিড নেই" : "No leads"}</p>}</div></div>}</section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
