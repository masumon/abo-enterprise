"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api, { downloadCsv } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import {
  Activity, AlertTriangle, Bell, CheckCircle2, Database, Download,
  HardDrive, Loader2, Mail, RefreshCw, ShieldCheck, Upload, XCircle,
} from "lucide-react";

interface HealthCheck { ok: boolean; [k: string]: unknown }
interface HealthData { checks: Record<string, HealthCheck>; healthy: number; total: number }
interface FeedItem { severity: "error" | "warning" | "info"; kind: string; at: string; text: string }

const CHECK_LABELS: Record<string, string> = {
  api: "API Server", database: "Database", smtp: "Email (SMTP)", cloudinary: "Cloudinary (Media)",
  ga4: "Google Analytics", sentry: "Error Monitoring (Sentry)", cache: "Cache", storage: "Storage",
  backup_cron: "Scheduled Backup",
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
    <div className="bg-white rounded-xl border border-gray-100 p-5">
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
  const [feed, setFeed] = useState<{ items: FeedItem[]; counts: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{ update_count: number; create_count: number; payload: unknown } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setHealthLoading(true);
    // Health runs real network checks (SMTP/Cloudinary/GA4) — fetch it in
    // parallel but render the fast sections as soon as they arrive.
    api.get("/api/v1/admin/ops/health")
      .then((r) => setHealth(r.data.data))
      .catch((e) => toast("error", apiErrorMessage(e, "Health check failed")))
      .finally(() => setHealthLoading(false));
    try {
      const [er, sec, nf] = await Promise.all([
        api.get("/api/v1/admin/ops/errors"),
        api.get("/api/v1/admin/ops/security"),
        api.get("/api/v1/admin/ops/notifications"),
      ]);
      setErrors(er.data.data);
      setSecurity(sec.data.data);
      setFeed(nf.data.data);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load operations data"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const exportBackup = async () => {
    setExporting(true);
    try {
      await downloadCsv("/api/v1/admin/ops/backup/export", `abo-content-backup-${new Date().toISOString().slice(0, 10)}.json`);
      toast("success", "কনটেন্ট ব্যাকআপ ডাউনলোড হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const pickRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const r = await api.post("/api/v1/admin/ops/backup/restore-settings?dry_run=true", payload);
      setRestorePreview({ ...r.data.data, payload });
    } catch (err) {
      toast("error", apiErrorMessage(err, "Invalid backup file"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmRestore = async () => {
    if (!restorePreview) return;
    setRestoring(true);
    try {
      const r = await api.post("/api/v1/admin/ops/backup/restore-settings?dry_run=false", restorePreview.payload);
      toast("success", `রিস্টোর সম্পন্ন: ${r.data.data.update_count} আপডেট, ${r.data.data.create_count} নতুন`);
      setRestorePreview(null);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Restore failed"));
    } finally {
      setRestoring(false);
    }
  };

  const sev = (s: string) => (s === "error" ? "text-red-600 bg-red-50" : s === "warning" ? "text-amber-600 bg-amber-50" : "text-blue-600 bg-blue-50");

  return (
    <div className="space-y-5">
      {/* ── Notification Center ── */}
      <Card
        title="Notification Center"
        icon={Bell}
        action={
          <div className="flex items-center gap-2">
            {feed && (
              <span className="text-xs text-gray-400">
                {feed.counts.error} error · {feed.counts.warning} warning · {feed.counts.info} info
              </span>
            )}
            <button type="button" onClick={loadAll} className="btn btn-outline btn-sm inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="h-24 bg-gray-50 rounded-lg animate-pulse" />
        ) : !feed?.items.length ? (
          <p className="text-sm text-emerald-600 py-4 text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> সব ঠিক আছে — কোনো নোটিফিকেশন নেই
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {feed.items.map((n, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sev(n.severity)} flex-shrink-0 mt-0.5`}>{n.severity}</span>
                <span className="flex-1 text-gray-700 text-xs leading-relaxed">{n.text}</span>
                <span className="text-[11px] text-gray-400 flex-shrink-0">{fmtAgo(n.at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── System Health ── */}
      <Card title="System Health" icon={Activity}
        action={health && <span className="text-xs font-semibold text-gray-500">{health.healthy}/{health.total} healthy</span>}>
        {healthLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : health ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(health.checks).map(([key, c]) => (
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
                  {key === "backup_cron" ? "Weekly (GitHub Actions)" : null}
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
        <Card title="Error Center (last 7 days)" icon={AlertTriangle}>
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
                  rows={(errors.failed_payments as { at: string; order_number: string; total: number }[]).map((e) => ({ at: e.at, text: `${e.order_number} — ৳${e.total.toLocaleString()}`, tone: "error" }))}
                  empty="কোনো ফেইলড পেমেন্ট নেই ✓"
                />
              </div>
              <p className="text-[11px] text-gray-400">{String(errors.note)}</p>
            </div>
          )}
        </Card>

        {/* ── Security Overview ── */}
        <Card title="Security Overview" icon={ShieldCheck}>
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
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Recent Audit Trail <a href="/admin/audit" className="text-brand-600 hover:underline font-normal">— সব দেখুন</a></p>
                <EventList
                  rows={(security.audit_tail as { at: string; action: string; entity: string; by: string | null }[]).map((e) => ({ at: e.at, text: `${e.action} · ${e.entity}${e.by ? ` · ${e.by}` : ""}` }))}
                  empty="কোনো অডিট এন্ট্রি নেই"
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Backup & Restore ── */}
      <Card title="Backup & Restore" icon={Database}>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border border-gray-100 p-4">
            <p className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> Full Database (Scheduled)</p>
            <p className="text-gray-500 leading-relaxed mb-2">প্রতি শুক্রবার GitHub Actions-এ সম্পূর্ণ pg_dump (৩০ দিন সংরক্ষিত)।</p>
            <a href="https://github.com/masumon/abo-enterprise/actions/workflows/db-backup.yml" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline font-medium">
              Backup History (GitHub) →
            </a>
          </div>
          <div className="rounded-lg border border-gray-100 p-4">
            <p className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Manual Content Backup</p>
            <p className="text-gray-500 leading-relaxed mb-2">সেটিংস + পণ্য + সেবা — JSON ফাইলে এখনই ডাউনলোড।</p>
            <button type="button" onClick={exportBackup} disabled={exporting} className="btn btn-brand btn-sm inline-flex items-center gap-1.5">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download Backup
            </button>
          </div>
          <div className="rounded-lg border border-gray-100 p-4">
            <p className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Restore Settings</p>
            <p className="text-gray-500 leading-relaxed mb-2">ব্যাকআপ JSON থেকে CMS সেটিংস ফেরত আনুন — আগে প্রিভিউ, কিছুই মুছে যায় না।</p>
            {!restorePreview ? (
              <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-outline btn-sm inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Choose Backup File
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-amber-700 bg-amber-50 rounded px-2 py-1.5">
                  প্রিভিউ: <strong>{restorePreview.update_count}</strong> সেটিংস বদলাবে, <strong>{restorePreview.create_count}</strong> নতুন তৈরি হবে
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={confirmRestore} disabled={restoring} className="btn btn-brand btn-sm">
                    {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Restore"}
                  </button>
                  <button type="button" onClick={() => setRestorePreview(null)} className="btn btn-outline btn-sm">Cancel</button>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={pickRestoreFile} />
          </div>
        </div>
      </Card>
    </div>
  );
}
