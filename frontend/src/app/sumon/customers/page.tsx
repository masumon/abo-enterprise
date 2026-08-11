"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Users, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";
import { useToastStore } from "@/store/toast";
import { apiErrorMessage } from "@/lib/apiError";

interface CustomerRow {
  phone: string;
  name: string | null;
  email: string | null;
  company: string | null;
  order_count: number;
  booking_count: number;
  lead_count: number;
  order_value: number;
  booking_value: number;
  last_activity: string | null;
}

interface PageMeta { page: number; per_page: number; total: number; total_pages: number }

export default function CustomersPage() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const toast = useToastStore((s) => s.push);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, per_page: 25, total: 0, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customers"
        titleBn="গ্রাহক"
        description="Read-only customer index across orders, bookings and leads"
        descriptionBn="অর্ডার, বুকিং ও লিড থেকে তৈরি রিড-অনলি গ্রাহক সূচি"
      />

      <div className="admin-card p-4 flex flex-col sm:flex-row gap-3">
        <form className="flex-1 relative" onSubmit={(e) => { e.preventDefault(); setQuery(search); }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={bn ? "নাম, ফোন, ইমেইল বা কোম্পানি" : "Name, phone, email or company"}
            className="admin-input w-full pl-9"
          />
        </form>
        <button type="button" onClick={() => void load(meta.page, query)} className="admin-btn-secondary px-3" aria-label={bn ? "রিফ্রেশ" : "Refresh"} title={bn ? "রিফ্রেশ" : "Refresh"}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><RefreshCw className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{bn ? "কোনো গ্রাহক পাওয়া যায়নি" : "No customer records found"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium min-w-[920px]">
              <thead><tr>
                <th>{bn ? "গ্রাহক" : "Customer"}</th>
                <th>{bn ? "যোগাযোগ" : "Contact"}</th>
                <th>{bn ? "অর্ডার" : "Orders"}</th>
                <th>{bn ? "বুকিং" : "Bookings"}</th>
                <th>{bn ? "লিড" : "Leads"}</th>
                <th>{bn ? "অর্ডার মূল্য" : "Order value"}</th>
                <th>{bn ? "বুকিং মূল্য" : "Booking value"}</th>
                <th>{bn ? "সর্বশেষ কার্যক্রম" : "Last activity"}</th>
              </tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.phone}>
                    <td><div className="font-medium text-gray-900">{row.name || "—"}</div>{row.company && <div className="text-xs text-gray-400">{row.company}</div>}</td>
                    <td><div className="text-sm text-gray-700">{row.phone}</div><div className="text-xs text-gray-400">{row.email || "—"}</div></td>
                    <td>{row.order_count}</td>
                    <td>{row.booking_count}</td>
                    <td>{row.lead_count}</td>
                    <td className="font-medium">{formatPrice(row.order_value)}</td>
                    <td className="font-medium">{formatPrice(row.booking_value)}</td>
                    <td className="text-xs text-gray-500">{row.last_activity ? new Date(row.last_activity).toLocaleString("en-BD") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta.total_pages > 1 && (
          <div className="flex items-center justify-center gap-3 p-4 border-t border-gray-100">
            <button disabled={meta.page <= 1} onClick={() => void load(meta.page - 1, query)} className="admin-btn-secondary px-3 py-2 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-gray-500">{bn ? `পৃষ্ঠা ${meta.page} / ${meta.total_pages}` : `Page ${meta.page} / ${meta.total_pages}`}</span>
            <button disabled={meta.page >= meta.total_pages} onClick={() => void load(meta.page + 1, query)} className="admin-btn-secondary px-3 py-2 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
