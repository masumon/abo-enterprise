"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Clock, Cloud, Copy, Download, ExternalLink, KeyRound, Loader2, Plus, Power,
  RefreshCw, ShieldCheck, Trash2, Upload, X,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useToastStore } from "@/store/toast";
import {
  backupApi, DRIVE_GUIDES, guideOf, type BackupRun, type BackupSummary, type DestKind, type JobState,
} from "@/lib/backup";

const errText = (e: unknown, fb: string) =>
  (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || fb;
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" }) : "—");
const size = (n?: number) => (n == null ? "—" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const TRIGGER: Record<string, string> = { auto: "স্বয়ংক্রিয়", manual: "ম্যানুয়াল", local: "কম্পিউটারে", restore_test: "Restore পরীক্ষা" };
const STATUS: Record<string, { bn: string; cls: string }> = {
  ok: { bn: "সফল ও যাচাই করা", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  partial: { bn: "আংশিক", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  failed: { bn: "ব্যর্থ", cls: "bg-red-50 text-red-700 ring-red-200" },
  running: { bn: "চলছে…", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
};
const input = "input w-full min-h-11 text-base";

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5 space-y-3">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-sm flex items-center justify-center">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}

export default function BackupPage() {
  const toast = useToastStore((s) => s.push);
  const [data, setData] = useState<BackupSummary | null>(null);
  const [busy, setBusy] = useState("");
  const [localRun, setLocalRun] = useState<string | null>(null);
  const [adding, setAdding] = useState<DestKind | "" | null>(null);
  const [testing, setTesting] = useState<{ run?: BackupRun; destId?: string; fileId?: string } | null>(null);
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
    const q = new URLSearchParams(window.location.search).get("oauth");
    if (q) {
      const msg: Record<string, [string, string]> = {
        ok: ["success", "ড্রাইভ যুক্ত হয়েছে ও পরীক্ষায় পাস করেছে"], denied: ["error", "অনুমতি দেওয়া হয়নি"],
        expired: ["error", "সময় শেষ — আবার “সংযুক্ত করুন” চাপুন"], failed: ["error", "সংযোগ হয়নি — Client ID/Secret ও Redirect URI দেখুন"],
      };
      const [t, m] = msg[q] ?? msg.failed;
      toast(t as "success" | "error", m);
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

  const act = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast("success", ok); await load(); } catch (e) { toast("error", errText(e, "কাজটি হয়নি — আবার চেষ্টা করুন")); } finally { setBusy(""); }
  };
  const askPassword = () => window.prompt("নিরাপত্তার জন্য আপনার অ্যাডমিন পাসওয়ার্ড দিন") || "";

  if (!data) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>;
  const h = data.health;
  const running = h.running || data.history.some((r) => r.status === "running") || !!localRun;

  return (
    <div className="space-y-4 max-w-5xl">
      <AdminPageHeader title="Database Backup" titleBn="ডাটাবেস Backup" descriptionBn="অর্ডার, কাস্টমার, বুকিং — সব ডেটা এনক্রিপ্ট করে আপনার ড্রাইভে বা কম্পিউটারে" />

      {/* status */}
      <div className={`card p-4 sm:p-5 border-l-4 ${h.ok ? "border-emerald-500" : "border-red-500"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className={`font-semibold flex items-center gap-2 ${h.ok ? "text-emerald-700" : "text-red-700"}`}>
              {h.ok ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}{h.message_bn}
            </p>
            <p className="text-sm text-gray-600 mt-1">শেষ যাচাই-করা backup: {when(h.last_success_at)} · স্বয়ংক্রিয়: {h.schedule_enabled ? "চালু" : "বন্ধ"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-brand min-h-11 gap-1.5" disabled={running || !data.keys.set || !data.destinations.length}
              onClick={() => act("run", backupApi.runNow, "Backup শুরু হয়েছে — কয়েক মিনিট লাগতে পারে")}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />} এখনই Backup নিন
            </button>
            <button type="button" className="btn btn-outline min-h-11 gap-1.5" disabled={running || !data.keys.set}
              onClick={() => act("local", async () => { const r = await backupApi.runLocal(); const id = r.data.data?.run_id ?? null; localRef.current = id; setLocalRun(id); }, "তৈরি হচ্ছে — শেষ হলে নিজেই ডাউনলোড হবে")}>
              <Download className="w-4 h-4" /> কম্পিউটারে নিন
            </button>
          </div>
        </div>
      </div>

      <KeysSection data={data} busy={busy} act={act} />

      <Section n="২" title="ড্রাইভ (যেটা ইচ্ছা যোগ করুন)">
        {data.destinations.length === 0 && <p className="text-sm text-gray-600">এখনো কোনো ড্রাইভ যুক্ত নেই।</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {data.destinations.map((d) => (
            <div key={d.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Cloud className="w-5 h-5 text-brand-600 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{d.label}</p>
                  <p className="text-xs text-gray-500 truncate">{d.cfg.account || guideOf(d.kind)?.name}</p>
                  {d.last && <p className={`text-xs mt-1 ${d.last.ok ? "text-emerald-700" : "text-red-700"}`}>{d.last.ok ? "শেষবার সফল" : `শেষবার ব্যর্থ: ${d.last.error_bn}`} · {when(d.last.at)}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${d.enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-gray-50 text-gray-600 ring-gray-200"}`}>{d.enabled ? "চালু" : "বন্ধ"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1" disabled={!!busy}
                  onClick={() => act(`t${d.id}`, () => backupApi.testDest(d.id), "ড্রাইভ ঠিকমতো কাজ করছে")}>
                  {busy === `t${d.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} পরীক্ষা
                </button>
                <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1" disabled={!!busy}
                  onClick={() => act(`e${d.id}`, () => backupApi.patchDest(d.id, { enabled: !d.enabled }))}>
                  <Power className="w-4 h-4" /> {d.enabled ? "বন্ধ করুন" : "চালু করুন"}
                </button>
                {guideOf(d.kind)?.oauth && (
                  <button type="button" className="btn btn-outline btn-sm min-h-11" disabled={!!busy}
                    onClick={() => { const p = askPassword(); if (p) act(`r${d.id}`, async () => { const r = await backupApi.reconnect(d.id, p); window.location.href = r.data.data!.authorize_url; }); }}>
                    আবার সংযোগ
                  </button>
                )}
                <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1 text-red-600" disabled={!!busy}
                  onClick={() => { if (!window.confirm("এই ড্রাইভের সংযোগ সরাবেন? ড্রাইভের ফাইল মুছবে না।")) return; const p = askPassword(); if (p) act(`x${d.id}`, () => backupApi.removeDest(d.id, p), "সংযোগ সরানো হয়েছে"); }}>
                  <Trash2 className="w-4 h-4" /> সরান
                </button>
              </div>
            </div>
          ))}
        </div>
        {adding === null ? (
          <button type="button" className="btn btn-brand min-h-11 gap-1.5" onClick={() => setAdding("")}><Plus className="w-4 h-4" /> ড্রাইভ যোগ করুন</button>
        ) : (
          <AddDrive kind={adding} setKind={setAdding} redirectUri={data.redirect_uri} onDone={load} />
        )}
      </Section>

      <ScheduleSection data={data} busy={busy} act={act} />

      <Section n="৪" title="Backup-এর ইতিহাস">
        {data.history.length === 0 && <p className="text-sm text-gray-600">এখনো কোনো backup হয়নি।</p>}
        <div className="space-y-2">
          {data.history.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 p-3 text-sm">
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
                    <button type="button" className="text-brand-700 underline min-h-8" onClick={() => setTesting({ run: r, destId: d.dest_id, fileId: d.file_id })}>যাচাই / Restore পরীক্ষা</button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-outline min-h-11 gap-1.5" onClick={() => setTesting({})}><Upload className="w-4 h-4" /> কম্পিউটারের ফাইল যাচাই / Restore পরীক্ষা</button>
      </Section>

      {testing && <TestPanel src={testing} onClose={() => { setTesting(null); load(); }} />}
    </div>
  );
}

type Act = (key: string, fn: () => Promise<unknown>, ok?: string) => Promise<void>;

function KeysSection({ data, busy, act }: { data: BackupSummary; busy: string; act: Act }) {
  const [open, setOpen] = useState(!data.keys.set);
  const [f, setF] = useState({ passphrase: "", confirm: "", old_passphrase: "", password: "" });
  const ok = f.passphrase.length >= 12 && f.passphrase === f.confirm && f.password && (!data.keys.set || f.old_passphrase);
  return (
    <Section n="১" title="Backup পাসওয়ার্ড (এনক্রিপশন)">
      {data.keys.set && <p className="text-sm text-emerald-700 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> সেট করা আছে · কী: {data.keys.fingerprint}</p>}
      <p className="text-sm text-gray-600">প্রতিটি backup এই পাসওয়ার্ড দিয়ে তালাবদ্ধ হয়। সার্ভার বা ড্রাইভ হ্যাক হলেও পাসওয়ার্ড ছাড়া কেউ খুলতে পারবে না। <b className="text-red-700">পাসওয়ার্ড হারালে backup আর খোলা যাবে না</b> — কাগজে লিখে নিরাপদে রাখুন।</p>
      {!open ? (
        <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1" onClick={() => setOpen(true)}><KeyRound className="w-4 h-4" /> পাসওয়ার্ড বদলান</button>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {data.keys.set && <input className={input} type="password" placeholder="পুরোনো Backup পাসওয়ার্ড" value={f.old_passphrase} onChange={(e) => setF({ ...f, old_passphrase: e.target.value })} autoComplete="off" />}
          <input className={input} type="password" placeholder="নতুন Backup পাসওয়ার্ড (কমপক্ষে ১২ অক্ষর)" value={f.passphrase} onChange={(e) => setF({ ...f, passphrase: e.target.value })} autoComplete="new-password" />
          <input className={input} type="password" placeholder="আবার লিখুন" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" />
          <input className={input} type="password" placeholder="আপনার অ্যাডমিন লগইন পাসওয়ার্ড" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
          {data.keys.set && <p className="text-xs text-amber-700 sm:col-span-2">পুরোনো backup-গুলো পুরোনো পাসওয়ার্ড দিয়েই খুলবে — সেটিও রেখে দিন।</p>}
          <button type="button" className="btn btn-brand min-h-11 sm:col-span-2" disabled={!ok || !!busy}
            onClick={() => act("keys", () => backupApi.setKeys({ passphrase: f.passphrase, old_passphrase: f.old_passphrase, password: f.password }).then(() => { setOpen(false); setF({ passphrase: "", confirm: "", old_passphrase: "", password: "" }); }), "Backup পাসওয়ার্ড সেট হয়েছে")}>
            {busy === "keys" ? <Loader2 className="w-4 h-4 animate-spin" /> : "সংরক্ষণ করুন"}
          </button>
        </div>
      )}
    </Section>
  );
}

function AddDrive({ kind, setKind, redirectUri, onDone }: { kind: DestKind | ""; setKind: (k: DestKind | "" | null) => void; redirectUri: string; onDone: () => void }) {
  const toast = useToastStore((s) => s.push);
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const g = kind ? guideOf(kind) : undefined;
  const field = (k: string, ph: string, type = "text") => (
    <input key={k} className={input} type={type} placeholder={ph} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} autoComplete="off" />
  );
  const submit = async () => {
    setBusy(true);
    try {
      const r = await backupApi.addDest({ ...f, kind: kind as string });
      if (r.data.data?.authorize_url) { window.location.href = r.data.data.authorize_url; return; }
      toast("success", "ড্রাইভ যুক্ত হয়েছে ও পরীক্ষায় পাস করেছে");
      setKind(null);
      onDone();
    } catch (e) {
      toast("error", errText(e, "ড্রাইভ যুক্ত হয়নি"));
    } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{g ? g.name : "কোন ড্রাইভ যোগ করবেন?"}</p>
        <button type="button" aria-label="বন্ধ" className="min-h-11 min-w-11 flex items-center justify-center" onClick={() => setKind(null)}><X className="w-5 h-5" /></button>
      </div>
      {!g ? (
        <div className="grid sm:grid-cols-2 gap-2">
          {DRIVE_GUIDES.map((d) => (
            <button key={d.kind} type="button" className="text-left rounded-lg border border-gray-200 bg-white p-3 min-h-11 hover:border-brand-400" onClick={() => setKind(d.kind)}>
              <p className="font-medium">{d.name}</p><p className="text-xs text-gray-500">{d.free}</p>
            </button>
          ))}
        </div>
      ) : (
        <>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <a href={g.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 underline text-sm min-h-11">{g.linkLabel} <ExternalLink className="w-3.5 h-3.5" /></a>
          {g.note && <p className="text-xs text-emerald-700">{g.note}</p>}
          {g.oauth && (
            <div className="text-sm">
              <p className="text-gray-600">Redirect URI (কপি করে বসান):</p>
              <div className="flex gap-2 items-center"><code className="flex-1 break-all bg-white border rounded p-2 text-xs">{redirectUri}</code>
                <button type="button" aria-label="কপি" className="btn btn-outline btn-sm min-h-11" onClick={() => { navigator.clipboard?.writeText(redirectUri); toast("success", "কপি হয়েছে"); }}><Copy className="w-4 h-4" /></button></div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {field("label", "নাম (ঐচ্ছিক, যেমন: আমার Google Drive)")}
            {g.oauth && [field("client_id", "Client ID / App key"), field("client_secret", "Client Secret / App secret", "password")]}
            {kind === "s3" && [field("endpoint", "Endpoint (https://…)"), field("region", "Region (R2 হলে auto)"), field("bucket", "Bucket নাম"),
              field("prefix", "ফোল্ডার (ঐচ্ছিক)"), field("access_key", "Access Key ID"), field("secret_key", "Secret Access Key", "password")]}
            {kind === "webdav" && [field("url", "WebDAV ঠিকানা (https://…)"), field("username", "ইউজারনেম"), field("dav_password", "App password", "password"), field("folder", "ফোল্ডার (ঐচ্ছিক)")]}
            {field("password", "আপনার অ্যাডমিন লগইন পাসওয়ার্ড", "password")}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-brand min-h-11" disabled={busy || !f.password} onClick={submit}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : g.oauth ? "সংযুক্ত করুন" : "যোগ ও পরীক্ষা করুন"}</button>
            <button type="button" className="btn btn-outline min-h-11" onClick={() => setKind("")}>অন্য ড্রাইভ</button>
          </div>
        </>
      )}
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
    <Section n="৩" title="স্বয়ংক্রিয় Backup">
      <label className="flex items-center gap-3 min-h-11 cursor-pointer">
        <input type="checkbox" className="w-5 h-5" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
        <span>প্রতিদিন নিজে থেকে backup নিন (চালু থাকা সব ড্রাইভে)</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label className="text-sm">সময় (বাংলাদেশ)<input className={input} type="time" value={time} onChange={(e) => { const [hh, mm] = e.target.value.split(":").map(Number); setS({ ...s, hour: hh || 0, minute: mm || 0 }); }} /></label>
        {num("daily", "দৈনিক কতটি রাখবেন")}{num("weekly", "সাপ্তাহিক")}{num("monthly", "মাসিক")}
      </div>
      <p className="text-xs text-gray-500">নতুন backup যাচাইয়ে পাস করলে তবেই পুরোনোগুলো মোছা হয়।</p>
      <button type="button" className="btn btn-brand min-h-11" disabled={!!busy} onClick={() => act("sch", () => backupApi.schedule(s), "সময়সূচি সংরক্ষিত হয়েছে")}>সংরক্ষণ করুন</button>
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm space-y-1">
        <p className="font-medium flex items-center gap-1.5"><Clock className="w-4 h-4" /> একবার সেটআপ: cron-job.org</p>
        <p className="text-gray-700">cron-job.org-এ নতুন Job বানান → নিচের লিংকটি বসান → “Every hour” (প্রতি ঘণ্টা) বাছুন → Save। সময় হলে backup নিজেই শুরু হবে। লিংকটি গোপন রাখুন।</p>
        <div className="flex gap-2 items-center"><code className="flex-1 break-all bg-white border rounded p-2 text-xs">{data.cron_url}</code>
          <button type="button" aria-label="কপি" className="btn btn-outline btn-sm min-h-11" onClick={() => { navigator.clipboard?.writeText(data.cron_url); toast("success", "কপি হয়েছে"); }}><Copy className="w-4 h-4" /></button></div>
      </div>
    </Section>
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

  const form = () => {
    const fd = new FormData();
    if (fromDrive) { fd.append("dest_id", src.destId!); fd.append("file_id", src.fileId!); } else if (file) fd.append("file", file);
    return fd;
  };
  const start = async (restore: boolean) => {
    const fd = form();
    fd.append("passphrase", f.passphrase);
    if (restore) { fd.append("target_url", f.target_url); fd.append("password", f.password); fd.append("confirm", String(f.confirm)); }
    try {
      const r = await (restore ? backupApi.restoreTest(fd) : backupApi.verify(fd));
      setJob({ id: r.data.data!.job_id, status: "running" });
    } catch (e) { toast("error", errText(e, "শুরু করা যায়নি")); }
  };
  const res = job?.result as { ok?: boolean; tables?: { table: string; backup: number | null; restored: number | null; ok: boolean }[]; decrypted?: boolean; toc?: { tables: number }; meta?: { name?: string } } | undefined;

  return (
    <div className="card p-4 sm:p-5 space-y-3 border-2 border-brand-200">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">যাচাই ও Restore পরীক্ষা {src.run?.name ? `— ${src.run.name}` : ""}</h2>
        <button type="button" aria-label="বন্ধ" className="min-h-11 min-w-11 flex items-center justify-center" onClick={onClose}><X className="w-5 h-5" /></button>
      </div>
      {!fromDrive && <input type="file" accept=".abobak" className="block min-h-11" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />}
      <input className={input} type="password" placeholder="Backup পাসওয়ার্ড" value={f.passphrase} onChange={(e) => setF({ ...f, passphrase: e.target.value })} autoComplete="off" />
      <button type="button" className="btn btn-outline min-h-11" disabled={(!fromDrive && !file) || job?.status === "running"} onClick={() => start(false)}>শুধু যাচাই করুন (কিছু বদলাবে না)</button>

      <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
        <p className="text-sm text-red-800 font-medium">পরীক্ষা-Restore: আলাদা একটি পরীক্ষার ডাটাবেসে (যেমন নতুন একটি ফ্রি Supabase project) ফেরত এনে দেখা হবে সব টেবিল ও সারি ঠিক আছে কি না। আসল ওয়েবসাইটের ডাটাবেস দিলে সিস্টেম নিজেই আটকে দেবে।</p>
        <input className={input} type="password" placeholder="পরীক্ষার ডাটাবেসের URL (postgresql://…)" value={f.target_url} onChange={(e) => setF({ ...f, target_url: e.target.value })} autoComplete="off" />
        <input className={input} type="password" placeholder="আপনার অ্যাডমিন লগইন পাসওয়ার্ড" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
        <label className="flex items-start gap-2 text-sm min-h-11"><input type="checkbox" className="w-5 h-5 mt-0.5" checked={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.checked })} />
          বুঝেছি — পরীক্ষার ডাটাবেসের পুরোনো ডেটা মুছে এই backup বসানো হবে।</label>
        <button type="button" className="btn btn-brand min-h-11" disabled={(!fromDrive && !file) || !f.passphrase || !f.target_url || !f.password || !f.confirm || job?.status === "running"} onClick={() => start(true)}>পরীক্ষা-Restore শুরু করুন</button>
      </div>

      {job && (
        <div className={`rounded-lg p-3 text-sm ${job.status === "failed" ? "bg-red-50 text-red-800" : job.status === "ok" ? (res?.ok === false ? "bg-amber-50" : "bg-emerald-50 text-emerald-800") : "bg-blue-50"}`}>
          {job.status === "running" && <p className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> চলছে… কয়েক মিনিট লাগতে পারে</p>}
          {job.status === "failed" && <p>{job.error_bn}</p>}
          {job.status === "ok" && !res?.tables && <p>✓ ফাইল অক্ষত{res?.decrypted ? ` · পাসওয়ার্ড ঠিক · ${res.toc?.tables ?? 0}টি টেবিল পড়া গেছে` : " (পাসওয়ার্ড দিলে ভেতরটাও যাচাই হবে)"}</p>}
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
