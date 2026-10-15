"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowDown, ArrowUp, Bot, CheckCircle2, ChevronDown, ClipboardPaste, Copy, ExternalLink, Loader2,
  Plus, Power, RefreshCw, Sparkles, Trash2, X, Zap,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { assistantAdminApi } from "@/lib/api";
import {
  aiHubApi, browserAi, guideOf, modelBadges, PROVIDER_GUIDES, TASKS,
  type HubConn, type HubSummary, type HubTask, type ProviderGuide,
} from "@/lib/aiHub";
import { useToastStore } from "@/store/toast";
import { getBrowserApiBaseUrl } from "@/lib/apiBase";

const errText = (e: unknown, fb: string) =>
  (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || fb;

const STATUS: Record<string, { bn: string; cls: string }> = {
  ok: { bn: "কাজ করছে", cls: "bg-emerald-100 text-emerald-700" },
  limit: { bn: "সীমা শেষ — নিজে আবার চালু হবে", cls: "bg-amber-100 text-amber-800" },
  bad: { bn: "কাজ করছে না", cls: "bg-red-100 text-red-700" },
  new: { bn: "নতুন", cls: "bg-gray-100 text-gray-700" },
  error: { bn: "সমস্যা", cls: "bg-red-100 text-red-700" },
};

export default function AiHubPage() {
  const toast = useToastStore((s) => s.push);
  const [data, setData] = useState<HubSummary | null>(null);
  const [cap, setCap] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [adding, setAdding] = useState<string | null>(null); // provider id being added, "" = picker

  const load = useCallback(async () => {
    try {
      const [h, a] = await Promise.all([aiHubApi.get(), assistantAdminApi.getAi().catch(() => null)]);
      setData(h.data.data ?? null);
      setCap(a?.data?.data?.daily_cap ?? null);
    } catch (e) {
      toast("error", errText(e, "AI তথ্য আনা যায়নি — পাতা রিফ্রেশ করুন"));
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const act = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast("success", ok); await load(); } catch (e) { toast("error", errText(e, "কাজটি হয়নি — আবার চেষ্টা করুন")); } finally { setBusy(""); }
  };

  const toggleAll = () => act("power", () => assistantAdminApi.updateAi({ enabled: !data?.enabled }), data?.enabled ? "AI বন্ধ করা হয়েছে" : "AI চালু হয়েছে");
  const conns = data?.connections ?? [];
  const broken = conns.filter((c) => c.enabled && c.status === "bad");

  return (
    <div className="admin-page">
      <AdminPageHeader title="AI Connections" titleBn="AI সংযোগ"
        description="All AI keys in one place — free first, paid last, automatic switch-over"
        descriptionBn="সব AI কী এক জায়গায় — আগে ফ্রি, পরে পেইড; একটা কাজ না করলে নিজে অন্যটায় যায়"
        actions={<Link href="/sumon/assistant" className="btn btn-outline btn-sm min-h-11 gap-1.5"><Bot className="w-4 h-4" /> AI সহকারী</Link>} />

      {!data ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/70 animate-pulse" />)}</div>
      ) : (
        <>
          {/* Status */}
          <section className={`rounded-3xl border p-4 sm:p-6 ${data.enabled && data.working ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-100" : "bg-gradient-to-br from-amber-50 to-white border-amber-100"}`}>
            <div className="flex flex-wrap items-start gap-4">
              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-none ${data.enabled && data.working ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}>
                {data.enabled && data.working ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </span>
              <div className="flex-1 min-w-[12rem]">
                <h2 className="text-lg sm:text-xl font-bold text-heading">
                  {!data.enabled ? "AI বন্ধ আছে" : data.working ? "AI চালু আছে" : "কোনো AI সংযোগ কাজ করছে না"}
                </h2>
                <p className="text-sm text-muted mt-0.5">
                  {data.working}টি সংযোগ কাজ করছে · আজ {data.today.count.toLocaleString("bn-BD")}টি কাজ
                  {data.today.paid ? ` (পেইড ${data.today.paid.toLocaleString("bn-BD")})` : ""}
                </p>
                {!data.working && <p className="text-sm text-amber-800 mt-1">নিচে “নতুন AI যোগ করুন” চাপুন — ৩ মিনিটে ফ্রি কী পাবেন।</p>}
              </div>
              <button type="button" onClick={toggleAll} disabled={busy === "power"}
                className={`btn btn-sm min-h-11 gap-1.5 ${data.enabled ? "btn-outline" : "btn-brand"}`}>
                {busy === "power" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />} {data.enabled ? "বন্ধ করুন" : "চালু করুন"}
              </button>
            </div>
            <TryBox />
          </section>

          {broken.length > 0 && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2" role="alert">
              {broken.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="flex-1 min-w-0"><b>{c.label}</b> — {c.note || "কাজ করছে না"}। অন্য সংযোগ দিয়ে AI চালু আছে।</span>
                  <button type="button" onClick={() => setAdding(c.provider)} className="btn btn-brand btn-sm min-h-10">নতুন কী দিন</button>
                </div>
              ))}
            </section>
          )}

          {/* Add */}
          {adding === null ? (
            <button type="button" onClick={() => setAdding("")} className="w-full rounded-2xl border-2 border-dashed border-brand-300 bg-white/70 hover:bg-brand-50 p-4 flex items-center justify-center gap-2 font-semibold text-brand-700 min-h-14">
              <Plus className="w-5 h-5" /> নতুন AI যোগ করুন (ফ্রি)
            </button>
          ) : (
            <AddPanel provider={adding} onPick={setAdding} onClose={() => setAdding(null)} onAdded={() => { setAdding(null); load(); }} />
          )}

          {/* Connections */}
          <section className="space-y-3" aria-labelledby="conns-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="conns-title" className="text-lg font-bold text-heading">আপনার AI সংযোগ ({conns.length.toLocaleString("bn-BD")})</h2>
              {conns.length > 0 && (
                <button type="button" onClick={() => act("all", () => aiHubApi.testAll(), "সব পরীক্ষা শেষ")} disabled={busy === "all"} className="btn btn-outline btn-sm min-h-11 gap-1.5">
                  {busy === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} সব পরীক্ষা
                </button>
              )}
            </div>
            <p className="text-xs text-muted">উপরেরটা আগে চেষ্টা হয়। ফ্রি সংযোগ সবসময় পেইডের আগে। প্রতিটি কাজে সবচেয়ে ভালো মডেল সিস্টেম নিজে বেছে নেয়।</p>
            {conns.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-muted">এখনো কোনো AI যোগ করা হয়নি।</p>}
            {conns.map((c, i) => (
              <ConnCard key={c.id} c={c} first={i === 0} last={i === conns.length - 1} busy={busy} act={act} />
            ))}
          </section>

          {/* Task routing */}
          <Fold title="কোন কাজে কোন AI" sub="সাধারণত “অটো” রাখুন — সিস্টেম নিজে শিখে সেরাটা বাছে">
            <div className="space-y-3">
              {TASKS.map((t) => (
                <div key={t.id} className="grid sm:grid-cols-[1fr_minmax(0,18rem)] gap-2 items-center">
                  <div><p className="font-semibold text-heading text-sm">{t.bn}</p>
                    <p className="text-xs text-muted">{t.hint}{data.best[t.id] ? ` · এখন: ${data.best[t.id]}` : ""}</p></div>
                  <select className="admin-input w-full" value={data.prefs.tasks?.[t.id] || ""}
                    onChange={(e) => act("task", () => aiHubApi.prefs({ tasks: { ...data.prefs.tasks, [t.id]: e.target.value } }), "সংরক্ষিত")}>
                    <option value="">অটো (প্রস্তাবিত)</option>
                    {conns.filter((c) => c.enabled).flatMap((c) => c.models.filter((m) => t.id !== "vision" || m.vision).map((m) => (
                      <option key={`${c.id}:${m.id}`} value={`${c.id}:${m.id}`}>{c.label} · {m.id}</option>
                    )))}
                  </select>
                </div>
              ))}
            </div>
          </Fold>

          {/* Limits */}
          <Fold title="খরচ ও সীমা" sub="পেইড AI কতবার ব্যবহার হবে তা আপনি ঠিক করুন">
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 min-h-11">
                <span className="text-sm"><b>পেইড AI ব্যবহার করবে</b><span className="block text-xs text-muted">শুধু ফ্রি সব সংযোগ ব্যর্থ হলে</span></span>
                <input type="checkbox" checked={data.prefs.allow_paid} onChange={(e) => act("paid", () => aiHubApi.prefs({ allow_paid: e.target.checked }), "সংরক্ষিত")} />
              </label>
              <NumberRow label="দিনে সর্বোচ্চ পেইড ব্যবহার" help="এর বেশি হলে পেইড বন্ধ থাকবে, ফ্রি চলবে" value={data.prefs.paid_daily_cap}
                onSave={(v) => act("pcap", () => aiHubApi.prefs({ paid_daily_cap: v }), "সংরক্ষিত")} />
              {cap !== null && (
                <NumberRow label="দিনে সর্বোচ্চ মোট AI ব্যবহার" help="নিরাপত্তার জন্য — ০ মানে সীমা নেই" value={cap}
                  onSave={(v) => act("cap", () => assistantAdminApi.updateAi({ daily_cap: v }), "সংরক্ষিত")} />
              )}
            </div>
          </Fold>

          {/* Daily check */}
          <Fold title="স্বয়ংক্রিয় দৈনিক পরীক্ষা" sub="কোনো কী নষ্ট হলে আপনাকে ইমেইল যাবে">
            <CronHelp path={data.cron_path} />
          </Fold>

          <Fold title="ChatGPT / Gemini অ্যাপ ও অন্যান্য প্রশ্ন" sub="সাধারণ জিজ্ঞাসা">
            <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
              <li>ফোনের ChatGPT/Gemini অ্যাপ বা তাদের মাসিক প্যাকেজ সরাসরি ওয়েবসাইটে যুক্ত করা যায় না (তাদের নিয়মে নিষেধ)। একই অ্যাকাউন্ট দিয়ে উপরের ধাপে API কী নিন — Gemini-রটা ফ্রি।</li>
              <li>সব AI ব্যর্থ হলে উপরের “এখনই চেষ্টা করুন” বক্সে “অ্যাপে খুলুন” বোতাম আসে — প্রশ্ন কপি হয়ে ChatGPT/Gemini খুলবে।</li>
              <li>কাস্টমার চ্যাটে কোনো AI না পেলে আগের নিয়মভিত্তিক উত্তর ও WhatsApp বোতাম দেখায় — কাস্টমার কখনো খালি উত্তর পায় না।</li>
              <li>কাস্টমারের ফোন নম্বর ও ইমেইল AI-তে পাঠানোর আগে লুকানো হয়।</li>
            </ul>
          </Fold>
        </>
      )}
    </div>
  );
}

