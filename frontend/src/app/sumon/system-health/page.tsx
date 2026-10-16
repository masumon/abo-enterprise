"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, HeartPulse, Loader2, RefreshCw, XCircle } from "lucide-react";
import api from "@/lib/api";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatusCard, { type StatusState } from "@/components/admin/StatusCard";
import { useHashScroll } from "@/hooks/useHashScroll";
import { asObject } from "@/lib/safeData";
import { HEALTH_GROUPS, SERVICE_META, errorOf, failingChecks, healthDetail, type HealthCheck, type HealthData } from "@/lib/systemHealth";

/** One place for every outside service the site depends on: Render, Supabase, Cloudinary,
 * Cloudflare, cron-job.org, Resend, Sentry, AI … Green tick when fine, red with the reason
 * and the exact steps when not. All IDs/keys are read by the server from its environment. */
export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState<Date | null>(null);
  useHashScroll(!!health);

  const load = useCallback(async () => {
    setBusy(true); setFailed(false);
    try {
      const r = await api.get("/api/v1/admin/ops/health");
      const d = asObject<Partial<HealthData>>(r.data?.data);
      if (!d.checks) throw new Error("empty");
      setHealth(d as HealthData);
      setAt(new Date());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const bad = failingChecks(health);
  const stateOf = (c: HealthCheck): StatusState => (c.skipped ? "todo" : c.ok ? "ok" : "error");

  const card = (key: string) => {
    const c = health?.checks?.[key];
    const m = SERVICE_META[key];
    if (!c || !m) return null;
    const st = stateOf(c);
    return (
      <StatusCard key={key} id={key} state={st} title={m.name} subtitle={st === "error" ? errorOf(c) : healthDetail(key, c) || m.what}
        leading={st === "ok" ? <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-none" aria-hidden /> : st === "error" ? <XCircle className="w-6 h-6 text-red-600 flex-none" aria-hidden /> : <HeartPulse className="w-6 h-6 text-amber-500 flex-none" aria-hidden />}>
        {st === "error" && <p role="alert" className="rounded-lg bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300 px-3 py-2 text-sm break-words"><b>ব্যর্থতার কারণ:</b> {errorOf(c)}</p>}
        {st === "todo" && <p className="rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 px-3 py-2 text-sm break-words">{errorOf(c)}</p>}
        {st === "ok" && healthDetail(key, c) && <p className="text-sm text-gray-700 dark:text-gray-300">{healthDetail(key, c)}</p>}
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">কীভাবে বসাবেন / ঠিক করবেন</p>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">{m.steps.map((s, i) => <li key={i} className="break-words">{s}</li>)}</ol>
        </div>
        {m.env && <p className="text-xs text-gray-500">Render → Environment ভ্যারিয়েবল: {m.env.map((e) => <code key={e} className="mx-0.5 rounded bg-gray-100 dark:bg-white/10 px-1.5 py-0.5">{e}</code>)} (মান বসালে এখানে নিজে থেকেই ধরা পড়বে)</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} disabled={busy} className="btn btn-brand min-h-11 px-4 gap-1.5 justify-center">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <RefreshCw className="w-4 h-4" aria-hidden />} পরীক্ষা করুন
          </button>
          {m.link && <Link href={m.link.href} className="btn btn-outline min-h-11 px-4">{m.link.label} →</Link>}
          {m.external && <a href={m.external.href} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-11 px-4 gap-1.5 inline-flex items-center">{m.external.label}<ExternalLink className="w-3.5 h-3.5" aria-hidden /></a>}
        </div>
      </StatusCard>
    );
  };

  return (
    <div className="admin-page space-y-5">
      <AdminPageHeader title="System Health" titleBn="সিস্টেম হেলথ"
        descriptionBn="সব বাইরের সার্ভিস এক জায়গায় — ঠিক থাকলে সবুজ টিক, সমস্যা হলে কারণসহ লাল চিহ্ন।"
        description="Every outside service in one place — green tick when fine, red with the reason when not."
        actions={<button type="button" onClick={() => void load()} disabled={busy} className="btn btn-brand min-h-11 px-4 gap-1.5 justify-center">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <RefreshCw className="w-4 h-4" aria-hidden />} সব আবার পরীক্ষা করুন</button>} />

      {failed && <p role="alert" className="rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm">পরীক্ষা চালানো যায়নি — API সার্ভার ঘুমিয়ে থাকতে পারে, ১ মিনিট পর আবার চাপুন।</p>}

      {health && (
        <div className={`rounded-2xl border p-4 flex flex-wrap items-center gap-3 ${bad.length ? "border-red-300 bg-red-50/60 dark:bg-red-500/10" : "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-500/10"}`}>
          {bad.length ? <XCircle className="w-8 h-8 text-red-600 flex-none" aria-hidden /> : <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-none" aria-hidden />}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 dark:text-gray-100">{bad.length ? `${bad.length}টি সার্ভিসে সমস্যা` : "সব সার্ভিস ঠিক আছে"}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{health.healthy}/{health.total} ঠিক{health.skipped ? ` · ${health.skipped}টি ঐচ্ছিক (কী দেওয়া নেই)` : ""}{at ? ` · ${at.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}-এ পরীক্ষিত` : ""}</p>
          </div>
          {bad.length > 0 && <div className="flex flex-wrap gap-2">{bad.map((b) => <a key={b.key} href={`#${b.key}`} className="rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200 px-3 min-h-9 inline-flex items-center text-xs font-semibold">{b.name}</a>)}</div>}
        </div>
      )}

      {busy && !health && <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}</div>}

      {health && HEALTH_GROUPS.map((g) => {
        const cards = g.keys.map(card).filter(Boolean);
        return cards.length ? (
          <section key={g.id} className="space-y-3" aria-label={g.title}>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{g.title}</h2>
            <div className="admin-pair-grid grid gap-3 lg:grid-cols-2 items-start">{cards}</div>
          </section>
        ) : null;
      })}
    </div>
  );
}
