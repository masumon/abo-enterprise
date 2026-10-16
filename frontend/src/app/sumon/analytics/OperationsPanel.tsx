"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { asArray, asNumber, asObject } from "@/lib/safeData";
import {
  Activity, AlertTriangle, CheckCircle2,
  Loader2, Mail, RefreshCw, ShieldCheck, XCircle,
} from "lucide-react";

interface HealthCheck { ok: boolean; [k: string]: unknown }
interface HealthData { checks: Record<string, HealthCheck>; healthy: number; total: number }

const CHECK_LABELS: Record<string, string> = {
  api: "API Server", database: "Database", smtp: "Email (SMTP)", cloudinary: "Cloudinary (Media)",
  ga4: "Google Analytics", sentry: "Error Monitoring (Sentry)", cache: "Cache", storage: "Storage",
  ai: "AI Providers", backup_cron: "Scheduled Backup",
};

function fmtAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return `${Math.round(s)}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 172800) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function Card({ title, icon: Icon, children, action }: {
  title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="admin-surface bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400" /> {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function EventList({ rows, empty }: { rows: { at: string; text: string; tone?: string }[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-gray-400 py-4 text-center">{empty}</p>;
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-2 text-xs border-b border-gray-50 pb-2 last:border-0">
          <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.tone === "error" ? "bg-red-500" : r.tone === "warning" ? "bg-amber-500" : "bg-gray-300"}`} />
          <span className="flex-1 text-gray-700 break-words">{r.text}</span>
          <span className="text-gray-400 flex-shrink-0">{fmtAgo(r.at)}</span>
        </div>
      ))}
    </div>
  );
}

