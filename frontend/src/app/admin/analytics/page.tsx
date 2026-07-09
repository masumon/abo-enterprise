"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api, { downloadCsv, downloadPdf } from "@/lib/api";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useToastStore } from "@/store/toast";
import { apiErrorMessage } from "@/lib/apiError";
import {
  TrendingUp, TrendingDown, ShoppingCart, Calendar, Users, Download,
  RefreshCw, BarChart3, Globe2, Package, Wrench, Trophy,
} from "lucide-react";

// Lazy: GA4 dashboard code only downloads when the Visitors tab is opened
const VisitorAnalytics = dynamic(() => import("./VisitorAnalytics"), {
  loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />,
});

interface Overview {
  revenue: { orders: number; bookings: number; total: number };
  counts: { orders: number; bookings: number; leads: number; leads_won: number };
  conversion_rate: number;
  trends?: {
    revenue_pct: number | null;
    orders_pct: number | null;
    bookings_pct: number | null;
    leads_pct: number | null;
  };
  top_services: { service_id: string; name?: string; name_bn?: string; count: number; revenue: number }[];
}

interface ChartDay { date: string; orders: number; bookings: number; total: number }
interface TopProduct { product: string; orders: number; revenue: number }

/** ▲ +12.5% / ▼ -3.2% chip vs the previous period; hidden when no baseline. */
function TrendChip({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
        up ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
      }`}
      title="Compared with the previous period of the same length"
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

/** Ranked list with revenue bars — shared by Top Products / Top Services. */
function TopList({ title, icon: Icon, rows, emptyText }: {
  title: string;
  icon: React.ElementType;
  rows: { label: string; sub: string; revenue: number }[];
  emptyText: string;
}) {
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4 text-gray-400" /> {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                i === 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 truncate" title={r.label}>{r.label}</p>
                  <p className="text-sm font-semibold text-gray-900 flex-shrink-0">৳{r.revenue.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500/70" style={{ width: `${Math.max(4, (r.revenue / max) * 100)}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{r.sub}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"business" | "visitors">("business");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [chart, setChart] = useState<ChartDay[]>([]);
  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
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

  useEffect(() => { if (tab === "business") fetchAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days, tab]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [ov, ch, fn, tp] = await Promise.all([
        api.get(`/api/v1/admin/analytics/overview?days=${days}`),
        api.get(`/api/v1/admin/analytics/revenue-chart?days=${days}`),
        api.get(`/api/v1/admin/analytics/lead-funnel?days=${days}`),
        api.get(`/api/v1/admin/analytics/top-products?days=${days}&limit=5`).catch(() => null),
      ]);
      setOverview(ov.data.data);
      setChart(ch.data.data);
      setFunnel(fn.data.data);
      setTopProducts(tp?.data?.data ?? []);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load analytics"));
    } finally {
      setLoading(false);
    }
  }

  const maxRev = Math.max(...chart.map(d => d.total), 1);
  const periodTotal = chart.reduce((sum, d) => sum + d.total, 0);
  const dailyAvg = chart.length ? periodTotal / chart.length : 0;
  const funnelStages = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"];
  const maxFunnel = Math.max(...Object.values(funnel), 1);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        titleBn="বিজনেস রিপোর্ট"
        description="Business reports (database) + Live and Historical (GA4) visitor analytics"
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

      {/* Section tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {([
          { id: "business", label: "Business Analytics", icon: BarChart3 },
          { id: "visitors", label: "Visitor Analytics (Live + Historical GA4)", icon: Globe2 },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-white dark:bg-gray-900 text-brand-700 dark:text-brand-300 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "visitors" && <VisitorAnalytics days={days} />}

      {tab === "business" && (<>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            value: `৳${((overview?.revenue.total || 0)).toLocaleString()}`,
            sub: `Orders ৳${(overview?.revenue.orders || 0).toLocaleString()} · Bookings ৳${(overview?.revenue.bookings || 0).toLocaleString()}`,
            trend: overview?.trends?.revenue_pct,
            icon: TrendingUp, color: "text-blue-600 bg-blue-50",
          },
          {
            label: "Orders",
            value: overview?.counts.orders || 0,
            sub: null,
            trend: overview?.trends?.orders_pct,
            icon: ShoppingCart, color: "text-green-600 bg-green-50",
          },
          {
            label: "Bookings",
            value: overview?.counts.bookings || 0,
            sub: null,
            trend: overview?.trends?.bookings_pct,
            icon: Calendar, color: "text-purple-600 bg-purple-50",
          },
          {
            label: "Lead Conversion",
            value: `${overview?.conversion_rate || 0}%`,
            sub: `${overview?.counts.leads_won || 0} won of ${overview?.counts.leads || 0} leads`,
            trend: overview?.trends?.leads_pct,
            icon: Users, color: "text-orange-600 bg-orange-50",
          },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              {!loading && <TrendChip pct={card.trend} />}
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : card.value}</p>
            <p className="text-gray-500 text-sm">{card.label}</p>
            {card.sub && !loading && (
              <p className="text-[11px] text-gray-400 mt-1 truncate" title={card.sub}>{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Revenue Chart — stacked orders + bookings */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="font-bold text-gray-900">Revenue ({days}d)</h2>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Orders
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-400" /> Bookings
            </span>
            <button
              type="button"
              onClick={() => handleExport(`/api/v1/admin/bulk/export/orders?days=${days}`, `orders-${days}d.csv`, "chart-orders")}
              disabled={exporting === "chart-orders"}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> {exporting === "chart-orders" ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          {loading ? " " : <>Period total <span className="font-semibold text-gray-600">৳{periodTotal.toLocaleString()}</span> · Daily average ৳{Math.round(dailyAvg).toLocaleString()}</>}
        </p>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-gray-400">Loading...</div>
        ) : (
          <div className="flex items-end gap-0.5 h-40 overflow-hidden">
            {chart.map((d, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end h-full group relative opacity-85 hover:opacity-100 transition-opacity"
                title={`${d.date} — Orders: ৳${d.orders.toLocaleString()} · Bookings: ৳${d.bookings.toLocaleString()} · Total: ৳${d.total.toLocaleString()}`}
              >
                <div
                  className="w-full bg-purple-400 rounded-t-sm"
                  style={{ height: `${(d.bookings / maxRev) * 100}%` }}
                />
                <div
                  className={`w-full bg-blue-500 ${d.bookings === 0 ? "rounded-t-sm" : ""} min-h-[2px]`}
                  style={{ height: `${Math.max(d.total > 0 ? 1 : 0.5, (d.orders / maxRev) * 100)}%` }}
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

      {/* Best sellers */}
      <div className="grid md:grid-cols-2 gap-4">
        <TopList
          title={`Top Products by Revenue (${days}d)`}
          icon={Package}
          rows={topProducts.map((p) => ({
            label: p.product,
            sub: `${p.orders} order${p.orders === 1 ? "" : "s"}`,
            revenue: p.revenue,
          }))}
          emptyText="No product sales in this period"
        />
        <TopList
          title={`Top Services by Bookings (${days}d)`}
          icon={Wrench}
          rows={(overview?.top_services ?? []).map((s) => ({
            label: s.name || "Unknown service",
            sub: `${s.count} booking${s.count === 1 ? "" : "s"}`,
            revenue: s.revenue,
          }))}
          emptyText="No bookings in this period"
        />
      </div>

      {/* Lead Funnel */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gray-400" /> Lead Funnel
        </h2>
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
      </>)}
    </div>
  );
}
