"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import {
  Users, Radio, Eye, Clock, MousePointerClick, Globe2,
  Smartphone, Compass, MapPin, Package, Wrench, Mail, RefreshCw,
} from "lucide-react";

interface Row { [k: string]: string | number }
interface VisitorData {
  configured: boolean;
  error?: boolean;
  days?: number;
  realtime_active_users?: number;
  totals?: {
    visitors: number; new_visitors: number; sessions: number;
    page_views: number; avg_session_duration_sec: number; bounce_rate_pct: number;
  };
  daily?: { date: string; visitors: number }[];
  traffic_sources?: Row[];
  top_pages?: Row[];
  devices?: Row[];
  browsers?: Row[];
  countries?: Row[];
  cities?: Row[];
  new_vs_returning?: Row[];
  peak_hours?: Row[];
  top_products?: Row[];
  top_services?: Row[];
  contact_page_views?: number;
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await api.get(`/api/v1/admin/analytics/visitors?days=${days}`);
      setData(r.data.data as VisitorData);
      if (r.data.success === false) setLoadError(r.data.message ?? "Failed to load");
    } catch (e) {
      setLoadError(apiErrorMessage(e, "Failed to load visitor analytics"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);

  if (loading) return <Skeleton />;

  if (data && !data.configured) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center max-w-2xl mx-auto">
        <Globe2 className="w-12 h-12 text-brand-400 mx-auto mb-4" />
        <h3 className="font-bold text-gray-900 mb-2">Visitor Analytics সেটআপ বাকি</h3>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          ভিজিটর ট্র্যাকিং (GA4 ট্যাগ) ইতিমধ্যে চালু — ডেটা Google Analytics-এ জমা হচ্ছে।
          এখানে রিপোর্ট দেখতে Render-এ ৩টি environment variable যোগ করুন:
        </p>
        <div className="text-left text-xs font-mono bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-1 mb-5">
          <p>GA4_PROPERTY_ID=<span className="text-gray-400">123456789</span></p>
          <p>GA4_CLIENT_EMAIL=<span className="text-gray-400">name@project.iam.gserviceaccount.com</span></p>
          <p>GA4_PRIVATE_KEY=<span className="text-gray-400">-----BEGIN PRIVATE KEY-----\n…</span></p>
        </div>
        <p className="text-xs text-gray-400 mb-5">
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
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
        <p className="text-sm text-red-600 mb-3">{loadError ?? "Could not load visitor analytics"}</p>
        <button type="button" onClick={load} className="btn btn-outline btn-sm inline-flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const t = data.totals;
  const daily = data.daily ?? [];
  const maxDaily = Math.max(...daily.map((d) => d.visitors), 1);
  const nvr = Object.fromEntries((data.new_vs_returning ?? []).map((r) => [r.newVsReturning, Number(r.activeUsers) || 0]));
  const cleanPath = (p: string) => p.replace(/\/$/, "") || "/";
  const lastSegment = (p: string) => decodeURIComponent(cleanPath(p).split("/").pop() || p).replace(/-/g, " ");

  const kpis = [
    { label: "Live Visitors", value: data.realtime_active_users ?? 0, icon: Radio, color: "text-green-600 bg-green-50", pulse: true },
    { label: `Visitors (${days}d)`, value: t.visitors.toLocaleString(), icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Page Views", value: t.page_views.toLocaleString(), icon: Eye, color: "text-purple-600 bg-purple-50" },
    { label: "Avg. Session", value: fmtDuration(t.avg_session_duration_sec), icon: Clock, color: "text-orange-600 bg-orange-50" },
    { label: "Bounce Rate", value: `${t.bounce_rate_pct}%`, icon: MousePointerClick, color: "text-red-600 bg-red-50" },
    { label: "New Visitors", value: t.new_visitors.toLocaleString(), icon: Users, color: "text-teal-600 bg-teal-50" },
    { label: "Sessions", value: t.sessions.toLocaleString(), icon: Compass, color: "text-indigo-600 bg-indigo-50" },
    { label: "Contact Views", value: Number(data.contact_page_views ?? 0).toLocaleString(), icon: Mail, color: "text-pink-600 bg-pink-50" },
  ];

  return (
    <div className="space-y-4">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>
              <k.icon className={`w-5 h-5 ${k.pulse ? "animate-pulse" : ""}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-gray-500 text-sm">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Daily visitors chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4 text-sm">Daily Visitors ({days}d)</h3>
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

      {/* New vs Returning */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-3 text-sm">New vs Returning</h3>
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
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span><span className="inline-block w-2 h-2 rounded-full bg-brand-500 mr-1.5" />New: {nv.toLocaleString()} ({Math.round((nv / total) * 100)}%)</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />Returning: {rv.toLocaleString()} ({Math.round((rv / total) * 100)}%)</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Grids of bar lists */}
      <div className="grid md:grid-cols-2 gap-4">
        <BarList title="Traffic Sources" icon={Compass} rows={data.traffic_sources ?? []} dim="sessionDefaultChannelGroup" metric="sessions" />
        <BarList title="Top Pages" icon={Eye} rows={data.top_pages ?? []} dim="pagePath" metric="screenPageViews" format={cleanPath} />
        <BarList title="Devices" icon={Smartphone} rows={data.devices ?? []} dim="deviceCategory" metric="activeUsers" />
        <BarList title="Browsers" icon={Globe2} rows={data.browsers ?? []} dim="browser" metric="activeUsers" />
        <BarList title="Countries" icon={Globe2} rows={data.countries ?? []} dim="country" metric="activeUsers" />
        <BarList title="Cities" icon={MapPin} rows={data.cities ?? []} dim="city" metric="activeUsers" />
        <BarList title="Most Viewed Products" icon={Package} rows={data.top_products ?? []} dim="pagePath" metric="screenPageViews" format={lastSegment} />
        <BarList title="Most Viewed Services" icon={Wrench} rows={data.top_services ?? []} dim="pagePath" metric="screenPageViews" format={lastSegment} />
      </div>

      {/* Peak hours */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4 text-sm">Peak Active Hours (visitor time zone)</h3>
        {(() => {
          const hours = data.peak_hours ?? [];
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

      <p className="text-[11px] text-gray-400 text-center">
        Source: Google Analytics 4 · ৫ মিনিট ক্যাশ · GA প্রসেসিংয়ে ২৪–৪৮ ঘণ্টা দেরি স্বাভাবিক
      </p>
    </div>
  );
}