export default function OperationsPanel() {
  const toast = useToastStore((s) => s.push);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [errors, setErrors] = useState<Record<string, never[]> | null>(null);
  const [security, setSecurity] = useState<Record<string, never[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setHealthLoading(true);
    // Health runs real network checks (SMTP/Cloudinary/GA4) — fetch it in
    // parallel but render the fast sections as soon as they arrive.
    api.get("/api/v1/admin/ops/health")
      .then((r) => {
        const h = asObject<HealthData>(r?.data?.data);
        setHealth(Object.keys(h).length ? { checks: asObject<Record<string, HealthCheck>>(h.checks) as Record<string, HealthCheck>, healthy: asNumber(h.healthy), total: asNumber(h.total) } : null);
      })
      .catch((e) => toast("error", apiErrorMessage(e, "সিস্টেম পরীক্ষা করা যায়নি")))
      .finally(() => setHealthLoading(false));
    try {
      const [er, sec] = await Promise.all([
        api.get("/api/v1/admin/ops/errors"),
        api.get("/api/v1/admin/ops/security"),
      ]);
      // Defensive: coerce each list to an array so an unexpected payload shape can't crash the panel.
      const listify = (raw: unknown, keys: string[]) => {
        const o = asObject<Record<string, unknown>>(raw);
        return { ...o, ...Object.fromEntries(keys.map((k) => [k, asArray(o[k])])) } as Record<string, never[]>;
      };
      setErrors(listify(er?.data?.data, ["runtime_errors", "failed_emails", "failed_payments"]));
      setSecurity(listify(sec?.data?.data, ["admin_accounts", "failed_logins", "audit_tail"]));
    } catch (e) {
      toast("error", apiErrorMessage(e, "তথ্য আনা যায়নি"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const sev = (s: string) => (s === "error" ? "text-red-600 bg-red-50" : s === "warning" ? "text-amber-600 bg-amber-50" : "text-blue-600 bg-blue-50");

  return (
    <div className="space-y-5">
      {/* ── System Health ── */}
      <Card title="সিস্টেমের অবস্থা" icon={Activity}
        action={
          <div className="flex items-center gap-2">
            {health && <span className="text-xs font-semibold text-gray-500">{health.healthy}/{health.total} ঠিক আছে</span>}
            <button type="button" onClick={loadAll} className="btn btn-outline btn-sm min-h-11 inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden /> আবার দেখুন
            </button>
          </div>
        }>
        {healthLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : health ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(health.checks).filter(([, c]) => c && typeof c === "object").map(([key, c]) => (
              <div key={key} className={`rounded-lg border p-3 ${c.ok ? "border-gray-100 bg-gray-50/50" : "border-red-200 bg-red-50/60"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {c.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  <p className="text-xs font-semibold text-gray-800">{CHECK_LABELS[key] ?? key}</p>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug break-words">
                  {key === "api" && c.ok ? `Uptime ${Math.round(Number(c.uptime_seconds) / 3600 * 10) / 10}h` : null}
                  {key === "database" && c.ok ? `${String(c.latency_ms)}ms latency` : null}
                  {key === "storage" && c.ok ? `DB ${String(c.database_mb)}MB · Media ${String(c.media_files)} files (${String(c.media_mb)}MB)` : null}
                  {key === "cache" && c.ok ? `${String(c.ga4_cached_reports)} GA4 reports cached` : null}
                  {key === "backup_cron" ? "Admin → Backup" : null}
                  {key === "ai" && c.ok ? `${String(c.working)}/${String(c.total)} working · ${String(c.used_today)} calls today` : null}
                  {key === "smtp" && c.ok ? String(c.email || c.host || "connected") : null}
                  {(key === "cloudinary" || key === "ga4" || key === "sentry") && c.ok ? "Connected" : null}
                  {!c.ok ? String(c.error ?? "Unavailable") : null}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-red-600">Health check failed — Refresh চাপুন</p>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* ── Error Center ── */}
        <Card title="ত্রুটি কেন্দ্র (গত ৭ দিন)" icon={AlertTriangle}>
          {loading ? <div className="h-32 bg-gray-50 rounded-lg animate-pulse" /> : errors && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Runtime Errors ({(errors.runtime_errors as unknown[]).length})</p>
                <EventList
                  rows={(errors.runtime_errors as { at: string; message: string; count?: number }[]).map((e) => ({
                    at: e.at,
                    text: (e.count && e.count > 1 ? `[×${e.count}] ` : "") + e.message,
                    tone: "error",
                  }))}
                  empty="রিস্টার্টের পর কোনো রানটাইম এরর নেই ✓"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><Mail className="w-3 h-3" /> Failed Emails ({(errors.failed_emails as unknown[]).length})</p>
                <EventList
                  rows={(errors.failed_emails as { at: string; subject: string; to: string }[]).map((e) => ({ at: e.at, text: `${e.subject} → ${e.to}`, tone: "error" }))}
                  empty="কোনো ইমেইল ফেইল হয়নি ✓"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Failed Payments ({(errors.failed_payments as unknown[]).length})</p>
                <EventList
                  rows={(errors.failed_payments as { at: string; order_number: string; total: number }[]).map((e) => ({ at: e.at, text: `${e.order_number} — ৳${asNumber(e.total).toLocaleString()}`, tone: "error" }))}
                  empty="কোনো ফেইলড পেমেন্ট নেই ✓"
                />
              </div>
              <p className="text-[11px] text-gray-400">{String(errors.note)}</p>
            </div>
          )}
        </Card>

        {/* ── Security Overview ── */}
        <Card title="নিরাপত্তার সারাংশ" icon={ShieldCheck}>
          {loading ? <div className="h-32 bg-gray-50 rounded-lg animate-pulse" /> : security && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Admin Accounts</p>
                <div className="space-y-1.5">
                  {(security.admin_accounts as { email: string; role: string; totp_enabled: boolean; last_login: string | null }[]).map((a) => (
                    <div key={a.email} className="flex items-center gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${a.totp_enabled ? "bg-emerald-500" : "bg-amber-400"}`} title={a.totp_enabled ? "2FA on" : "2FA off"} />
                      <span className="flex-1 text-gray-700 truncate">{a.email} <span className="text-gray-400">({a.role})</span></span>
                      <span className="text-gray-400">{a.totp_enabled ? "2FA ✓" : "2FA ✗"}</span>
                      <span className="text-gray-400">{a.last_login ? fmtAgo(a.last_login) : "never"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Failed Logins ({(security.failed_logins as unknown[]).length})</p>
                <EventList
                  rows={(security.failed_logins as { at: string; ip: string; email: string }[]).map((e) => ({ at: e.at, text: `${e.ip} — ${e.email}`, tone: "warning" }))}
                  empty="রিস্টার্টের পর কোনো ব্যর্থ লগইন নেই ✓"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Recent Audit Trail <a href="/sumon/audit" className="text-brand-600 hover:underline font-normal">— সব দেখুন</a></p>
                <EventList
                  rows={(security.audit_tail as { at: string; action: string; entity: string; by: string | null }[]).map((e) => ({ at: e.at, text: `${e.action} · ${e.entity}${e.by ? ` · ${e.by}` : ""}` }))}
                  empty="কোনো অডিট এন্ট্রি নেই"
                />
              </div>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
