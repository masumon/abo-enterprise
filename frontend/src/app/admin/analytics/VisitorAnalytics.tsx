"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import {
  Users, Radio, Eye, Clock, MousePointerClick, Globe2,
  Smartphone, Compass, MapPin, Package, Wrench, Mail, RefreshCw,
} from "lucide-react";

interface Row { [k: string]: string | number }

interface LiveData {
  active_users: number;
  active_pages: { pagePath: string; activeUsers: number }[];
  active_products: { pagePath: string; activeUsers: number }[];
  active_services: { pagePath: string; activeUsers: number }[];
  countries: Row[];
  cities: Row[];
  devices: Row[];
  browsers: Row[];
  traffic_sources: Row[];
  timeline: { minutesAgo: number; activeUsers: number }[];
  refreshed_at?: number;
  cache_ttl_seconds?: number;
}

interface HistoricalData {
  users: number;
  new_users: number;
  sessions: number;
  engaged_sessions: number;
  avg_session_duration_sec: number;
  bounce_rate_pct: number;
  engagement_rate_pct: number;
  page_views: number;
  top_pages: Row[];
  landing_pages: Row[];
  exit_pages: Row[];
  traffic_sources: Row[];
  channels: Row[];
  devices: Row[];
  browsers: Row[];
  operating_systems: Row[];
  countries: Row[];
  cities: Row[];
  peak_hours: Row[];
  top_products: Row[];
  top_services: Row[];
  conversion_rate_pct: number;
  contact_views: number;
  lead_generation: number;
  order_funnel: {
    sessions: number;
    engaged_sessions: number;
    product_page_views: number;
    service_page_views: number;
  };
  revenue: number | null;
}