function Fold({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-gray-100 bg-white">
      <summary className="flex items-center gap-3 p-4 cursor-pointer list-none min-h-14">
        <span className="flex-1 min-w-0"><span className="block font-semibold text-heading">{title}</span><span className="block text-xs text-muted">{sub}</span></span>
        <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function NumberRow({ label, help, value, onSave }: { label: string; help: string; value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex-1 min-w-[12rem] text-sm"><b>{label}</b><span className="block text-xs text-muted mb-1">{help}</span>
        <input type="number" min={0} max={5000} inputMode="numeric" className="admin-input w-full" value={v} onChange={(e) => setV(e.target.value)} /></label>
      <button type="button" onClick={() => onSave(Math.max(0, Number(v) || 0))} className="btn btn-outline btn-sm min-h-11">সংরক্ষণ</button>
    </div>
  );
}

function ConnCard({ c, first, last, busy, act }: {
  c: HubConn; first: boolean; last: boolean; busy: string;
  act: (key: string, fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const st = STATUS[c.status] ?? STATUS.new;
  const g = guideOf(c.provider);
  return (
    <article className={`rounded-2xl border bg-white p-4 ${c.enabled ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
      <div className="flex flex-wrap items-start gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-none ${c.tier === "paid" ? "bg-violet-100 text-violet-700" : "bg-brand-50 text-brand-700"}`}><Sparkles className="w-5 h-5" /></span>
        <div className="flex-1 min-w-[10rem]">
          <p className="font-semibold text-heading flex flex-wrap items-center gap-1.5">{c.label}
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.tier === "paid" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>{c.tier === "paid" ? "পেইড" : "ফ্রি"}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.bn}</span></p>
          <p className="text-xs text-muted mt-0.5">{c.note}{c.hint ? ` · কী: ${c.hint}` : ""} · আজ {c.used_today.toLocaleString("bn-BD")}টি কাজ</p>
          {g && <p className="text-xs text-muted">{g.tagline}</p>}
        </div>
        <div className="flex flex-wrap gap-1">
          <IconBtn label="উপরে নিন" disabled={first || !!busy} onClick={() => act(`m${c.id}`, () => aiHubApi.patch(c.id, { move: -1 }))}><ArrowUp className="w-4 h-4" /></IconBtn>
          <IconBtn label="নিচে নিন" disabled={last || !!busy} onClick={() => act(`m${c.id}`, () => aiHubApi.patch(c.id, { move: 1 }))}><ArrowDown className="w-4 h-4" /></IconBtn>
          <IconBtn label="পরীক্ষা করুন" disabled={!!busy} onClick={() => act(`t${c.id}`, () => aiHubApi.test(c.id), "পরীক্ষা শেষ")}>
            {busy === `t${c.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</IconBtn>
          <IconBtn label={c.enabled ? "বন্ধ করুন" : "চালু করুন"} disabled={!!busy} onClick={() => act(`e${c.id}`, () => aiHubApi.patch(c.id, { enabled: !c.enabled }))}><Power className={`w-4 h-4 ${c.enabled ? "text-emerald-600" : ""}`} /></IconBtn>
          <IconBtn label="সরান" disabled={!!busy} onClick={() => { if (window.confirm(`“${c.label}” সংযোগ সরাবেন?`)) act(`d${c.id}`, () => aiHubApi.remove(c.id), "সরানো হয়েছে"); }}><Trash2 className="w-4 h-4 text-red-500" /></IconBtn>
        </div>
      </div>
      {c.models.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs font-semibold text-brand-700 cursor-pointer min-h-9 flex items-center">কাজ করা মডেল ({c.models.length.toLocaleString("bn-BD")}) দেখুন</summary>
          <ul className="mt-2 space-y-1.5">
            {c.models.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                <code className="rounded bg-gray-100 px-1.5 py-0.5 break-all">{m.id}</code>
                {modelBadges(m).map((b) => <span key={b} className="rounded-full bg-brand-50 text-brand-700 px-2 py-0.5">{b}</span>)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="min-h-11 min-w-11 rounded-xl border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40">{children}</button>
  );
}

function AddPanel({ provider, onPick, onClose, onAdded }: { provider: string; onPick: (p: string) => void; onClose: () => void; onAdded: () => void }) {
  const toast = useToastStore((s) => s.push);
  const g = provider ? guideOf(provider) : undefined;
  const [key, setKey] = useState("");
  const [account, setAccount] = useState("");
  const [base, setBase] = useState("");
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false);

  const paste = async () => {
    try { setKey((await navigator.clipboard.readText()).trim()); } catch { toast("error", "পেস্ট করা যায়নি — ঘরে চেপে ধরে “Paste” করুন"); }
  };
  const save = async () => {
    if (!g) return;
    setSaving(true);
    try {
      const r = await aiHubApi.add({ key, provider: g.id, base_url: base, account_id: account });
      toast("success", `যোগ হয়েছে — ${r.data.data?.note || "AI কাজ করছে"}`);
      onAdded();
    } catch (e) {
      toast("error", errText(e, "যোগ করা যায়নি — কী আবার কপি করে চেষ্টা করুন"));
    } finally {
      setSaving(false);
    }
  };

  const Card = ({ p }: { p: ProviderGuide }) => (
    <button type="button" onClick={() => onPick(p.id)} className="text-left rounded-2xl border border-gray-100 bg-white hover:border-brand-300 p-4 min-h-14">
      <span className="flex items-center gap-2 font-semibold text-heading">{p.name}
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.tier === "paid" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>{p.tier === "paid" ? "পেইড" : "ফ্রি"}</span></span>
      <span className="block text-xs text-muted mt-1">{p.tagline}</span>
    </button>
  );

  return (
    <section className="rounded-3xl border border-brand-100 bg-white p-4 sm:p-6 space-y-4" aria-label="নতুন AI যোগ করুন">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-lg font-bold text-heading">{g ? `${g.name} যোগ করুন` : "কোন AI যোগ করবেন?"}</h2>
        {g && <button type="button" onClick={() => onPick("")} className="btn btn-outline btn-sm min-h-11">অন্যটা বাছুন</button>}
        <IconBtn label="বন্ধ করুন" onClick={onClose}><X className="w-4 h-4" /></IconBtn>
      </div>

      {!g ? (
        <>
          <p className="text-sm text-muted">শুরু করতে নিচের ৩টির যেকোনো একটি (বা সব) যোগ করুন — সবগুলো ফ্রি। যত বেশি যোগ করবেন, AI তত কম বন্ধ হবে।</p>
          <div className="grid sm:grid-cols-3 gap-3">{PROVIDER_GUIDES.filter((p) => p.recommended).map((p) => <Card key={p.id} p={p} />)}</div>
          <button type="button" onClick={() => setMore(!more)} className="text-sm font-semibold text-brand-700 min-h-11 inline-flex items-center gap-1">
            আরও বিকল্প (NVIDIA, Cloudflare, পেইড, নিজের কম্পিউটার…) <ChevronDown className={`w-4 h-4 transition-transform ${more ? "rotate-180" : ""}`} /></button>
          {more && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{PROVIDER_GUIDES.filter((p) => !p.recommended).map((p) => <Card key={p.id} p={p} />)}</div>}
        </>
      ) : (
        <>
          <p className="text-sm"><b>কী লাগবে:</b> {g.needs}</p>
          <ol className="space-y-2">
            {g.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm"><span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-none">{(i + 1).toLocaleString("bn-BD")}</span><span className="pt-1">{s}</span></li>
            ))}
          </ol>
          <a href={g.link} target="_blank" rel="noopener noreferrer" className="btn btn-brand btn-md min-h-12 gap-2 w-full sm:w-auto"><ExternalLink className="w-4 h-4" /> {g.linkLabel}</a>

          {g.needsBase && (
            <label className="block text-sm"><b>ঠিকানা (Base URL)</b>
              <input className="admin-input w-full mt-1" inputMode="url" placeholder="https://….trycloudflare.com/v1" value={base} onChange={(e) => setBase(e.target.value)} /></label>
          )}
          <label className="block text-sm"><b>API কী</b>{g.keyOptional ? " (না থাকলে খালি রাখুন)" : ""}{g.keyHint ? <span className="text-xs text-muted"> · {g.keyHint}</span> : null}
            <span className="mt-1 flex gap-2">
              <input className="admin-input flex-1 min-w-0" autoComplete="off" spellCheck={false} placeholder="এখানে কী পেস্ট করুন" value={key} onChange={(e) => setKey(e.target.value)} />
              <button type="button" onClick={paste} className="btn btn-outline btn-sm min-h-11 gap-1 flex-none"><ClipboardPaste className="w-4 h-4" /> পেস্ট</button>
            </span></label>
          {g.needsAccount && (
            <label className="block text-sm"><b>Account ID</b>
              <input className="admin-input w-full mt-1" autoComplete="off" spellCheck={false} placeholder="৩২ অক্ষরের Account ID" value={account} onChange={(e) => setAccount(e.target.value.trim())} /></label>
          )}
          <button type="button" onClick={save} disabled={saving || (!key && !g.keyOptional)} className="btn btn-brand btn-md min-h-12 gap-2 w-full sm:w-auto">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> পরীক্ষা চলছে… (৩০ সেকেন্ড পর্যন্ত)</> : <><Zap className="w-4 h-4" /> যোগ করুন ও পরীক্ষা করুন</>}
          </button>
          <p className="text-xs text-muted">কী এনক্রিপ্ট করে রাখা হয় — কেউ দেখতে পারবে না। সিস্টেম নিজে মডেল খুঁজে বাংলায় পরীক্ষা করে নেবে।</p>
        </>
      )}
    </section>
  );
}

function TryBox() {
  const [task, setTask] = useState<HubTask>("chat");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ text: string; by: string } | null>(null);
  const [failed, setFailed] = useState("");

  const run = async () => {
    setBusy(true); setOut(null); setFailed("");
    const q = text.trim() || "আমাদের দোকান সম্পর্কে এক লাইনে একটি স্বাগত বার্তা লিখুন।";
    try {
      const r = await aiHubApi.tryIt(task, q);
      const d = r.data.data!;
      setOut({ text: d.text, by: `${d.label ?? ""} · ${d.model ?? ""} · ${((d.ms ?? 0) / 1000).toFixed(1)} সেকেন্ড` });
    } catch (e) {
      const local = await browserAi(q); // last resort: Chrome's on-device AI (desktop)
      if (local) setOut({ text: local, by: "এই কম্পিউটারের ব্রাউজার AI (অফলাইন)" });
      else setFailed(q);
      if (!local) useToastStore.getState().push("error", errText(e, "কোনো AI উত্তর দেয়নি"));
    } finally {
      setBusy(false);
    }
  };
  const copyOpen = async (url: string) => {
    try { await navigator.clipboard.writeText(failed); } catch { /* ignore */ }
    window.open(url, "_blank", "noopener");
  };

  return (
    <details className="mt-4 rounded-2xl bg-white/80 border border-gray-100">
      <summary className="p-3 cursor-pointer list-none flex items-center gap-2 font-semibold text-sm text-brand-700 min-h-11"><Sparkles className="w-4 h-4" /> এখনই চেষ্টা করুন — AI ঠিকমতো উত্তর দিচ্ছে কিনা দেখুন</summary>
      <div className="px-3 pb-3 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TASKS.filter((t) => t.id !== "vision").map((t) => (
            <button key={t.id} type="button" onClick={() => setTask(t.id)} className={`shrink-0 rounded-full border px-3 min-h-9 text-xs ${task === t.id ? "bg-brand-600 text-white border-brand-600" : "border-gray-200"}`}>{t.bn}</button>
          ))}
        </div>
        <textarea className="admin-input w-full" rows={2} placeholder="প্রশ্ন লিখুন (খালি রাখলে নমুনা প্রশ্ন যাবে)" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="button" onClick={run} disabled={busy} className="btn btn-brand btn-sm min-h-11 gap-1.5">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} চেষ্টা করুন</button>
        {out && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm">
            <p className="whitespace-pre-wrap text-gray-800">{out.text}</p>
            <p className="text-xs text-emerald-700 mt-2">উত্তর দিয়েছে: {out.by}</p>
          </div>
        )}
        {failed && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm space-y-2">
            <p>এই মুহূর্তে কোনো AI উত্তর দেয়নি। প্রশ্ন কপি করে অ্যাপে খুলতে পারেন:</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => copyOpen(`https://chatgpt.com/?q=${encodeURIComponent(failed)}`)} className="btn btn-outline btn-sm min-h-11 gap-1"><Copy className="w-4 h-4" /> ChatGPT-এ খুলুন</button>
              <button type="button" onClick={() => copyOpen("https://gemini.google.com/app")} className="btn btn-outline btn-sm min-h-11 gap-1"><Copy className="w-4 h-4" /> Gemini-তে খুলুন (পেস্ট করুন)</button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function CronHelp({ path }: { path: string }) {
  const toast = useToastStore((s) => s.push);
  const url = `${getBrowserApiBaseUrl().replace(/\/$/, "")}${path}`;
  return (
    <div className="space-y-3 text-sm">
      <ol className="list-decimal pl-5 space-y-1">
        <li>cron-job.org-এ লগইন করুন (আপনি আগে থেকেই ব্যবহার করেন) → “Create cronjob”</li>
        <li>নিচের ঠিকানা কপি করে “URL” ঘরে দিন</li>
        <li>সময়: প্রতিদিন একবার (যেমন সকাল ৮টা) → “Create”</li>
      </ol>
      <div className="flex gap-2">
        <input readOnly className="admin-input flex-1 min-w-0 text-xs" value={url} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1 flex-none"
          onClick={async () => { try { await navigator.clipboard.writeText(url); toast("success", "কপি হয়েছে"); } catch { toast("error", "কপি হয়নি — ঘরটি চেপে ধরে কপি করুন"); } }}>
          <Copy className="w-4 h-4" /> কপি</button>
      </div>
      <p className="text-xs text-muted">এই ঠিকানা গোপন রাখুন। প্রতিদিন সব কী পরীক্ষা হবে, সপ্তাহে একবার নতুন ফ্রি মডেল খোঁজা হবে, আর কোনো কী নষ্ট হলে আপনাকে ইমেইল যাবে।</p>
    </div>
  );
}
