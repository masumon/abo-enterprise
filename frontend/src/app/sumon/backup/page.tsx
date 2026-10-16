"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronDown, Clock, Cloud, Copy, Download, ExternalLink, KeyRound, Loader2, Plus,
  Power, Printer, RefreshCw, ShieldCheck, Trash2, Upload, X, Zap,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useHashScroll } from "@/hooks/useHashScroll";
import ContentCopy from "./ContentCopy";
import { useToastStore } from "@/store/toast";
import {
  backupApi, DRIVE_GUIDES, guideOf, OAUTH_HELP, type BackupRun, type BackupSummary, type DestKind, type GithubStatus, type JobState,
} from "@/lib/backup";

const errText = (e: unknown, fb: string): string => {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof d === "string" && d) return d;
  if (Array.isArray(d)) return "তথ্য ঠিকমতো পৌঁছায়নি — পাতা রিফ্রেশ করে আবার চেষ্টা করুন।";
  return fb;
};
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }) : "—");
const size = (n?: number) => (n == null ? "—" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const TRIGGER: Record<string, string> = { auto: "স্বয়ংক্রিয়", manual: "ম্যানুয়াল", local: "কম্পিউটারে", restore_test: "Restore পরীক্ষা" };
const STATUS: Record<string, { bn: string; cls: string }> = {
  ok: { bn: "সফল ও যাচাই করা", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  partial: { bn: "আংশিক", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  failed: { bn: "ব্যর্থ", cls: "bg-red-50 text-red-700 ring-red-200" },
  running: { bn: "চলছে…", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
};
const MAIN_DRIVES: DestKind[] = ["google_drive", "onedrive", "dropbox"];
const DRIVE_STYLE: Record<string, { letter: string; cls: string }> = {
  google_drive: { letter: "G", cls: "from-blue-500 to-emerald-500" },
  onedrive: { letter: "O", cls: "from-sky-500 to-blue-700" },
  dropbox: { letter: "D", cls: "from-blue-600 to-indigo-600" },
  s3: { letter: "S3", cls: "from-orange-500 to-amber-500" },
  webdav: { letter: "W", cls: "from-slate-500 to-slate-700" },
};
const BORDER: Record<string, string> = { ok: "border-l-emerald-500", partial: "border-l-amber-500", failed: "border-l-red-500", running: "border-l-blue-500" };

function DriveAvatar({ kind, big = false }: { kind: string; big?: boolean }) {
  const st = DRIVE_STYLE[kind] ?? DRIVE_STYLE.webdav;
  return (
    <span aria-hidden className={`${big ? "w-11 h-11 text-base" : "w-9 h-9 text-sm"} rounded-xl bg-gradient-to-br ${st.cls} text-white font-bold flex items-center justify-center flex-none shadow-sm`}>
      {st.letter}
    </span>
  );
}
const input = "input w-full min-h-11 text-base";

type Ask = { title: string; note?: string; danger?: boolean; onOk: (password: string) => Promise<void> };

/** Small modal asking for the admin password (replaces window.prompt/confirm). */
function PasswordDialog({ ask, onClose }: { ask: Ask; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!pw || busy) return; setBusy(true); try { await ask.onOk(pw); onClose(); } finally { setBusy(false); } };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  return (
    <div className="admin-overlay admin-overlay--dialog fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true" aria-label={ask.title}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="admin-sheet admin-sheet--s bg-white rounded-2xl w-full max-w-md p-5 space-y-3 shadow-xl">
        <p className="font-semibold text-gray-900">{ask.title}</p>
        {ask.note && <p className={`text-sm ${ask.danger ? "text-red-700" : "text-gray-600"}`}>{ask.note}</p>}
        <input className={input} type="password" autoFocus placeholder="আপনার অ্যাডমিন লগইন পাসওয়ার্ড" value={pw}
          onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} autoComplete="current-password" />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-outline min-h-12" onClick={onClose} disabled={busy}>বাতিল</button>
          <button type="button" className={`btn min-h-12 ${ask.danger ? "bg-red-600 text-white hover:bg-red-700" : "btn-brand"}`} disabled={!pw || busy}
            onClick={submit}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "নিশ্চিত করুন"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, summary, done, open, children, id }: { n: number; title: string; summary?: string; done: boolean; open: boolean; children: React.ReactNode; id?: string }) {
  return (
    <details id={id} open={open} className="card p-4 sm:p-5 group scroll-mt-24 transition">
      <summary className="list-none cursor-pointer flex items-center gap-3 min-h-11">
        <span className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center flex-none text-white ${done ? "bg-emerald-600" : "bg-brand-600"}`}>
          {done ? "✓" : n.toLocaleString("bn-BD")}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-gray-900">{title}</span>
          {summary && <span className="block text-xs text-gray-600 truncate">{summary}</span>}
        </span>
        {done && <span className="hidden sm:inline-flex text-xs font-medium px-2.5 py-1 leading-normal rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">হয়ে গেছে</span>}
        <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="pt-3 space-y-3">{children}</div>
    </details>
  );
}

export default function BackupPage() {
  const toast = useToastStore((s) => s.push);
  const [data, setData] = useState<BackupSummary | null>(null);
  const [busy, setBusy] = useState("");
  const [localRun, setLocalRun] = useState<string | null>(null);
  const [adding, setAdding] = useState<DestKind | "" | null>(null);
  const [testing, setTesting] = useState<{ run?: BackupRun; destId?: string; fileId?: string } | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [oauth, setOauth] = useState<{ ok: boolean; reason: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localRef = useRef<string | null>(null); // mirrors localRun for use inside load()

  const load = useCallback(async () => {
    try {
      const r = await backupApi.get();
      const d = r.data.data ?? null;
      setData(d);
      // The "to computer" run finished → fetch its file once.
      const run = localRef.current ? d?.history.find((x) => x.id === localRef.current) : undefined;
      if (run && run.status !== "running") {
        localRef.current = null;
        setLocalRun(null);
        if (run.status === "ok") backupApi.downloadLocal(run.id, run.name || "abo-backup.abobak").catch(() => toast("error", "ডাউনলোড হয়নি — আবার চেষ্টা করুন"));
        else toast("error", run.error_bn || "Backup তৈরি হয়নি");
      }
    } catch (e) {
      toast("error", errText(e, "Backup তথ্য আনা যায়নি — পাতা রিফ্রেশ করুন"));
    }
  }, [toast]);

  useEffect(() => {
    load();
    const q = new URLSearchParams(window.location.search);
    const o = q.get("oauth");
    if (o) {
      setOauth({ ok: o === "ok", reason: q.get("reason") || o });
      if (o === "ok") toast("success", "ড্রাইভ যুক্ত হয়েছে ও পরীক্ষায় পাস করেছে");
      window.history.replaceState(null, "", "/sumon/backup");
    }
  }, [load, toast]);

  // Poll while something runs.
  useEffect(() => {
    if (!data) return;
    const running = data.health.running || data.history.some((r) => r.status === "running");
    if (running || localRun) timer.current = setTimeout(load, 4000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [data, localRun, load]);

  useHashScroll(!!data);

  const act = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast("success", ok); await load(); } catch (e) { toast("error", errText(e, "কাজটি হয়নি — আবার চেষ্টা করুন")); } finally { setBusy(""); }
  };

  if (!data) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>;
  const h = data.health;
  const running = h.running || data.history.some((r) => r.status === "running") || !!localRun;
  const done = [data.keys.set, data.destinations.length > 0, data.schedule.enabled];
  const ready = done.every(Boolean);
  const help = oauth && !oauth.ok ? OAUTH_HELP[oauth.reason] ?? OAUTH_HELP.failed : null;

  return (
    <div className="space-y-4 max-w-5xl">
      <AdminPageHeader title="Database Backup" titleBn="ডাটাবেস Backup" descriptionBn="অর্ডার, কাস্টমার, বুকিং — সব ডেটা তালাবদ্ধ (এনক্রিপ্ট) করে আপনার ড্রাইভে বা কম্পিউটারে" />

      {help && (
        <div className="card p-4 border-l-4 border-amber-500 space-y-2" role="alert">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-none mt-0.5" />
            <p className="font-semibold flex-1">{help.title} — যেভাবে ঠিক করবেন:</p>
            <button type="button" aria-label="বন্ধ" className="min-h-11 min-w-11 -mt-3 -mr-2 flex items-center justify-center" onClick={() => setOauth(null)}><X className="w-5 h-5" /></button>
          </div>
          <ol className="list-decimal pl-6 text-sm text-gray-700 space-y-1">{help.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      )}

      {/* status */}
      <div className={`card p-4 sm:p-5 border-l-4 ${h.ok ? "border-emerald-500" : "border-red-500"}`}>
        <div className="flex items-start gap-3">
          <span className={`w-12 h-12 rounded-full flex items-center justify-center flex-none ${h.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {h.ok ? <ShieldCheck className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-lg leading-snug ${h.ok ? "text-emerald-800" : "text-red-800"}`}>{h.message_bn}</p>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              <div className="rounded-lg bg-gray-50 px-3 py-2"><p className="text-xs text-gray-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> শেষ নিরাপদ backup</p><p className="font-semibold text-gray-900">{when(h.last_success_at)}</p></div>
              <div className="rounded-lg bg-gray-50 px-3 py-2"><p className="text-xs text-gray-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> পরের স্বয়ংক্রিয় backup</p><p className="font-semibold text-gray-900">{h.next_run_at ? when(h.next_run_at) : "বন্ধ আছে"}</p></div>
            </div>
          </div>
        </div>
        <div className="grid sm:flex gap-2 mt-4">
          <div className="contents">
            <button type="button" className="btn btn-brand min-h-12 gap-1.5 text-base w-full sm:w-auto justify-center px-5 whitespace-nowrap" disabled={running || !data.keys.set || !data.destinations.length}
              onClick={() => act("run", backupApi.runNow, "Backup শুরু হয়েছে — কয়েক মিনিট লাগতে পারে")}>
              {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />} এখনই Backup নিন
            </button>
            <button type="button" className="btn btn-outline min-h-12 gap-1.5 text-base w-full sm:w-auto justify-center px-5 whitespace-nowrap" disabled={running || !data.keys.set}
              onClick={() => act("local", async () => { const r = await backupApi.runLocal(); const id = r.data.data?.run_id ?? null; localRef.current = id; setLocalRun(id); }, "তৈরি হচ্ছে — শেষ হলে নিজেই ডাউনলোড হবে")}>
              <Download className="w-5 h-5" /> কম্পিউটারে নিন
            </button>
          </div>
        </div>
        {running && <p className="mt-2 text-sm text-blue-700 flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> Backup চলছে — পাতা খোলা রাখতে হবে না, শেষ হলে ইতিহাসে দেখা যাবে।</p>}
        {!ready && <p className="mt-3 text-sm bg-brand-50 text-brand-800 rounded-lg p-2">শুরু করতে নিচের <b>৩টি ধাপ</b> শেষ করুন ({done.filter(Boolean).length.toLocaleString("bn-BD")}/৩ সম্পন্ন)।</p>}
      </div>

      <Step id="backup-password" n={1} title="Backup পাসওয়ার্ড দিন" summary={done[0] ? `সেট করা আছে · কী-চিহ্ন ${data.keys.fingerprint}` : "সব backup এই পাসওয়ার্ডে তালাবদ্ধ থাকবে"} done={done[0]} open={!done[0]}>
        <KeysSection data={data} busy={busy} act={act} />
      </Step>

      <Step id="backup-drives" n={2} title="ড্রাইভ যুক্ত করুন (যেখানে backup জমা হবে)" summary={done[1] ? data.destinations.map((d) => d.label).join(" · ") : "Google Drive, OneDrive বা Dropbox"} done={done[1]} open={(done[0] && !done[1]) || adding !== null}>
        {data.destinations.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            {data.destinations.map((d) => (
              <div key={d.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <DriveAvatar kind={d.kind} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{d.label}</p>
                    <p className="text-xs text-gray-500 truncate">{d.cfg.account || guideOf(d.kind)?.name}</p>
                    {d.last && <p className={`text-xs mt-1 ${d.last.ok ? "text-emerald-700" : "text-red-700"}`}>{d.last.ok ? "শেষবার সফল" : `শেষবার ব্যর্থ: ${d.last.error_bn}`} · {when(d.last.at)}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${d.enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-gray-50 text-gray-600 ring-gray-200"}`}>{d.enabled ? "চালু" : "বন্ধ"}</span>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1 justify-center" disabled={!!busy}
                    onClick={() => act(`t${d.id}`, () => backupApi.testDest(d.id), "ড্রাইভ ঠিকমতো কাজ করছে")}>
                    {busy === `t${d.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} পরীক্ষা
                  </button>
                  <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1 justify-center" disabled={!!busy}
                    onClick={() => act(`e${d.id}`, () => backupApi.patchDest(d.id, { enabled: !d.enabled }))}>
                    <Power className="w-4 h-4" /> {d.enabled ? "বন্ধ করুন" : "চালু করুন"}
                  </button>
                  {guideOf(d.kind)?.oauth && (
                    <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1 justify-center" disabled={!!busy}
                      onClick={() => setAsk({ title: "আবার সংযোগ করুন", note: "ড্রাইভের লগইন পাতায় নিয়ে যাওয়া হবে।", onOk: async (pw) => {
                        try { const r = await backupApi.reconnect(d.id, pw); window.location.href = r.data.data!.authorize_url; } catch (e) { toast("error", errText(e, "হয়নি")); }
                      } })}>
                      <RefreshCw className="w-4 h-4" /> আবার সংযোগ
                    </button>
                  )}
                  <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1 justify-center text-red-700 border-red-200 hover:bg-red-50" disabled={!!busy}
                    onClick={() => setAsk({ title: `“${d.label}” সংযোগ সরাবেন?`, note: "ড্রাইভে থাকা পুরোনো backup ফাইল মুছবে না — শুধু সংযোগ সরবে।", danger: true,
                      onOk: (pw) => act(`x${d.id}`, () => backupApi.removeDest(d.id, pw), "সংযোগ সরানো হয়েছে") })}>
                    <Trash2 className="w-4 h-4" /> সরান
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {adding === null ? (
          <button type="button" className="btn btn-brand min-h-12 gap-1.5 w-full sm:w-auto justify-center" disabled={!data.keys.set} onClick={() => setAdding("")}>
            <Plus className="w-4 h-4" /> {data.destinations.length ? "আরেকটি ড্রাইভ যোগ করুন" : "ড্রাইভ যোগ করুন"}
          </button>
        ) : (
          <AddDrive kind={adding} setKind={setAdding} redirectUri={data.redirect_uri} oneClick={data.one_click} onDone={load} />
        )}
        {!data.keys.set && <p className="text-xs text-gray-500">আগে ধাপ ১ (পাসওয়ার্ড) শেষ করুন।</p>}
      </Step>

      <Step id="backup-auto" n={3} title="প্রতিদিন নিজে Backup চালু করুন" summary={done[2] ? `প্রতিদিন ${String(data.schedule.hour).padStart(2, "0")}:${String(data.schedule.minute).padStart(2, "0")} (বাংলাদেশ সময়)` : "বন্ধ আছে"} done={done[2]} open={done[0] && done[1] && !done[2]}>
        <ScheduleSection data={data} busy={busy} act={act} />
      </Step>

      <GithubCopy />

      <ContentCopy />

      <section id="backup-history" className="card p-4 sm:p-5 space-y-3 scroll-mt-24 transition">
        <h2 className="font-semibold text-gray-900">Backup-এর ইতিহাস</h2>
        {data.history.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
            <Cloud className="w-8 h-8 mx-auto text-gray-400 mb-2" />এখনো কোনো backup হয়নি — ধাপগুলো শেষ করে “এখনই Backup নিন” চাপুন।
          </div>
        )}
        <div className="space-y-2">
          {(showAll ? data.history : data.history.slice(0, 10)).map((r) => (
            <div key={r.id} className={`rounded-xl border border-gray-200 border-l-4 ${BORDER[r.status] ?? ""} p-3 text-sm`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.bn}</span>
                <span className="font-medium">{TRIGGER[r.trigger] ?? r.trigger}</span>
                <span className="text-gray-500">{when(r.started_at)}</span>
                {r.size != null && <span className="text-gray-500">· {size(r.size)}</span>}
                {r.row_total != null && <span className="text-gray-500">· {r.row_total.toLocaleString("bn-BD")} সারি</span>}
              </div>
              {r.error_bn && <p className="text-red-700 text-xs mt-1">{r.error_bn}</p>}
              {r.trigger === "restore_test" && <p className="text-xs text-gray-600 mt-1">{r.name} → {r.target} · {r.tables} টেবিল{r.missing?.length ? ` · অনুপস্থিত: ${r.missing.join(", ")}` : ""}</p>}
              {r.destinations?.map((d) => (
                <div key={d.dest_id} className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                  <span className={d.ok ? "text-emerald-700" : "text-red-700"}>{d.ok ? "✓" : "✗"} {d.label}{d.verified ? " (যাচাই করা)" : ""}{d.error_bn ? `: ${d.error_bn}` : ""}</span>
                  {d.ok && d.file_id && (
                    <button type="button" className="text-brand-700 underline min-h-8" onClick={() => setTesting({ run: r, destId: d.dest_id, fileId: d.file_id })}>ঠিক আছে কি না পরীক্ষা করুন</button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        {data.history.length > 10 && !showAll && (
          <button type="button" className="text-sm text-brand-700 underline min-h-11" onClick={() => setShowAll(true)}>আরও {(data.history.length - 10).toLocaleString("bn-BD")}টি দেখুন</button>
        )}
        <button type="button" className="btn btn-outline min-h-11 gap-1.5 w-full sm:w-auto justify-center px-5" onClick={() => setTesting({})}><Upload className="w-4 h-4" /> কম্পিউটারের backup ফাইল পরীক্ষা করুন</button>
      </section>

      {testing && <TestPanel src={testing} onClose={() => { setTesting(null); load(); }} />}
      {ask && <PasswordDialog ask={ask} onClose={() => setAsk(null)} />}
    </div>
  );
}

type Act = (key: string, fn: () => Promise<unknown>, ok?: string) => Promise<void>;

/** GitHub Actions daily copy — an extra, independent backup with its own on/off switch. */
function GithubCopy() {
  const toast = useToastStore((s) => s.push);
  const [g, setG] = useState<GithubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // Optional card: any failure (even a synchronous one) just hides it.
    Promise.resolve().then(() => backupApi.github()).then((r) => setG(r.data.data ?? null)).catch(() => setG(null));
  }, []);
  if (!g) return null;
  const toggle = async () => {
    setBusy(true);
    try {
      const r = await backupApi.setGithub(!g.enabled);
      setG({ ...g, enabled: !!r.data.data?.enabled });
      toast("success", r.data.message || "সংরক্ষিত হয়েছে");
    } catch (e) {
      toast("error", errText(e, "বদলানো যায়নি"));
    } finally {
      setBusy(false);
    }
  };
  const last = g.runs[0];
  return (
    <section id="backup-github" className="card p-4 sm:p-5 space-y-3 scroll-mt-24 transition">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="w-9 h-9 rounded-xl bg-gray-900 text-white font-bold flex items-center justify-center flex-none">GH</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900">GitHub — অতিরিক্ত কপি</h2>
          <p className="text-xs text-gray-600">প্রতিদিন রাত ৩:৩০-এ GitHub নিজের সার্ভারে আলাদা একটি কপি রাখে (১৪ দিন)। ড্রাইভের backup-এর বাইরে বাড়তি নিরাপত্তা।</p>
        </div>
        <button type="button" role="switch" aria-checked={g.enabled} disabled={busy} onClick={toggle}
          className={`relative inline-flex h-8 w-14 flex-none items-center rounded-full transition min-h-8 ${g.enabled ? "bg-emerald-600" : "bg-gray-300"}`}>
          <span className="sr-only">GitHub backup {g.enabled ? "চালু" : "বন্ধ"}</span>
          <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${g.enabled ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>
      <p className="text-sm">{g.enabled ? "✓ চালু" : "বন্ধ — GitHub আর কপি নেবে না"}{last ? ` · শেষ চেষ্টা: ${when(last.at)} — ${last.result === "success" ? "সফল" : last.result === "failure" ? "ব্যর্থ" : "চলছে"}` : ""}</p>
      {g.reason_bn && last?.result === "failure" && (
        <p className="text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-900 p-2">⚠️ {g.reason_bn}</p>
      )}
      {g.runs.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="শেষ ৫টি চেষ্টা">
          {g.runs.map((r) => (
            <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" title={when(r.at)}
              className={`text-xs px-2 py-1 rounded-full ring-1 min-h-8 inline-flex items-center ${r.result === "success" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : r.result === "failure" ? "bg-red-50 text-red-700 ring-red-200" : "bg-gray-50 text-gray-600 ring-gray-200"}`}>
              {r.result === "success" ? "✓" : r.result === "failure" ? "✗" : "…"} {new Date(r.at).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}
            </a>
          ))}
        </div>
      )}
      <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-700 underline inline-flex items-center gap-1 min-h-11">GitHub-এ সব দেখুন <ExternalLink className="w-3.5 h-3.5" /></a>
    </section>
  );
}

function printRecoveryCard(passphrase: string, fingerprint: string) {
  const w = window.open("", "_blank", "width=600,height=700");
  if (!w) return;
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  w.document.write(`<!doctype html><html lang="bn"><meta charset="utf-8"><title>ABO Backup রিকভারি কার্ড</title>
<body style="font-family:sans-serif;padding:24px;line-height:1.6">
<h2>ABO Enterprise — ডাটাবেস Backup রিকভারি কার্ড</h2>
<p><b>Backup পাসওয়ার্ড:</b></p><p style="font-size:20px;border:2px dashed #333;padding:12px;word-break:break-all">${esc(passphrase)}</p>
<p><b>কী-চিহ্ন (fingerprint):</b> ${esc(fingerprint)}</p>
<p>এই কাগজটি আলমারি/লকারে রাখুন। কম্পিউটার বা ফোনে ছবি তুলে রাখবেন না। এই পাসওয়ার্ড ছাড়া কোনো backup খোলা যাবে না।</p>
<p>তারিখ: ${new Date().toLocaleDateString("bn-BD")}</p>
<script>window.print()</script></body></html>`);
  w.document.close();
}

function KeysSection({ data, busy, act }: { data: BackupSummary; busy: string; act: Act }) {
  const [open, setOpen] = useState(!data.keys.set);
  const [f, setF] = useState({ passphrase: "", confirm: "", old_passphrase: "", password: "" });
  const [saved, setSaved] = useState<{ pass: string; fp: string } | null>(null);
  const strong = f.passphrase.length >= 12;
  const ok = strong && f.passphrase === f.confirm && f.password && (!data.keys.set || f.old_passphrase);
  return (
    <>
      {data.keys.set && <p className="text-sm text-emerald-700 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> পাসওয়ার্ড সেট করা আছে · কী-চিহ্ন: {data.keys.fingerprint}</p>}
      <p className="text-sm text-gray-600">প্রতিটি backup এই পাসওয়ার্ড দিয়ে তালাবদ্ধ হয়। ড্রাইভ বা সার্ভার হ্যাক হলেও পাসওয়ার্ড ছাড়া কেউ খুলতে পারবে না। <b className="text-red-700">পাসওয়ার্ড হারালে backup আর খোলা যাবে না</b> — তাই সেভ করার পরে “রিকভারি কার্ড প্রিন্ট” করে নিরাপদে রাখুন।</p>
      {saved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm flex flex-wrap items-center gap-2">
          <span className="flex-1">✓ পাসওয়ার্ড সেট হয়েছে। এখনই কাগজে প্রিন্ট করে রাখুন (ঐচ্ছিক)।</span>
          <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1" onClick={() => printRecoveryCard(saved.pass, saved.fp)}><Printer className="w-4 h-4" /> রিকভারি কার্ড প্রিন্ট</button>
          <button type="button" className="btn btn-outline btn-sm min-h-11" onClick={() => setSaved(null)}>পরে</button>
        </div>
      )}
      {!open ? (
        <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1" onClick={() => setOpen(true)}><KeyRound className="w-4 h-4" /> পাসওয়ার্ড বদলান</button>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {data.keys.set && <input className={input} type="password" placeholder="পুরোনো Backup পাসওয়ার্ড" value={f.old_passphrase} onChange={(e) => setF({ ...f, old_passphrase: e.target.value })} autoComplete="off" />}
          <div>
            <input className={input} type="password" placeholder="নতুন Backup পাসওয়ার্ড (কমপক্ষে ১২ অক্ষর)" value={f.passphrase} onChange={(e) => setF({ ...f, passphrase: e.target.value })} autoComplete="new-password" />
            {f.passphrase && <p className={`text-xs mt-1 ${strong ? "text-emerald-700" : "text-red-700"}`}>{strong ? "✓ যথেষ্ট লম্বা" : `আরও ${(12 - f.passphrase.length).toLocaleString("bn-BD")} অক্ষর লাগবে`} — উদাহরণ: “আমার দোকান ২০২৬ সিলেট”</p>}
          </div>
          <div>
            <input className={input} type="password" placeholder="আবার একই পাসওয়ার্ড লিখুন" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" />
            {f.confirm && f.confirm !== f.passphrase && <p className="text-xs mt-1 text-red-700">দুটো মেলেনি</p>}
          </div>
          <input className={input} type="password" placeholder="আপনার অ্যাডমিন লগইন পাসওয়ার্ড" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
          {data.keys.set && <p className="text-xs text-amber-700 sm:col-span-2">পুরোনো backup-গুলো পুরোনো পাসওয়ার্ড দিয়েই খুলবে — সেটিও রেখে দিন।</p>}
          <button type="button" className="btn btn-brand min-h-11 sm:col-span-2" disabled={!ok || !!busy}
            onClick={() => act("keys", async () => {
              const r = await backupApi.setKeys({ passphrase: f.passphrase, old_passphrase: f.old_passphrase, password: f.password });
              setSaved({ pass: f.passphrase, fp: r.data.data?.fingerprint ?? "" });
              setOpen(false);
              setF({ passphrase: "", confirm: "", old_passphrase: "", password: "" });
            }, "Backup পাসওয়ার্ড সেট হয়েছে")}>
            {busy === "keys" ? <Loader2 className="w-4 h-4 animate-spin" /> : "সংরক্ষণ করুন"}
          </button>
        </div>
      )}
    </>
  );
}

function AddDrive({ kind, setKind, redirectUri, oneClick, onDone }: {
  kind: DestKind | ""; setKind: (k: DestKind | "" | null) => void; redirectUri: string;
  oneClick: Partial<Record<DestKind, boolean>>; onDone: () => void;
}) {
  const toast = useToastStore((s) => s.push);
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [own, setOwn] = useState(false); // use own Client ID even when one-click is available
  const [more, setMore] = useState(false);
  const g = kind ? guideOf(kind) : undefined;
  const easy = !!(kind && oneClick[kind]) && !own;
  const field = (k: string, ph: string, type = "text") => (
    <input key={k} className={input} type={type} placeholder={ph} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} autoComplete="off" />
  );
  const submit = async () => {
    setBusy(true);
    try {
      const body: Record<string, string> = { ...f, kind: kind as string };
      if (easy) { delete body.client_id; delete body.client_secret; }
      const r = await backupApi.addDest(body);
      if (r.data.data?.authorize_url) { window.location.href = r.data.data.authorize_url; return; }
      toast("success", "ড্রাইভ যুক্ত হয়েছে ও পরীক্ষায় পাস করেছে");
      setKind(null);
      onDone();
    } catch (e) {
      toast("error", errText(e, "ড্রাইভ যুক্ত হয়নি"));
    } finally { setBusy(false); }
  };
  const card = (d: (typeof DRIVE_GUIDES)[number]) => (
    <button key={d.kind} type="button" className="text-left rounded-xl border border-gray-200 bg-white p-3 min-h-16 hover:border-brand-400 hover:shadow-sm transition flex items-center gap-3" onClick={() => setKind(d.kind)}>
      <DriveAvatar kind={d.kind} big />
      <span className="min-w-0">
      <p className="font-medium flex flex-wrap items-center gap-1.5">{d.name}{oneClick[d.kind] && <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-flex items-center gap-0.5"><Zap className="w-3 h-3" />এক ক্লিকে</span>}</p>
      <p className="text-xs text-gray-600">{d.free}</p>
      </span>
    </button>
  );
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium flex items-center gap-2">{g && <DriveAvatar kind={g.kind} />}{g ? g.name : "কোন ড্রাইভে backup রাখবেন?"}</p>
        <button type="button" aria-label="বন্ধ" className="min-h-11 min-w-11 flex items-center justify-center" onClick={() => setKind(null)}><X className="w-5 h-5" /></button>
      </div>
      {!g ? (
        <>
          <div className="grid sm:grid-cols-3 gap-2">{DRIVE_GUIDES.filter((d) => MAIN_DRIVES.includes(d.kind)).map(card)}</div>
          {!more ? (
            <button type="button" className="text-sm text-brand-700 underline min-h-11" onClick={() => setMore(true)}>আরও বিকল্প (S3 স্টোরেজ, WebDAV / NAS) — উন্নত</button>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">{DRIVE_GUIDES.filter((d) => !MAIN_DRIVES.includes(d.kind)).map(card)}</div>
          )}
        </>
      ) : (
        <>
          {kind === "google_drive" && !oneClick.google_drive && <AppFileBox onDone={onDone} />}
          {easy ? (
            <p className="text-sm text-gray-700">“সংযুক্ত করুন” চাপলে {g.name}-এর লগইন পাতা খুলবে → আপনার অ্যাকাউন্ট বেছে <b>Allow</b> চাপুন → নিজেই এখানে ফিরে আসবে। আর কিছু করতে হবে না।</p>
          ) : (
            <>
              <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              <a href={g.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 underline text-sm min-h-11">{g.linkLabel} <ExternalLink className="w-3.5 h-3.5" /></a>
              {g.oauth && (
                <div className="text-sm">
                  <p className="text-gray-600">Redirect URI (কপি করে বসান):</p>
                  <div className="flex gap-2 items-center"><code className="flex-1 break-all bg-white border rounded p-2 text-xs">{redirectUri}</code>
                    <button type="button" aria-label="কপি" className="btn btn-outline btn-sm min-h-11" onClick={() => { navigator.clipboard?.writeText(redirectUri); toast("success", "কপি হয়েছে"); }}><Copy className="w-4 h-4" /></button></div>
                </div>
              )}
            </>
          )}
          {g.note && <p className="text-xs text-emerald-700">🔒 {g.note}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            {field("label", "নাম (ঐচ্ছিক, যেমন: দোকানের Google Drive)")}
            {g.oauth && !easy && [field("client_id", "Client ID / App key"), field("client_secret", "Client Secret / App secret", "password")]}
            {kind === "s3" && [field("endpoint", "Endpoint (https://…)"), field("region", "Region (R2 হলে auto)"), field("bucket", "Bucket নাম"),
              field("prefix", "ফোল্ডার (ঐচ্ছিক)"), field("access_key", "Access Key ID"), field("secret_key", "Secret Access Key", "password")]}
            {kind === "webdav" && [field("url", "WebDAV ঠিকানা (https://…)"), field("username", "ইউজারনেম"), field("dav_password", "App password", "password"), field("folder", "ফোল্ডার (ঐচ্ছিক)")]}
            {field("password", "আপনার অ্যাডমিন লগইন পাসওয়ার্ড", "password")}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-brand min-h-12 w-full sm:w-auto justify-center" disabled={busy || !f.password} onClick={submit}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : g.oauth ? "সংযুক্ত করুন" : "যোগ ও পরীক্ষা করুন"}</button>
            <button type="button" className="btn btn-outline min-h-11" onClick={() => setKind("")}>অন্য ড্রাইভ</button>
            {g.oauth && oneClick[g.kind] && (
              <button type="button" className="text-sm text-gray-600 underline min-h-11" onClick={() => setOwn(!own)}>{own ? "এক ক্লিকে সংযোগে ফিরুন" : "নিজের Client ID দিয়ে (উন্নত)"}</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Upload the client_secret_….json Google gave once → one-click connect from then on. */
function AppFileBox({ onDone }: { onDone: () => void }) {
  const toast = useToastStore((s) => s.push);
  const [file, setFile] = useState<File | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("kind", "google_drive");
      fd.append("password", pw);
      fd.append("file", file);
      await backupApi.setAppClient(fd);
      toast("success", "এক-ক্লিক সংযোগ চালু হয়েছে — এখন “সংযুক্ত করুন” চাপুন");
      onDone();
    } catch (e) {
      toast("error", errText(e, "ফাইলটি নেওয়া যায়নি"));
    } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3 space-y-2">
      <p className="font-medium text-emerald-900 flex items-center gap-1.5"><Zap className="w-4 h-4" /> সহজ উপায়: Google থেকে ডাউনলোড করা JSON ফাইলটি একবার দিন</p>
      <p className="text-sm text-emerald-900">ফাইলের নাম “client_secret_….json”। একবার দিলে এরপর সবসময় শুধু “সংযুক্ত করুন → Allow”। নিচের লম্বা ধাপগুলো আর লাগবে না।</p>
      <input type="file" accept=".json,application/json" className="block min-h-11" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <input className={input} type="password" placeholder="আপনার অ্যাডমিন লগইন পাসওয়ার্ড" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
      <button type="button" className="btn btn-brand min-h-11" disabled={!file || !pw || busy} onClick={send}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "ফাইল দিন ও চালু করুন"}
      </button>
      <p className="text-xs text-emerald-900">মনে রাখবেন: Google Cloud-এ “Google Auth Platform → Audience → Publish app” একবার চাপা থাকতে হবে, নইলে Allow-এর সময় 403 আসবে।</p>
    </div>
  );
}

function ScheduleSection({ data, busy, act }: { data: BackupSummary; busy: string; act: Act }) {
  const toast = useToastStore((s) => s.push);
  const [s, setS] = useState({ ...data.schedule, ...data.retention });
  const time = `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
  const num = (k: "daily" | "weekly" | "monthly", label: string) => (
    <label className="text-sm">{label}<input className={input} type="number" min={k === "daily" ? 1 : 0} value={s[k]} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) || 0 })} /></label>
  );
  return (
    <>
      <label className="flex items-center gap-3 min-h-11 cursor-pointer">
        <input type="checkbox" className="w-6 h-6" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
        <span className="text-base">প্রতিদিন নিজে থেকে backup নিন (চালু থাকা সব ড্রাইভে)</span>
      </label>
      <label className="text-sm block max-w-xs">কখন (বাংলাদেশ সময়) — রাতে রাখা ভালো
        <input className={input} type="time" value={time} onChange={(e) => { const [hh, mm] = e.target.value.split(":").map(Number); setS({ ...s, hour: hh || 0, minute: mm || 0 }); }} />
      </label>
      <p className="text-xs text-gray-600">আলাদা কিছু বসাতে হবে না — ওয়েবসাইট নিজেই সময়মতো backup নেবে। ব্যর্থ হলে আপনার ইমেইলে জানানো হবে।</p>
      <button type="button" className="btn btn-brand min-h-11" disabled={!!busy || !data.destinations.length} onClick={() => act("sch", () => backupApi.schedule(s), "সংরক্ষিত হয়েছে")}>সংরক্ষণ করুন</button>
      <details className="rounded-lg border border-gray-200 p-3 text-sm">
        <summary className="cursor-pointer min-h-11 flex items-center font-medium">উন্নত সেটিং (সাধারণত বদলানোর দরকার নেই)</summary>
        <div className="space-y-3 pt-2">
          <p className="text-gray-600">পুরোনো backup কতগুলো রাখা হবে — নতুনটি যাচাইয়ে পাস করলে তবেই পুরোনো মোছে।</p>
          <div className="grid grid-cols-3 gap-3">{num("daily", "দৈনিক")}{num("weekly", "সাপ্তাহিক")}{num("monthly", "মাসিক")}</div>
          <p className="text-gray-700">অতিরিক্ত নিরাপত্তা (ঐচ্ছিক): cron-job.org-এ এই লিংকটি “প্রতি ঘণ্টা” বসালে সার্ভার ঘুমিয়ে থাকলেও backup মিস হবে না। লিংকটি গোপন রাখুন।</p>
          <div className="flex gap-2 items-center"><code className="flex-1 break-all bg-white border rounded p-2 text-xs">{data.cron_url}</code>
            <button type="button" aria-label="কপি" className="btn btn-outline btn-sm min-h-11" onClick={() => { navigator.clipboard?.writeText(data.cron_url); toast("success", "কপি হয়েছে"); }}><Copy className="w-4 h-4" /></button></div>
        </div>
      </details>
    </>
  );
}

function TestPanel({ src, onClose }: { src: { run?: BackupRun; destId?: string; fileId?: string }; onClose: () => void }) {
  const toast = useToastStore((s) => s.push);
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({ passphrase: "", target_url: "", password: "", confirm: false });
  const [job, setJob] = useState<JobState | null>(null);
  const fromDrive = !!src.fileId;

  useEffect(() => {
    if (!job || job.status !== "running") return;
    const t = setTimeout(async () => {
      try { const r = await backupApi.job(job.id); setJob(r.data.data ?? null); } catch (e) { setJob({ ...job, status: "failed", error_bn: errText(e, "অবস্থা জানা যায়নি") }); }
    }, 3000);
    return () => clearTimeout(t);
  }, [job]);

  const start = async (restore: boolean) => {
    const fd = new FormData();
    if (fromDrive) { fd.append("dest_id", src.destId!); fd.append("file_id", src.fileId!); } else if (file) fd.append("file", file);
    fd.append("passphrase", f.passphrase);
    if (restore) { fd.append("target_url", f.target_url); fd.append("password", f.password); fd.append("confirm", String(f.confirm)); }
    try {
      const r = await (restore ? backupApi.restoreTest(fd) : backupApi.verify(fd));
      setJob({ id: r.data.data!.job_id, status: "running" });
    } catch (e) { toast("error", errText(e, "শুরু করা যায়নি")); }
  };
  const res = job?.result as { ok?: boolean; tables?: { table: string; backup: number | null; restored: number | null; ok: boolean }[]; decrypted?: boolean; toc?: { tables: number } } | undefined;
  const noFile = !fromDrive && !file;

  return (
    <div className="card p-4 sm:p-5 space-y-3 border-2 border-brand-200">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Backup ঠিক আছে কি না পরীক্ষা {src.run?.name ? `— ${src.run.name}` : ""}</h2>
        <button type="button" aria-label="বন্ধ" className="min-h-11 min-w-11 flex items-center justify-center" onClick={onClose}><X className="w-5 h-5" /></button>
      </div>
      <p className="text-sm text-gray-600">Backup পাসওয়ার্ড দিয়ে ফাইলটি খুলে দেখা হবে ভেতরের সব টেবিল ঠিক আছে কি না। ওয়েবসাইটের কিছুই বদলাবে না।</p>
      {!fromDrive && <input type="file" accept=".abobak" className="block min-h-11" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />}
      <input className={input} type="password" placeholder="Backup পাসওয়ার্ড" value={f.passphrase} onChange={(e) => setF({ ...f, passphrase: e.target.value })} autoComplete="off" />
      <button type="button" className="btn btn-brand min-h-11" disabled={noFile || !f.passphrase || job?.status === "running"} onClick={() => start(false)}>পরীক্ষা করুন</button>

      <details className="rounded-lg border border-red-200 bg-red-50 p-3">
        <summary className="cursor-pointer min-h-11 flex items-center text-sm font-medium text-red-800">উন্নত: আলাদা পরীক্ষার ডাটাবেসে পুরো Restore করে দেখুন</summary>
        <div className="space-y-2 pt-2">
          <p className="text-sm text-red-800">নতুন একটি ফ্রি Supabase project-এ backup ফেরত এনে প্রতিটি টেবিলের সারি মেলানো হবে। আসল ওয়েবসাইটের ডাটাবেস দিলে সিস্টেম নিজেই আটকে দেবে।</p>
          <input className={input} type="password" placeholder="পরীক্ষার ডাটাবেসের URL (postgresql://…)" value={f.target_url} onChange={(e) => setF({ ...f, target_url: e.target.value })} autoComplete="off" />
          <input className={input} type="password" placeholder="আপনার অ্যাডমিন লগইন পাসওয়ার্ড" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
          <label className="flex items-start gap-2 text-sm min-h-11"><input type="checkbox" className="w-5 h-5 mt-0.5" checked={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.checked })} />
            বুঝেছি — পরীক্ষার ডাটাবেসের পুরোনো ডেটা মুছে এই backup বসানো হবে।</label>
          <button type="button" className="btn btn-outline min-h-11" disabled={noFile || !f.passphrase || !f.target_url || !f.password || !f.confirm || job?.status === "running"} onClick={() => start(true)}>পরীক্ষা-Restore শুরু করুন</button>
        </div>
      </details>

      {job && (
        <div className={`rounded-lg p-3 text-sm ${job.status === "failed" ? "bg-red-50 text-red-800" : job.status === "ok" ? (res?.ok === false ? "bg-amber-50" : "bg-emerald-50 text-emerald-800") : "bg-blue-50"}`} role="status">
          {job.status === "running" && <p className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> চলছে… কয়েক মিনিট লাগতে পারে</p>}
          {job.status === "failed" && <p>{job.error_bn}</p>}
          {job.status === "ok" && !res?.tables && <p>✓ ফাইল অক্ষত{res?.decrypted ? ` · পাসওয়ার্ড ঠিক · ${(res.toc?.tables ?? 0).toLocaleString("bn-BD")}টি টেবিল পড়া গেছে — এই backup দিয়ে ফেরত আনা যাবে` : ""}</p>}
          {job.status === "ok" && res?.tables && (
            <>
              <p className="font-medium">{res.ok ? "✓ Restore পরীক্ষা সফল — সব টেবিল মিলেছে" : "কিছু টেবিল মেলেনি"}</p>
              <div className="max-h-64 overflow-auto mt-2 text-xs">
                {res.tables.map((t) => <p key={t.table} className={t.ok ? "" : "text-red-700"}>{t.ok ? "✓" : "✗"} {t.table}: backup {t.backup ?? "—"} → restore {t.restored ?? "নেই"}</p>)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