interface VisitorData {
  configured: boolean;
  error?: boolean;
  days?: number;
  live?: LiveData;
  historical?: HistoricalData;
  realtime_active_users?: number;
  totals?: {
    visitors: number; new_visitors: number; sessions: number;
    page_views: number; avg_session_duration_sec: number; bounce_rate_pct: number;
    engaged_sessions?: number;
    engagement_rate_pct?: number;
  };
  daily?: { date: string; visitors: number }[];
  traffic_sources?: Row[];
  top_pages?: Row[];
  landing_pages?: Row[];
  exit_pages?: Row[];
  devices?: Row[];
  browsers?: Row[];
  operating_systems?: Row[];
  countries?: Row[];
  cities?: Row[];
  new_vs_returning?: Row[];
  peak_hours?: Row[];
  top_products?: Row[];
  top_services?: Row[];
  contact_page_views?: number;
  lead_generation?: number;
  conversion_rate_pct?: number;
  order_funnel?: {
    sessions: number;
    engaged_sessions: number;
    product_page_views: number;
    service_page_views: number;
  };
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(d: string): string {
  return d.length === 8 ? `${d.slice(6, 8)}/${d.slice(4, 6)}` : d;
}

/** Horizontal bar list — matches the Lead Funnel visual language. */
function BarList({ title, icon: Icon, rows, dim, metric, format }: {
  title: string;
  icon: React.ElementType;
  rows: Row[];
  dim: string;
  metric: string;
  format?: (v: string) => string;
}) {
  const max = Math.max(...rows.map((r) => Number(r[metric]) || 0), 1);
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4 text-gray-400" /> {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => {
            const v = Number(r[metric]) || 0;
            const label = format ? format(String(r[dim])) : String(r[dim]);
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-32 text-xs text-gray-600 truncate capitalize" title={label}>{label || "—"}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500/80" style={{ width: `${Math.max(3, (v / max) * 100)}%` }} />
                </div>
                <span className="w-12 text-xs font-semibold text-gray-900 text-right">{v.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
      <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-56 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );
}

export default function VisitorAnalytics({ days }: { days: number }) {
  const [data, setData] = useState<VisitorData | null>(null);
  const [live, setLive] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [refreshSeconds, setRefreshSeconds] = useState<number>(15);

  const loadHistorical = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await api.get(`/api/v1/admin/analytics/visitors?days=${days}`);
      setData(r.data.data as VisitorData);
      const full = r.data.data as VisitorData;
      if (full?.live) setLive(full.live);
      if (r.data.success === false) setLoadError(r.data.message ?? "Failed to load");
    } catch (e) {
      setLoadError(apiErrorMessage(e, "Failed to load visitor analytics"));
    } finally {
      setLoading(false);
    }
  };

  const loadLive = async () => {
    setLiveError(null);
    try {
      const r = await api.get("/api/v1/admin/analytics/visitors/live");
      if (r.data?.data?.configured === false) return;
      setLive(r.data.data as LiveData);
      if (r.data.success === false) setLiveError(r.data.message ?? "Failed to load live analytics");
    } catch (e) {
      setLiveError(apiErrorMessage(e, "Failed to load live analytics"));
    }
  };

  useEffect(() => { loadHistorical(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);
  useEffect(() => {
    if (!data?.configured) return;
    loadLive();
    const t = window.setInterval(loadLive, refreshSeconds * 1000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSeconds, data?.configured]);

  if (loading) return <Skeleton />;

  if (data && !data.configured) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-8 text-center max-w-2xl mx-auto">
        <Globe2 className="w-12 h-12 text-brand-400 mx-auto mb-4" />
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Visitor Analytics সেটআপ বাকি</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
          ভিজিটর ট্র্যাকিং (GA4 ট্যাগ) ইতিমধ্যে চালু — ডেটা Google Analytics-এ জমা হচ্ছে।
          এখানে রিপোর্ট দেখতে Render-এ ৩টি environment variable যোগ করুন:
        </p>
        <div className="text-left text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 space-y-1 mb-5 text-gray-700 dark:text-gray-200">
          <p>GA4_PROPERTY_ID=<span className="text-gray-400">123456789</span></p>
          <p>GA4_CLIENT_EMAIL=<span className="text-gray-400">name@project.iam.gserviceaccount.com</span></p>
          <p>GA4_PRIVATE_KEY=<span className="text-gray-400">-----BEGIN PRIVATE KEY-----\n…</span></p>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Google Cloud Console → Service Account তৈরি → JSON key → GA4 Property-তে
          সেই email-কে Viewer access দিন। সম্পূর্ণ ফ্রি।
        </p>
        <a
          href="https://analytics.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-brand btn-sm inline-flex"
        >
          Google Analytics খুলুন →
        </a>
      </div>
    );
  }

  if (loadError || !data?.totals) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-8 text-center">
        <p className="text-sm text-red-600 mb-3">{loadError ?? "Could not load visitor analytics"}</p>
        <button type="button" onClick={loadHistorical} className="btn btn-outline btn-sm inline-flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const historical: HistoricalData = data.historical ?? {
    users: Number(data.totals?.visitors ?? 0),
    new_users: Number(data.totals?.new_visitors ?? 0),
    sessions: Number(data.totals?.sessions ?? 0),
    engaged_sessions: Number(data.totals?.engaged_sessions ?? 0),
    avg_session_duration_sec: Number(data.totals?.avg_session_duration_sec ?? 0),
    bounce_rate_pct: Number(data.totals?.bounce_rate_pct ?? 0),
    engagement_rate_pct: Number(data.totals?.engagement_rate_pct ?? 0),
    page_views: Number(data.totals?.page_views ?? 0),
    top_pages: data.top_pages ?? [],
    landing_pages: data.landing_pages ?? [],
    exit_pages: data.exit_pages ?? [],
    traffic_sources: data.traffic_sources ?? [],
    channels: data.traffic_sources ?? [],
    devices: data.devices ?? [],
    browsers: data.browsers ?? [],
    operating_systems: data.operating_systems ?? [],
    countries: data.countries ?? [],
    cities: data.cities ?? [],
    peak_hours: data.peak_hours ?? [],
    top_products: data.top_products ?? [],
    top_services: data.top_services ?? [],
    conversion_rate_pct: Number(data.conversion_rate_pct ?? 0),
    contact_views: Number(data.contact_page_views ?? 0),
    lead_generation: Number(data.lead_generation ?? data.contact_page_views ?? 0),
    order_funnel: data.order_funnel ?? {
      sessions: Number(data.totals?.sessions ?? 0),
      engaged_sessions: Number(data.totals?.engaged_sessions ?? 0),
      product_page_views: 0,
      service_page_views: 0,
    },
    revenue: null,
  };

  const liveData: LiveData = live ?? {
    active_users: Number(data.realtime_active_users ?? 0),
    active_pages: [],
    active_products: [],
    active_services: [],
    countries: [],
    cities: [],
    devices: [],
    browsers: [],
    traffic_sources: [],
    timeline: [],
  };

  const daily = data.daily ?? [];
  const maxDaily = Math.max(...daily.map((d) => d.visitors), 1);
  const nvr = Object.fromEntries((data.new_vs_returning ?? []).map((r) => [r.newVsReturning, Number(r.activeUsers) || 0]));
  const cleanPath = (p: string) => p.replace(/\/$/, "") || "/";
  const lastSegment = (p: string) => decodeURIComponent(cleanPath(p).split("/").pop() || p).replace(/-/g, " ");

  const liveKpis = [
    { label: "Live Visitors", value: liveData.active_users.toLocaleString(), icon: Radio, color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
    { label: "Live Active Pages", value: liveData.active_pages.length.toLocaleString(), icon: Eye, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
    { label: "Live Products Viewed", value: liveData.active_products.length.toLocaleString(), icon: Package, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
    { label: "Live Services Viewed", value: liveData.active_services.length.toLocaleString(), icon: Wrench, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" },
  ];

  const historicalKpis = [
    { label: "Historical (GA4) Users", value: historical.users.toLocaleString(), icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
    { label: "Historical (GA4) New Users", value: historical.new_users.toLocaleString(), icon: Users, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30" },
    { label: "Historical (GA4) Sessions", value: historical.sessions.toLocaleString(), icon: Compass, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30" },
    { label: "Historical (GA4) Engaged Sessions", value: historical.engaged_sessions.toLocaleString(), icon: MousePointerClick, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Historical (GA4) Avg Session Duration", value: fmtDuration(historical.avg_session_duration_sec), icon: Clock, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30" },
    { label: "Historical (GA4) Bounce Rate", value: `${historical.bounce_rate_pct}%`, icon: MousePointerClick, color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
    { label: "Historical (GA4) Engagement Rate", value: `${historical.engagement_rate_pct}%`, icon: Compass, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30" },
    { label: "Historical (GA4) Page Views", value: historical.page_views.toLocaleString(), icon: Eye, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30" },
    { label: "Historical (GA4) Conversion Rate", value: `${historical.conversion_rate_pct}%`, icon: Users, color: "text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/30" },
    { label: "Historical (GA4) Contact Views", value: historical.contact_views.toLocaleString(), icon: Mail, color: "text-pink-600 bg-pink-50 dark:bg-pink-950/30" },
    { label: "Historical (GA4) Lead Generation", value: historical.lead_generation.toLocaleString(), icon: Mail, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30" },
    { label: "Historical (GA4) Revenue", value: historical.revenue == null ? "N/A" : historical.revenue.toLocaleString(), icon: Eye, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Live Analytics</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">Auto refresh</span>
            <select
              value={refreshSeconds}
              onChange={(e) => setRefreshSeconds(Number(e.target.value))}
              className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={30}>30s</option>
            </select>
            <button type="button" onClick={loadLive} className="btn btn-outline btn-sm inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {liveError ? <p className="text-xs text-red-600 mb-3">{liveError}</p> : null}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {liveKpis.map((k) => (
            <div key={k.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>
                <k.icon className="w-5 h-5 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{k.value}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 mb-4">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">Live Active User Timeline</h4>
          {liveData.timeline.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No live timeline data yet</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {liveData.timeline.map((point, i) => {
                const maxLive = Math.max(...liveData.timeline.map((x) => x.activeUsers), 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-green-500/80 hover:bg-green-500 rounded-t-sm transition-colors min-h-[2px]"
                      style={{ height: `${Math.max(3, (point.activeUsers / maxLive) * 100)}%` }}
                      title={`${point.minutesAgo}m ago: ${point.activeUsers}`}
                    />
                    {point.minutesAgo % 10 === 0 ? <span className="text-[9px] text-gray-400">-{point.minutesAgo}m</span> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <BarList title="Live Active Pages" icon={Eye} rows={liveData.active_pages as unknown as Row[]} dim="pagePath" metric="activeUsers" format={cleanPath} />
          <BarList title="Live Products Being Viewed" icon={Package} rows={liveData.active_products as unknown as Row[]} dim="pagePath" metric="activeUsers" format={lastSegment} />
          <BarList title="Live Services Being Viewed" icon={Wrench} rows={liveData.active_services as unknown as Row[]} dim="pagePath" metric="activeUsers" format={lastSegment} />
          <BarList title="Live Traffic Sources" icon={Compass} rows={liveData.traffic_sources} dim="sessionSource" metric="activeUsers" />
          <BarList title="Live Countries" icon={Globe2} rows={liveData.countries} dim="country" metric="activeUsers" />
          <BarList title="Live Cities" icon={MapPin} rows={liveData.cities} dim="city" metric="activeUsers" />
          <BarList title="Live Devices" icon={Smartphone} rows={liveData.devices} dim="deviceCategory" metric="activeUsers" />
          <BarList title="Live Browsers" icon={Globe2} rows={liveData.browsers} dim="browser" metric="activeUsers" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm">Historical (GA4)</h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {historicalKpis.map((k) => (
            <div key={k.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>
                <k.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{k.value}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 mb-4">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm">Historical (GA4) Active User Trend ({days}d)</h3>
          {daily.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No visitor data yet — GA4 needs 24–48h after setup</p>
          ) : (
            <>
              <div className="flex items-end gap-0.5 h-36 overflow-hidden">
                {daily.map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-brand-500 rounded-t-sm opacity-80 hover:opacity-100 transition-all min-h-[2px]"
                    style={{ height: `${Math.max(2, (d.visitors / maxDaily) * 100)}%` }}
                    title={`${fmtDate(d.date)}: ${d.visitors} visitors`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>{fmtDate(daily[0]?.date ?? "")}</span>
                <span>{fmtDate(daily[daily.length - 1]?.date ?? "")}</span>
              </div>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 mb-4">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">Historical (GA4) New vs Returning</h3>
          {(() => {
            const nv = nvr["new"] ?? 0;
            const rv = nvr["returning"] ?? 0;
            const total = nv + rv || 1;
            return (
              <>
                <div className="flex h-5 rounded-full overflow-hidden">
                  <div className="bg-brand-500" style={{ width: `${(nv / total) * 100}%` }} title={`New: ${nv}`} />
                  <div className="bg-emerald-500" style={{ width: `${(rv / total) * 100}%` }} title={`Returning: ${rv}`} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <span><span className="inline-block w-2 h-2 rounded-full bg-brand-500 mr-1.5" />New: {nv.toLocaleString()} ({Math.round((nv / total) * 100)}%)</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />Returning: {rv.toLocaleString()} ({Math.round((rv / total) * 100)}%)</span>
                </div>
              </>
            );
          })()}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <BarList title="Historical (GA4) Top Pages" icon={Eye} rows={historical.top_pages} dim="pagePath" metric="screenPageViews" format={cleanPath} />
          <BarList title="Historical (GA4) Landing Pages" icon={Eye} rows={historical.landing_pages} dim="landingPage" metric="sessions" format={cleanPath} />
          <BarList title="Historical (GA4) Exit Pages" icon={Eye} rows={historical.exit_pages} dim="pagePath" metric="exits" format={cleanPath} />
          <BarList title="Historical (GA4) Traffic Sources" icon={Compass} rows={historical.traffic_sources} dim="sessionDefaultChannelGroup" metric="sessions" />
          <BarList title="Historical (GA4) Channels" icon={Compass} rows={historical.channels} dim="sessionDefaultChannelGroup" metric="sessions" />
          <BarList title="Historical (GA4) Devices" icon={Smartphone} rows={historical.devices} dim="deviceCategory" metric="activeUsers" />
          <BarList title="Historical (GA4) Browsers" icon={Globe2} rows={historical.browsers} dim="browser" metric="activeUsers" />
          <BarList title="Historical (GA4) Operating Systems" icon={Smartphone} rows={historical.operating_systems} dim="operatingSystem" metric="activeUsers" />
          <BarList title="Historical (GA4) Countries" icon={Globe2} rows={historical.countries} dim="country" metric="activeUsers" />
          <BarList title="Historical (GA4) Cities" icon={MapPin} rows={historical.cities} dim="city" metric="activeUsers" />
          <BarList title="Historical (GA4) Top Products" icon={Package} rows={historical.top_products} dim="pagePath" metric="screenPageViews" format={lastSegment} />
          <BarList title="Historical (GA4) Top Services" icon={Wrench} rows={historical.top_services} dim="pagePath" metric="screenPageViews" format={lastSegment} />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm">Historical (GA4) Peak Hours</h3>
          {(() => {
            const hours = historical.peak_hours ?? [];
            const maxH = Math.max(...hours.map((h) => Number(h.activeUsers) || 0), 1);
            return (
              <div className="flex items-end gap-1 h-24">
                {Array.from({ length: 24 }).map((_, h) => {
                  const row = hours.find((r) => Number(r.hour) === h);
                  const v = Number(row?.activeUsers) || 0;
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-amber-400/80 hover:bg-amber-400 rounded-t-sm transition-colors min-h-[2px]"
                        style={{ height: `${Math.max(3, (v / maxH) * 100)}%` }}
                        title={`${h}:00 — ${v} visitors`}
                      />
                      {h % 6 === 0 && <span className="text-[9px] text-gray-400">{h}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">Historical (GA4) Order Funnel Sessions</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{historical.order_funnel.sessions.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">Historical (GA4) Order Funnel Engaged</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{historical.order_funnel.engaged_sessions.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">Historical (GA4) Product View Steps</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{historical.order_funnel.product_page_views.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">Historical (GA4) Service View Steps</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{historical.order_funnel.service_page_views.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 text-center">
        Source: Google Analytics 4 · Live cache {liveData.cache_ttl_seconds ?? refreshSeconds}s · Historical cache 5m · GA processing delay 24–48h can occur
      </p>
    </div>
  );
}
