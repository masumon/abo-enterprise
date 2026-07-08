"use client";

import { useEffect, useState } from "react";
import api, { downloadCsv, downloadPdf } from "@/lib/api";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useToastStore } from "@/store/toast";
import { apiErrorMessage } from "@/lib/apiError";
import { TrendingUp, ShoppingCart, Calendar, Users, Download, RefreshCw } from "lucide-react";

interface Overview {
  revenue: { orders: number; bookings: number; total: number };
  counts: { orders: number; bookings: number; leads: number; leads_won: number };
  conversion_rate: number;
  top_services: { service_id: string; count: number; revenue: number }[];
}

interface ChartDay { date: string; orders: number; bookings: number; total: number }

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [chart, setChart] = useState<ChartDay[]>([]);
  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const toast = useToastStore((s) => s.push);

  async function handleExport(path: string, filename: string, key: string) {
    setExporting(key);
    try {
      if (filename.endsWith(".pdf")) await downloadPdf(path, filename);
      else await downloadCsv(path, filename);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Export failed"));
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => { fetchAll(); }, [days]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [ov, ch, fn] = await Promise.all([
        api.get(`/api/v1/admin/analytics/overview?days=${days}`),
        api.get(`/api/v1/admin/analytics/revenue-chart?days=${days}`),
        api.get(`/api/v1/admin/analytics/lead-funnel?days=${days}`),
      ]);
      setOverview(ov.data.data);
      setChart(ch.data.data);
      setFunnel(fn.data.data);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load analytics"));
    } finally {
      setLoading(false);
    }
  }

  const maxRev = Math.max(...chart.map(d => d.total), 1);
  const funnelStages = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"];
  const maxFunnel = Math.max(...Object.values(funnel), 1);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        titleBn="বিজনেস রিপোর্ট"
        description="Revenue, orders, bookings, leads & export"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="admin-input w-auto py-2"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button type="button" onClick={fetchAll} className="admin-btn-secondary !py-2 !px-3">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `৳${((overview?.revenue.total || 0)).toLocaleString()}`, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
          { label: "Orders", value: overview?.counts.orders || 0, icon: ShoppingCart, color: "text-green-600 bg-green-50" },
          { label: "Bookings", value: overview?.counts.bookings || 0, icon: Calendar, color: "text-purple-600 bg-purple-50" },
          { label: "Lead Conversion", value: `${overview?.conversion_rate || 0}%`, icon: Users, color: "text-orange-600 bg-orange-50" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : card.value}</p>
            <p className="text-gray-500 text-sm">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart (bar) */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Revenue ({days}d)</h2>
          <button
            type="button"
            onClick={() => handleExport(`/api/v1/admin/bulk/export/orders?days=${days}`, `orders-${days}d.csv`, "chart-orders")}
            disabled={exporting === "chart-orders"}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> {exporting === "chart-orders" ? "Exporting…" : "Export CSV"}
          </button>
        </div>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-gray-400">Loading...</div>
        ) : (
          <div className="flex items-end gap-0.5 h-40 overflow-hidden">
            {chart.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div
                  className="w-full bg-blue-500 rounded-t-sm opacity-80 hover:opacity-100 transition-all min-h-[2px]"
                  style={{ height: `${Math.max(2, (d.total / maxRev) * 100)}%` }}
                  title={`${d.date}: ৳${d.total.toLocaleString()}`}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>{chart[0]?.date}</span>
          <span>{chart[chart.length - 1]?.date}</span>
        </div>
      </div>

      {/* Lead Funnel */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-5">Lead Funnel</h2>
        <div className="space-y-3">
          {funnelStages.map(stage => {
            const count = funnel[stage] || 0;
            const pct = Math.round((count / maxFunnel) * 100);
            const colors: Record<string, string> = {
              new: "bg-blue-500", contacted: "bg-indigo-500", qualified: "bg-purple-500",
              proposal_sent: "bg-yellow-500", negotiation: "bg-orange-500",
              won: "bg-green-500", lost: "bg-red-400"
            };
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-28 text-sm text-gray-600 capitalize">{stage.replaceAll("_", " ")}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${colors[stage]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-sm font-semibold text-gray-900 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk Export */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-4">Export Data</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Products CSV", path: "/api/v1/admin/bulk/export/products", filename: "products.csv", key: "products" },
            { label: "Products PDF", path: "/api/v1/admin/bulk/export/products/pdf", filename: "products.pdf", key: "products-pdf" },
            { label: `Orders CSV (${days}d)`, path: `/api/v1/admin/bulk/export/orders?days=${days}`, filename: `orders-${days}d.csv`, key: "orders" },
            { label: `Orders PDF (${days}d)`, path: `/api/v1/admin/bulk/export/orders/pdf?days=${days}`, filename: `orders-${days}d.pdf`, key: "orders-pdf" },
            { label: "Leads CSV", path: "/api/v1/admin/bulk/export/leads", filename: "service-leads.csv", key: "leads" },
            { label: "Leads PDF", path: "/api/v1/admin/bulk/export/leads/pdf", filename: "service-leads.pdf", key: "leads-pdf" },
            { label: "Bookings CSV", path: "/api/v1/admin/bulk/export/bookings", filename: "service-bookings.csv", key: "bookings" },
            { label: "Bookings PDF", path: "/api/v1/admin/bulk/export/bookings/pdf", filename: "service-bookings.pdf", key: "bookings-pdf" },
          ].map(btn => (
            <button
              key={btn.label}
              type="button"
              onClick={() => handleExport(btn.path, btn.filename, btn.key)}
              disabled={exporting === btn.key}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting === btn.key ? "Exporting…" : btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
