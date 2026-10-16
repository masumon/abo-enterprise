"use client";

import { askConfirm } from "@/store/confirm";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Bot, CheckCircle2, ChevronDown, ClipboardPaste, Copy, ExternalLink,
  Globe2, Image as ImageIcon, Languages, ListChecks, Loader2, MessageCircle, MonitorSmartphone, PenLine, Plus, Power,
  RefreshCw, ShieldCheck, Sparkles, Trash2, Wallet, X, Zap, type LucideIcon,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useHashScroll } from "@/hooks/useHashScroll";
import { assistantAdminApi } from "@/lib/api";
import {
  aiHubApi, browserAi, guideOf, modelBadges, PROVIDER_GUIDES, TASKS,
  type HubConn, type HubSummary, type HubTask, type ProviderGuide,
} from "@/lib/aiHub";
import { useToastStore } from "@/store/toast";
import { getBrowserApiBaseUrl } from "@/lib/apiBase";

const errText = (e: unknown, fb: string) =>
  (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || fb;
const bn = (n: number) => n.toLocaleString("bn-BD");

const STATUS: Record<string, { bn: string; cls: string; dot: string }> = {
  ok: { bn: "কাজ করছে", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  limit: { bn: "সীমা শেষ — নিজে আবার চালু হবে", cls: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  bad: { bn: "কাজ করছে না", cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  new: { bn: "নতুন", cls: "bg-gray-50 text-gray-700 ring-gray-200", dot: "bg-gray-400" },
  error: { bn: "সমস্যা", cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
};

// Each provider gets its own colour so the list is easy to scan.
const COLORS: Record<string, string> = {
  gemini: "from-blue-500 to-violet-500", groq: "from-orange-500 to-red-500", openrouter: "from-slate-600 to-slate-800",
  nvidia: "from-lime-500 to-green-600", cloudflare: "from-orange-400 to-amber-500", mistral: "from-amber-500 to-orange-600",
  vercel: "from-gray-800 to-black", openai: "from-emerald-500 to-teal-600", anthropic: "from-amber-600 to-orange-700",
  deepseek: "from-blue-600 to-indigo-700", xai: "from-gray-700 to-gray-900", local: "from-cyan-500 to-blue-600",
  custom: "from-gray-400 to-gray-600",
};
const TASK_ICON: Record<HubTask, LucideIcon> = { chat: MessageCircle, translate: Languages, vision: ImageIcon, writing: PenLine, json: ListChecks };

function Avatar({ provider, name, size = "md" }: { provider: string; name: string; size?: "md" | "lg" }) {
  const s = size === "lg" ? "w-12 h-12 text-lg" : "w-10 h-10 text-base";
  return (
    <span aria-hidden className={`${s} rounded-xl bg-gradient-to-br ${COLORS[provider] ?? COLORS.custom} text-white font-bold flex items-center justify-center flex-none shadow-sm`}>
      {(name.replace(/[^A-Za-z]/g, "")[0] || "AI").toUpperCase()}
    </span>
  );
}

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
  useHashScroll(!!data);

  const act = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast("success", ok); await load(); } catch (e) { toast("error", errText(e, "কাজটি হয়নি — আবার চেষ্টা করুন")); } finally { setBusy(""); }
  };

  const conns = data?.connections ?? [];
  const broken = conns.filter((c) => c.enabled && c.status === "bad");
  const startAdd = (p = "") => { setAdding(p); setTimeout(() => document.getElementById("ai-add")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };

  return (
    <div className="admin-page">
      <AdminPageHeader title="AI Connections" titleBn="AI সংযোগ"
        description="All AI keys in one place — free first, paid last, automatic switch-over"
        descriptionBn="সব AI কী এক জায়গায় — আগে ফ্রি, পরে পেইড; একটা কাজ না করলে নিজে অন্যটায় যায়"
        actions={<Link href="/sumon/assistant" className="btn btn-outline btn-sm min-h-11 gap-1.5"><Bot className="w-4 h-4" /> AI সহকারী</Link>} />
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2" role="note">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-none" aria-hidden />
        <span>
          <b>সাবধান:</b> Google Cloud / <b>Vertex AI</b> / <b>Gemini Enterprise Agent Platform</b>-এর key <b>পেইড</b> — কার্ড যুক্ত করতে হয়, ব্যবহারে বিল আসে।
          ফ্রিতে Gemini ব্যবহার করতে <b>Google AI Studio</b>-র key (<code>AIza…</code> দিয়ে শুরু) নিন:{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium">aistudio.google.com/apikey</a>
        </span>
      </p>

      {!data ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-3xl bg-white/70 animate-pulse" />)}</div>
      ) : (
        <>
          <StatusHero data={data} busy={busy} onToggle={() => act("power", () => assistantAdminApi.updateAi({ enabled: !data.enabled }), data.enabled ? "AI বন্ধ করা হয়েছে" : "AI চালু হয়েছে")} />

          {broken.length > 0 && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2" role="alert">
              {broken.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-none" />
                  <span className="flex-1 min-w-[12rem]"><b>{c.label}</b> — {c.note || "কাজ করছে না"}। অন্য সংযোগ দিয়ে AI চালু আছে।</span>
                  <button type="button" onClick={() => startAdd(c.provider)} className="btn btn-brand btn-sm min-h-10">নতুন কী দিন</button>
                </div>
              ))}
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
            {/* Main column */}
            <div className="space-y-6 min-w-0">
              <div id="ai-add" className="scroll-mt-24">
                {adding !== null ? (
                  <AddPanel provider={adding} onPick={setAdding} onClose={() => setAdding(null)} onAdded={() => { setAdding(null); load(); }} />
                ) : conns.length === 0 ? (
                  <EmptyStart onPick={startAdd} />
                ) : (
                  <button type="button" onClick={() => startAdd("")} className="admin-surface w-full rounded-2xl border-2 border-dashed border-brand-300 bg-white/70 hover:bg-brand-50 hover:border-brand-400 transition-colors p-4 flex items-center justify-center gap-2 font-semibold text-brand-700 min-h-14">
                    <Plus className="w-5 h-5" /> নতুন AI যোগ করুন — যত বেশি, তত নির্ভরযোগ্য
                  </button>
                )}
              </div>

              {conns.length > 0 && (
                <section className="space-y-3" aria-labelledby="conns-title">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 id="conns-title" className="text-lg font-bold text-heading">আপনার AI সংযোগ ({bn(conns.length)})</h2>
                      <p className="text-xs text-muted">উপরেরটা আগে চেষ্টা হয় · ফ্রি সবসময় পেইডের আগে · সেরা মডেল সিস্টেম নিজে বাছে</p>
                    </div>
                    <button type="button" onClick={() => act("all", () => aiHubApi.testAll(), "সব পরীক্ষা শেষ")} disabled={busy === "all"} className="btn btn-outline btn-sm min-h-11 gap-1.5">
                      {busy === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} সব পরীক্ষা করুন
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                    {conns.map((c, i) => (
                      <ConnCard key={c.id} c={c} order={i + 1} first={i === 0} last={i === conns.length - 1} busy={busy} act={act} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Side column (stacks below on phones/tablets) */}
            <aside className="space-y-4 lg:sticky lg:top-20">
              <TaskRouting data={data} conns={conns} act={act} />
              <Fold icon={Wallet} title="খরচ ও সীমা" sub="পেইড AI কতবার চলবে আপনি ঠিক করুন">
                <div className="space-y-4">
                  <label className="flex items-center justify-between gap-3 min-h-11">
                    <span className="text-sm"><b>পেইড AI ব্যবহার করবে</b><span className="block text-xs text-muted">শুধু সব ফ্রি সংযোগ ব্যর্থ হলে</span></span>
                    <input type="checkbox" checked={data.prefs.allow_paid} onChange={(e) => act("paid", () => aiHubApi.prefs({ allow_paid: e.target.checked }), "সংরক্ষিত")} />
                  </label>
                  <NumberRow label="দিনে সর্বোচ্চ পেইড ব্যবহার" help="এর বেশি হলে পেইড বন্ধ, ফ্রি চলবে" value={data.prefs.paid_daily_cap}
                    onSave={(v) => act("pcap", () => aiHubApi.prefs({ paid_daily_cap: v }), "সংরক্ষিত")} />
                  {cap !== null && (
                    <NumberRow label="দিনে সর্বোচ্চ মোট AI ব্যবহার" help="নিরাপত্তার জন্য — ০ মানে সীমা নেই" value={cap}
                      onSave={(v) => act("cap", () => assistantAdminApi.updateAi({ daily_cap: v }), "সংরক্ষিত")} />
                  )}
                </div>
              </Fold>
              <Fold icon={ShieldCheck} title="স্বয়ংক্রিয় দৈনিক পরীক্ষা" sub="কোনো কী নষ্ট হলে ইমেইল যাবে">
                <CronHelp path={data.cron_path} />
              </Fold>
              <Fold icon={Globe2} title="সাধারণ জিজ্ঞাসা" sub="ChatGPT/Gemini অ্যাপ, গোপনীয়তা">
                <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
                  <li>ফোনের ChatGPT/Gemini অ্যাপ বা মাসিক প্যাকেজ সরাসরি ওয়েবসাইটে যুক্ত করা যায় না (তাদের নিয়মে নিষেধ)। একই অ্যাকাউন্ট দিয়ে API কী নিন — Gemini-রটা ফ্রি।</li>
                  <li>সব AI ব্যর্থ হলে “এখনই চেষ্টা করুন” বক্সে “অ্যাপে খুলুন” বোতাম আসে।</li>
                  <li>কাস্টমার চ্যাটে কোনো AI না পেলে নিয়মভিত্তিক উত্তর ও WhatsApp বোতাম দেখায় — খালি উত্তর কখনো নয়।</li>
                  <li>কাস্টমারের ফোন নম্বর ও ইমেইল AI-তে পাঠানোর আগে লুকানো হয়। কী এনক্রিপ্ট করে রাখা হয়।</li>
                </ul>
              </Fold>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function StatusHero({ data, busy, onToggle }: { data: HubSummary; busy: string; onToggle: () => void }) {
  const good = data.enabled && data.working > 0;
  const free = data.connections.filter((c) => c.tier === "free" && c.enabled).length;
  const paid = data.connections.filter((c) => c.tier === "paid" && c.enabled).length;
  const tiles = [
    { label: "কাজ করছে", value: `${bn(data.working)}/${bn(data.connections.length)}` },
    { label: "আজকের কাজ", value: bn(data.today.count) },
    { label: "ফ্রি · পেইড", value: `${bn(free)} · ${bn(paid)}` },
  ];
  const chain = [
    { t: "ফ্রি AI", on: free > 0 }, { t: "পেইড AI", on: paid > 0 && data.prefs.allow_paid },
    { t: "ব্রাউজার AI", on: true }, { t: "সাধারণ উত্তর + WhatsApp", on: true },
  ];
  return (
    <section className={`relative overflow-hidden rounded-3xl border p-4 sm:p-6 ${good ? "border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-brand-50/40" : "border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white"}`}>
      <span aria-hidden className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl ${good ? "bg-emerald-200/40" : "bg-amber-200/40"}`} />
      <div className="relative flex flex-wrap items-start gap-4">
        <span className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-none text-white shadow-md ${good ? "bg-emerald-500" : "bg-amber-500"}`}>
          {good ? <CheckCircle2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
        </span>
        <div className="flex-1 min-w-[12rem]">
          <h2 className="text-xl sm:text-2xl font-bold text-heading">{!data.enabled ? "AI বন্ধ আছে" : good ? "AI চালু আছে" : "কোনো AI সংযোগ কাজ করছে না"}</h2>
          <p className="text-sm text-muted mt-0.5">{good ? "সব AI কাজ — চ্যাট, অনুবাদ, ছবি থেকে পণ্য, ব্লগ — স্বয়ংক্রিয়ভাবে চলছে।" : "নিচে “নতুন AI যোগ করুন” চাপুন — ৩ মিনিটে ফ্রি কী পাবেন।"}</p>
        </div>
        <button type="button" onClick={onToggle} disabled={busy === "power"} className={`btn btn-sm min-h-11 gap-1.5 ${data.enabled ? "btn-outline" : "btn-brand"}`}>
          {busy === "power" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />} {data.enabled ? "বন্ধ করুন" : "চালু করুন"}
        </button>
      </div>

      <div className="relative grid grid-cols-3 gap-2 sm:gap-3 mt-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-white/80 ring-1 ring-black/5 px-3 py-2.5 text-center">
            <p className="text-lg sm:text-2xl font-bold text-heading tabular-nums">{t.value}</p>
            <p className="text-[12px] sm:text-xs text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-4">
        <p className="text-xs font-semibold text-gray-600 mb-1.5">AI কখনো থামে না — এই ক্রমে চেষ্টা হয়:</p>
        <ol className="flex flex-wrap items-center gap-1.5">
          {chain.map((c, i) => (
            <li key={c.t} className="flex items-center gap-1.5">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${c.on ? "bg-white text-heading ring-brand-200" : "bg-gray-50 text-gray-400 ring-gray-200 line-through"}`}>{bn(i + 1)}. {c.t}</span>
              {i < chain.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-400" aria-hidden />}
            </li>
          ))}
        </ol>
      </div>

      <TryBox />
    </section>
  );
}

function EmptyStart({ onPick }: { onPick: (p: string) => void }) {
  return (
    <section className="rounded-3xl border border-brand-100 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center flex-none"><Sparkles className="w-5 h-5" /></span>
        <div>
          <h2 className="text-lg font-bold text-heading">৩ মিনিটে AI চালু করুন — সম্পূর্ণ ফ্রি</h2>
          <p className="text-sm text-muted">নিচের যেকোনো একটিতে চাপুন। ধাপে ধাপে দেখিয়ে দেবে কোথা থেকে কী আনবেন।</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-4">
        {PROVIDER_GUIDES.filter((p) => p.recommended).map((p) => <ProviderCard key={p.id} p={p} onPick={onPick} />)}
      </div>
      <button type="button" onClick={() => onPick("")} className="mt-3 text-sm font-semibold text-brand-700 min-h-11 inline-flex items-center gap-1">আরও বিকল্প দেখুন <ArrowRight className="w-4 h-4" /></button>
    </section>
  );
}

function ProviderCard({ p, onPick }: { p: ProviderGuide; onPick: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onPick(p.id)} className="admin-surface group text-left rounded-2xl border border-gray-100 bg-white hover:border-brand-300 hover:shadow-md transition p-4 min-h-14 flex gap-3">
      <Avatar provider={p.id} name={p.name} />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5 font-semibold text-heading">{p.name}
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.tier === "paid" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>{p.tier === "paid" ? "পেইড" : "ফ্রি"}</span></span>
        <span className="block text-xs text-muted mt-1">{p.tagline}</span>
      </span>
    </button>
  );
}

function TaskRouting({ data, conns, act }: { data: HubSummary; conns: HubConn[]; act: (k: string, fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  return (
    <section className="admin-surface rounded-2xl border border-gray-100 bg-white p-4" aria-labelledby="tasks-title">
      <h2 id="tasks-title" className="font-bold text-heading">কোন কাজে কোন AI</h2>
      <p className="text-xs text-muted mb-3">“অটো” রাখুন — সিস্টেম নিজে শিখে সেরাটা বাছে</p>
      <ul className="space-y-3">
        {TASKS.map((t) => {
          const Icon = TASK_ICON[t.id];
          return (
            <li key={t.id} className="flex gap-3">
              <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center flex-none"><Icon className="w-4 h-4" /></span>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold text-heading leading-tight">{t.bn}</p>
                <p className="text-[12px] text-muted truncate" title={data.best[t.id]}>{data.best[t.id] ? `এখন: ${data.best[t.id]}` : t.hint}</p>
                <select aria-label={`${t.bn} — কোন AI`} className="admin-input w-full !py-2" value={data.prefs.tasks?.[t.id] || ""}
                  onChange={(e) => act("task", () => aiHubApi.prefs({ tasks: { ...data.prefs.tasks, [t.id]: e.target.value } }), "সংরক্ষিত")}>
                  <option value="">অটো (প্রস্তাবিত)</option>
                  {conns.filter((c) => c.enabled).flatMap((c) => c.models.filter((m) => t.id !== "vision" || m.vision).map((m) => (
                    <option key={`${c.id}:${m.id}`} value={`${c.id}:${m.id}`}>{c.label} · {m.id}</option>
                  )))}
                </select>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Fold({ icon: Icon, title, sub, children }: { icon: LucideIcon; title: string; sub: string; children: React.ReactNode }) {
  return (
    <details className="admin-surface group rounded-2xl border border-gray-100 bg-white">
      <summary className="flex items-center gap-3 p-4 cursor-pointer list-none min-h-14">
        <span className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center flex-none"><Icon className="w-4 h-4" /></span>
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
      <label className="flex-1 min-w-[10rem] text-sm"><b>{label}</b><span className="block text-xs text-muted mb-1">{help}</span>
        <input type="number" min={0} max={5000} inputMode="numeric" className="admin-input w-full" value={v} onChange={(e) => setV(e.target.value)} /></label>
      <button type="button" onClick={() => onSave(Math.max(0, Number(v) || 0))} className="btn btn-outline btn-sm min-h-11">সংরক্ষণ</button>
    </div>
  );
}

function ConnCard({ c, order, first, last, busy, act }: {
  c: HubConn; order: number; first: boolean; last: boolean; busy: string;
  act: (key: string, fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const st = STATUS[c.status] ?? STATUS.new;
  const g = guideOf(c.provider);
  const bestScore = Math.max(0, ...c.models.map((m) => m.score));
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm transition ${c.enabled ? "border-gray-100" : "border-dashed border-gray-200 opacity-70"}`}>
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar provider={c.provider} name={c.label} size="lg" />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white ring-1 ring-gray-200 text-[11px] font-bold text-gray-700 flex items-center justify-center">{bn(order)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-heading flex flex-wrap items-center gap-1.5 leading-tight">{c.label}
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.tier === "paid" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>{c.tier === "paid" ? "পেইড" : "ফ্রি"}</span></p>
          <span className={`mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-0.5 rounded-full ring-1 ${st.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{c.enabled ? st.bn : "বন্ধ রাখা আছে"}</span>
        </div>
      </div>

      <p className="text-xs text-muted mt-3">{c.note || g?.tagline}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
        <span>আজ <b className="text-heading">{bn(c.used_today)}</b>টি কাজ</span>
        <span>মডেল <b className="text-heading">{bn(c.models.length)}</b>টি</span>
        {bestScore > 0 && <span title="বাংলা পরীক্ষার ফল">বাংলা <b className="text-amber-500 tracking-tight">{"★".repeat(bestScore)}{"☆".repeat(3 - bestScore)}</b></span>}
        {c.hint && <span>কী: <code>{c.hint}</code></span>}
      </div>

      {c.models.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs font-semibold text-brand-700 cursor-pointer min-h-9 flex items-center">কাজ করা মডেল দেখুন</summary>
          <ul className="mt-1 space-y-1.5">
            {c.models.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                <code className="rounded bg-gray-100 px-1.5 py-0.5 break-all">{m.id}</code>
                {modelBadges(m).map((b) => <span key={b} className="rounded-full bg-brand-50 text-brand-700 px-2 py-0.5">{b}</span>)}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
        <ActBtn label="পরীক্ষা" disabled={!!busy} onClick={() => act(`t${c.id}`, () => aiHubApi.test(c.id), "পরীক্ষা শেষ")}>
          {busy === `t${c.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</ActBtn>
        <ActBtn label={c.enabled ? "বন্ধ" : "চালু"} disabled={!!busy} onClick={() => act(`e${c.id}`, () => aiHubApi.patch(c.id, { enabled: !c.enabled }))}>
          <Power className={`w-4 h-4 ${c.enabled ? "text-emerald-600" : ""}`} /></ActBtn>
        <span className="flex-1" />
        <IconBtn label="উপরে নিন (আগে চেষ্টা হবে)" disabled={first || !!busy} onClick={() => act(`m${c.id}`, () => aiHubApi.patch(c.id, { move: -1 }))}><ArrowUp className="w-4 h-4" /></IconBtn>
        <IconBtn label="নিচে নিন" disabled={last || !!busy} onClick={() => act(`m${c.id}`, () => aiHubApi.patch(c.id, { move: 1 }))}><ArrowDown className="w-4 h-4" /></IconBtn>
        <IconBtn label="সরান" disabled={!!busy} onClick={async () => { if (await askConfirm(`“${c.label}” সংযোগ সরাবেন?`, { variant: "danger", confirmLabel: "সরান" })) act(`d${c.id}`, () => aiHubApi.remove(c.id), "সরানো হয়েছে"); }}><Trash2 className="w-4 h-4 text-red-500" /></IconBtn>
      </div>
    </article>
  );
}

function ActBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="min-h-11 px-3 rounded-xl border border-gray-100 inline-flex items-center gap-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40">{children}{label}</button>
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
  const step = !g ? 1 : saving ? 3 : 2;

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

  return (
    <section className="rounded-3xl border border-brand-100 bg-white p-4 sm:p-6 space-y-4 shadow-sm" aria-label="নতুন AI যোগ করুন">
      <div className="flex items-center gap-2">
        {g && <Avatar provider={g.id} name={g.name} />}
        <h2 className="flex-1 text-lg font-bold text-heading">{g ? `${g.name} যোগ করুন` : "কোন AI যোগ করবেন?"}</h2>
        <IconBtn label="বন্ধ করুন" onClick={onClose}><X className="w-4 h-4" /></IconBtn>
      </div>

      <ol className="grid grid-cols-3 gap-2" aria-label="ধাপ">
        {["বাছুন", "কী আনুন", "পরীক্ষা"].map((t, i) => (
          <li key={t} className={`rounded-xl px-2 py-2 text-center text-xs font-semibold ${step > i ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500"}`}>{bn(i + 1)}. {t}</li>
        ))}
      </ol>

      {!g ? (
        <>
          <p className="text-sm text-muted">শুরু করতে নিচের ৩টির যেকোনো একটি (বা সব) যোগ করুন — সবগুলো ফ্রি। যত বেশি যোগ করবেন, AI তত কম থামবে।</p>
          <div className="grid sm:grid-cols-3 gap-3">{PROVIDER_GUIDES.filter((p) => p.recommended).map((p) => <ProviderCard key={p.id} p={p} onPick={onPick} />)}</div>
          <button type="button" onClick={() => setMore(!more)} className="text-sm font-semibold text-brand-700 min-h-11 inline-flex items-center gap-1">
            আরও বিকল্প (NVIDIA, Cloudflare, পেইড, নিজের কম্পিউটার…) <ChevronDown className={`w-4 h-4 transition-transform ${more ? "rotate-180" : ""}`} /></button>
          {more && <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{PROVIDER_GUIDES.filter((p) => !p.recommended).map((p) => <ProviderCard key={p.id} p={p} onPick={onPick} />)}</div>}
        </>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm rounded-xl bg-brand-50/60 p-3"><b>কী লাগবে:</b> {g.needs}</p>
            <ol className="space-y-2.5">
              {g.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm"><span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-none">{bn(i + 1)}</span><span className="pt-1">{s}</span></li>
              ))}
            </ol>
            <a href={g.link} target="_blank" rel="noopener noreferrer" className="btn btn-brand btn-md min-h-12 gap-2 w-full"><ExternalLink className="w-4 h-4" /> {g.linkLabel}</a>
          </div>
          <div className="space-y-3 rounded-2xl bg-gray-50 p-3 sm:p-4">
            {g.needsBase && (
              <label className="block text-sm"><b>ঠিকানা (Base URL)</b>
                <input className="admin-input w-full mt-1" inputMode="url" placeholder="https://….trycloudflare.com/v1" value={base} onChange={(e) => setBase(e.target.value)} /></label>
            )}
            <label className="block text-sm"><b>API কী</b>{g.keyOptional ? " (না থাকলে খালি রাখুন)" : ""}{g.keyHint ? <span className="text-xs text-muted"> · {g.keyHint}</span> : null}
              <span className="mt-1 flex gap-2">
                <input className="admin-input flex-1 min-w-0" autoComplete="off" spellCheck={false} placeholder="এখানে কী পেস্ট করুন" value={key} onChange={(e) => setKey(e.target.value)} />
                <button type="button" onClick={paste} className="btn btn-outline btn-sm min-h-11 gap-1 flex-none bg-white"><ClipboardPaste className="w-4 h-4" /> পেস্ট</button>
              </span></label>
            {g.needsAccount && (
              <label className="block text-sm"><b>Account ID</b>
                <input className="admin-input w-full mt-1" autoComplete="off" spellCheck={false} placeholder="৩২ অক্ষরের Account ID" value={account} onChange={(e) => setAccount(e.target.value.trim())} /></label>
            )}
            <button type="button" onClick={save} disabled={saving || (!key && !g.keyOptional)} className="btn btn-brand btn-md min-h-12 gap-2 w-full">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> পরীক্ষা চলছে… (৩০ সেকেন্ড পর্যন্ত)</> : <><Zap className="w-4 h-4" /> যোগ করুন ও পরীক্ষা করুন</>}
            </button>
            <p className="text-xs text-muted flex gap-1.5"><ShieldCheck className="w-4 h-4 flex-none text-emerald-600" /> কী এনক্রিপ্ট করে রাখা হয়। সিস্টেম নিজে মডেল খুঁজে বাংলায় পরীক্ষা করে নেবে।</p>
            <button type="button" onClick={() => onPick("")} className="text-sm font-semibold text-brand-700 min-h-11">← অন্য AI বাছুন</button>
          </div>
        </div>
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
      else { setFailed(q); useToastStore.getState().push("error", errText(e, "কোনো AI উত্তর দেয়নি")); }
    } finally {
      setBusy(false);
    }
  };
  const copyOpen = async (url: string) => {
    try { await navigator.clipboard.writeText(failed); } catch { /* ignore */ }
    window.open(url, "_blank", "noopener");
  };

  return (
    <details className="relative mt-4 rounded-2xl bg-white/90 ring-1 ring-black/5">
      <summary className="p-3 cursor-pointer list-none flex items-center gap-2 font-semibold text-sm text-brand-700 min-h-12">
        <Sparkles className="w-4 h-4" /> <span className="flex-1">এখনই চেষ্টা করুন — AI ঠিকমতো উত্তর দিচ্ছে কিনা দেখুন</span><MonitorSmartphone className="w-4 h-4 text-gray-400" aria-hidden /></summary>
      <div className="px-3 pb-3 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {TASKS.filter((t) => t.id !== "vision").map((t) => (
            <button key={t.id} type="button" onClick={() => setTask(t.id)} className={`shrink-0 rounded-full border px-3 min-h-9 text-xs ${task === t.id ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 bg-white"}`}>{t.bn}</button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea className="admin-input w-full sm:flex-1" rows={2} placeholder="প্রশ্ন লিখুন (খালি রাখলে নমুনা প্রশ্ন যাবে)" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" onClick={run} disabled={busy} className="btn btn-brand btn-sm min-h-11 gap-1.5 sm:self-stretch">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} চেষ্টা করুন</button>
        </div>
        {out && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm">
            <p className="whitespace-pre-wrap text-gray-800">{out.text}</p>
            <p className="text-xs text-emerald-700 mt-2">✓ উত্তর দিয়েছে: {out.by}</p>
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
        <li>cron-job.org-এ লগইন করুন → “Create cronjob”</li>
        <li>নিচের ঠিকানা কপি করে “URL” ঘরে দিন</li>
        <li>সময়: প্রতিদিন একবার (যেমন সকাল ৮টা) → “Create”</li>
      </ol>
      <div className="flex gap-2">
        <input readOnly className="admin-input flex-1 min-w-0 text-xs" value={url} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1 flex-none"
          onClick={async () => { try { await navigator.clipboard.writeText(url); toast("success", "কপি হয়েছে"); } catch { toast("error", "কপি হয়নি — ঘরটি চেপে ধরে কপি করুন"); } }}>
          <Copy className="w-4 h-4" /> কপি</button>
      </div>
      <p className="text-xs text-muted">ঠিকানাটি গোপন রাখুন। প্রতিদিন সব কী পরীক্ষা হবে, সপ্তাহে একবার নতুন ফ্রি মডেল খোঁজা হবে, কোনো কী নষ্ট হলে ইমেইল যাবে।</p>
    </div>
  );
}
