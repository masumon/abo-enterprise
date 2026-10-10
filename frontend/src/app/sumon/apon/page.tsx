"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ImageUpload from "@/components/admin/ImageUpload";
import TranslateButton from "@/components/admin/TranslateButton";
import JsonListEditor, { type JsonListField } from "@/components/admin/JsonListEditor";
import { adminApi } from "@/lib/api";
import { aponAdminApi, type AponAdminRelease, type AponStats } from "@/lib/aponApi";
import { apiErrorMessage } from "@/lib/apiError";
import { DEFAULT_FAQ, DEFAULT_FEATURES, DEFAULT_PERMISSIONS, DEFAULT_SHOTS, formatMB } from "@/lib/apon";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";
import { asArray, asNumber, asObject } from "@/lib/safeData";

type Tab = "releases" | "content" | "controls" | "stats";
type Values = Record<string, string>;

const field = "w-full px-3 py-2.5 rounded-xl border border-[var(--line)] bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";
const label = "block text-xs font-semibold text-muted mb-1";
const card = "enterprise-card p-4 sm:p-5 space-y-4";

const SHOT_FIELDS: JsonListField[] = [
  { path: "src", label: "Screenshot", labelBn: "স্ক্রিনশট", type: "image", purpose: "apon-screenshot" },
  { path: "alt_bn", label: "Caption (বাংলা)", labelBn: "ছবির বর্ণনা (বাংলা)" },
  { path: "alt_en", label: "Caption (English)", labelBn: "ছবির বর্ণনা (ইংরেজি)", translateFrom: "alt_bn" },
];
const FEATURE_FIELDS: JsonListField[] = [
  { path: "icon", label: "Icon", labelBn: "আইকন", type: "icon" },
  { path: "title_bn", label: "Title (বাংলা)", labelBn: "শিরোনাম (বাংলা)" },
  { path: "title_en", label: "Title (English)", labelBn: "শিরোনাম (ইংরেজি)", translateFrom: "title_bn" },
  { path: "desc_bn", label: "Description (বাংলা)", labelBn: "বিবরণ (বাংলা)", type: "textarea" },
  { path: "desc_en", label: "Description (English)", labelBn: "বিবরণ (ইংরেজি)", type: "textarea", translateFrom: "desc_bn" },
];
const PERMISSION_FIELDS: JsonListField[] = [
  { path: "icon", label: "Icon", labelBn: "আইকন", type: "icon" },
  { path: "name_bn", label: "Permission (বাংলা)", labelBn: "অনুমতি (বাংলা)" },
  { path: "name_en", label: "Permission (English)", labelBn: "অনুমতি (ইংরেজি)", translateFrom: "name_bn" },
  { path: "why_bn", label: "Why it is needed (বাংলা)", labelBn: "কেন লাগে (বাংলা)", type: "textarea" },
  { path: "why_en", label: "Why it is needed (English)", labelBn: "কেন লাগে (ইংরেজি)", type: "textarea", translateFrom: "why_bn" },
];
const FAQ_FIELDS: JsonListField[] = [
  { path: "q_bn", label: "Question (বাংলা)", labelBn: "প্রশ্ন (বাংলা)" },
  { path: "q_en", label: "Question (English)", labelBn: "প্রশ্ন (ইংরেজি)", translateFrom: "q_bn" },
  { path: "a_bn", label: "Answer (বাংলা)", labelBn: "উত্তর (বাংলা)", type: "textarea" },
  { path: "a_en", label: "Answer (English)", labelBn: "উত্তর (ইংরেজি)", type: "textarea", translateFrom: "a_bn" },
];

const emptyForm = { id: "", source_url: "", version_name: "", version_code: "", file_name: "", size_bytes: "", sha256: "", min_android: "", changelog_bn: "", changelog_en: "" };
type Form = typeof emptyForm;

const toBool = (v: string | undefined, d: boolean) => (v === undefined || v === "" ? d : ["true", "1", "yes", "on"].includes(v.trim().toLowerCase()));

export default function AponAdminPage() {
  const toast = useToastStore((s) => s.push);
  const [tab, setTab] = useState<Tab>("releases");
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Values>({});
  const [releases, setReleases] = useState<AponAdminRelease[]>([]);
  const [backendMissing, setBackendMissing] = useState(false);
  const [stats, setStats] = useState<AponStats | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AponAdminRelease | null>(null);
  const [inspectNote, setInspectNote] = useState("");

  const load = useCallback(async () => {
    try {
      const s = await adminApi.getSettings();
      // Coerce every setting to a string so a non-string value (bool/null/number) can't crash .trim() below.
      const raw = asObject<Record<string, unknown>>(s?.data?.data);
      setValues(Object.fromEntries(Object.entries(raw).map(([k, val]) => [k, val == null ? "" : String(val)])));
    } catch (e) {
      toast("error", apiErrorMessage(e, "সেটিংস লোড করা যায়নি"));
    }
    try {
      const r = await aponAdminApi.list();
      setReleases(asArray<AponAdminRelease>(r?.data?.data).filter((x) => x && typeof x === "object" && x.id));
      setBackendMissing(false);
      aponAdminApi.stats().then((x) => {
        const d = x?.data?.data;
        if (!d || typeof d !== "object" || Array.isArray(d)) { setStats(null); return; }
        const o = asObject<AponStats>(d);
        setStats({ total: asNumber(o.total), last_30_days: asNumber(o.last_30_days), per_day: asArray(o.per_day), per_release: asArray(o.per_release) });
      }).catch(() => undefined);
    } catch {
      setBackendMissing(true); // server/SQL not updated yet
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const v = (k: string, d = "") => values[k] ?? d;
  const set = (k: string, val: string) => setValues((p) => ({ ...p, [k]: val }));
  const on = (k: string, d: boolean) => toBool(values[k], d);

  const saveSettings = async (keys: string[], okMsg: string) => {
    setBusy("settings");
    try {
      await adminApi.upsertSettings(keys.map((key) => ({ key, value: values[key] ?? "", data_type: "string" })));
      toast("success", okMsg);
    } catch (e) {
      toast("error", apiErrorMessage(e, "সংরক্ষণ করা যায়নি"));
    } finally {
      setBusy(null);
    }
  };

  const current = useMemo(() => releases.find((r) => r.is_current && r.status === "published"), [releases]);

  // ---------------------------------------------------------------- releases
  const openNew = () => { setForm(emptyForm); setInspectNote(""); setShowForm(true); };
  const openEdit = (r: AponAdminRelease) => {
    setForm({
      id: r.id, source_url: r.source_url, version_name: r.version_name, version_code: String(r.version_code), file_name: r.file_name,
      size_bytes: r.size_bytes ? String(r.size_bytes) : "", sha256: r.sha256 ?? "", min_android: r.min_android ?? "",
      changelog_bn: r.changelog_bn ?? "", changelog_en: r.changelog_en ?? "",
    });
    setInspectNote("");
    setShowForm(true);
  };

  const inspect = async () => {
    if (!form.source_url.trim()) return;
    setBusy("inspect");
    setInspectNote("");
    try {
      const r = await aponAdminApi.inspect(form.source_url.trim());
      const d = r.data.data;
      if (d) {
        setForm((f) => ({ ...f, size_bytes: String(d.size_bytes), sha256: d.sha256, file_name: f.file_name || d.file_name }));
        setInspectNote(d.looks_like_apk ? `✓ লিংক ঠিক আছে — সাইজ ${formatMB(d.size_bytes, true)}, SHA-256 পাওয়া গেছে।` : "⚠ ফাইলটি APK মনে হচ্ছে না — লিংকটি আবার দেখুন।");
      }
    } catch (e) {
      setInspectNote("✗ " + apiErrorMessage(e, "লিংক যাচাই করা যায়নি"));
    } finally {
      setBusy(null);
    }
  };

  const saveRelease = async () => {
    const code = parseInt(form.version_code, 10);
    if (!form.source_url.trim() || !form.version_name.trim() || !Number.isFinite(code)) {
      toast("error", "ফাইলের লিংক, ভার্সন নাম ও ভার্সন কোড দিন");
      return;
    }
    const payload = {
      source_url: form.source_url.trim(), version_name: form.version_name.trim(), version_code: code,
      file_name: form.file_name.trim() || undefined, size_bytes: form.size_bytes ? Number(form.size_bytes) : undefined,
      sha256: form.sha256.trim() || undefined, min_android: form.min_android.trim() || undefined,
      changelog_bn: form.changelog_bn, changelog_en: form.changelog_en,
    };
    setBusy("save");
    try {
      if (form.id) await aponAdminApi.update(form.id, payload);
      else await aponAdminApi.create(payload);
      toast("success", form.id ? "ভার্সন হালনাগাদ হয়েছে" : "খসড়া হিসেবে সংরক্ষিত — এখন “প্রকাশ করুন” চাপুন");
      setShowForm(false);
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "সংরক্ষণ করা যায়নি"));
    } finally {
      setBusy(null);
    }
  };

  const act = async (id: string, fn: "publish" | "unpublish", okMsg: string) => {
    setBusy(id);
    try {
      await aponAdminApi[fn](id);
      toast("success", okMsg);
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "কাজটি করা যায়নি"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await aponAdminApi.remove(confirmDelete.id);
      toast("success", "ভার্সনটি মুছে ফেলা হয়েছে");
      setConfirmDelete(null);
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "মোছা যায়নি"));
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-brand-600" aria-label="লোড হচ্ছে" /></div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "releases", label: "ভার্সন" }, { id: "content", label: "পেজের কনটেন্ট" }, { id: "controls", label: "নিয়ন্ত্রণ ও সীমা" }, { id: "stats", label: "পরিসংখ্যান" },
  ];
  const enabled = on("apon_enabled", false);
  const maxDay = Math.max(1, ...(stats?.per_day.map((d) => d.count) ?? [1]));

  return (
    <div className="admin-page admin-page-narrow">
      <AdminPageHeader
        title="Mobile App (Apon)"
        titleBn="মোবাইল অ্যাপ (আপন)"
        description="Publish the Apon APK, edit its download page and see how many people downloaded it."
        descriptionBn="আপন অ্যাপের APK প্রকাশ করুন, ডাউনলোড পেজ সাজান এবং কতজন ডাউনলোড করল দেখুন।"
        actions={<Link href="/apon" target="_blank" className="btn btn-outline btn-sm gap-1.5"><ExternalLink className="w-4 h-4" /> পেজ দেখুন</Link>}
      />

      {backendMissing && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 p-4 text-sm leading-relaxed flex gap-2">
          <AlertTriangle className="w-5 h-5 flex-none text-amber-600" aria-hidden />
          <p><b>সার্ভার আপডেট বাকি।</b> এই সুবিধার জন্য Supabase এ <code>0042_app_releases.sql</code> চালিয়ে Render ডিপ্লয় করতে হবে। তার আগে ভার্সন-অংশ কাজ করবে না।</p>
        </div>
      )}

      <div className={cn("rounded-2xl border p-4 flex flex-wrap items-center gap-3 justify-between", enabled && current ? "border-green-300 bg-green-50/70 dark:bg-green-500/10" : "border-[var(--line)]")}>
        <div className="flex items-start gap-2 min-w-0">
          {enabled && current ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-none mt-0.5" aria-hidden /> : <AlertTriangle className="w-5 h-5 text-amber-600 flex-none mt-0.5" aria-hidden />}
          <div className="text-sm">
            <p className="font-bold text-heading">{enabled && current ? `চালু — ডাউনলোড হচ্ছে ভার্সন ${current.version_name}` : "বন্ধ — ওয়েবসাইটে ডাউনলোড দেখা যাচ্ছে না"}</p>
            <p className="text-muted">{enabled ? (current ? "অ্যাপ পেজ ও সব প্রবেশ-বাটন সবার জন্য খোলা।" : "চালু আছে, কিন্তু কোনো ভার্সন প্রকাশিত নেই।") : "নিচের সুইচ চালু করলে ও একটি ভার্সন প্রকাশ করলে পেজ খুলবে।"}</p>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={enabled} onChange={async (e) => { set("apon_enabled", String(e.target.checked)); setBusy("settings"); try { await adminApi.upsertSettings([{ key: "apon_enabled", value: String(e.target.checked), data_type: "string" }]); toast("success", e.target.checked ? "অ্যাপ পেজ চালু হয়েছে" : "অ্যাপ পেজ বন্ধ হয়েছে"); } catch (er) { toast("error", apiErrorMessage(er, "পরিবর্তন করা যায়নি")); } finally { setBusy(null); } }} disabled={busy === "settings"} />
          অ্যাপ পেজ চালু
        </label>
      </div>

      <div role="tablist" aria-label="মোবাইল অ্যাপ সেকশন" className="flex gap-1 overflow-x-auto border-b border-[var(--line)]">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px", tab === t.id ? "border-brand-600 text-brand-700 dark:text-brand-300" : "border-transparent text-muted hover:text-heading")}>{t.label}</button>
        ))}
      </div>

      {/* ============================== RELEASES ============================== */}
      {tab === "releases" && (
        <div className="space-y-4">
          <details className="enterprise-card p-4 text-sm leading-relaxed">
            <summary className="cursor-pointer font-bold text-heading">নতুন ভার্সন প্রকাশের ধাপ (ক্লিক করে দেখুন)</summary>
            <ol className="list-decimal pl-5 mt-3 space-y-1.5">
              <li>GitHub এ আপনার রিপোজিটরির <b>Releases → Draft a new release</b> এ যান।</li>
              <li>ট্যাগ লিখুন (যেমন <code>apon-v1.0.1</code>), APK ফাইলটি ড্র্যাগ করে দিন, <b>Publish release</b> চাপুন।</li>
              <li>রিলিজ পেজে APK ফাইলের নামে ডান-ক্লিক করে <b>Copy link address</b> করুন।</li>
              <li>নিচে “নতুন ভার্সন” চেপে লিংকটি পেস্ট করুন → <b>লিংক যাচাই</b> চাপুন (সাইজ ও SHA-256 নিজে বসে যাবে)।</li>
              <li>ভার্সন নাম (যেমন 1.0.1) ও ভার্সন কোড (অ্যাপের build number, আগেরটির চেয়ে বড়) দিন → সংরক্ষণ করুন → <b>প্রকাশ করুন</b>।</li>
            </ol>
            <p className="mt-3 text-muted">এই লিংক শুধু এখানেই থাকে — ওয়েবসাইটে কেউ GitHub এর ঠিকানা দেখতে পায় না; ডাউনলোড আপনার ওয়েবসাইট দিয়েই আসে।</p>
          </details>

          <div className="flex justify-between items-center">
            <h2 className="font-bold text-heading">সব ভার্সন</h2>
            <button type="button" onClick={openNew} disabled={backendMissing} className="btn btn-brand btn-sm gap-1.5 disabled:opacity-50"><Plus className="w-4 h-4" /> নতুন ভার্সন</button>
          </div>

          {releases.length === 0 ? (
            <p className="enterprise-card p-6 text-center text-sm text-muted">এখনো কোনো ভার্সন যোগ করা হয়নি।</p>
          ) : (
            <ul className="space-y-3">
              {releases.map((r) => (
                <li key={r.id} className="enterprise-card p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-heading">
                      ভার্সন {r.version_name} <span className="text-xs font-medium text-muted">(কোড {r.version_code})</span>{" "}
                      {r.is_current && r.status === "published" ? <span className="ml-1 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-[11px] font-bold">বর্তমান</span> : r.status === "published" ? <span className="ml-1 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[11px] font-bold">প্রকাশিত</span> : <span className="ml-1 rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-[11px] font-bold">খসড়া</span>}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{[formatMB(r.size_bytes, true), r.min_android ? `Android ${r.min_android}+` : "", `${r.download_count} ডাউনলোড`].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status === "published" && r.is_current ? (
                      <button type="button" disabled={busy === r.id} onClick={() => act(r.id, "unpublish", "ভার্সনটি এখন আর পাবলিক নয়")} className="btn btn-outline btn-sm">বন্ধ করুন</button>
                    ) : (
                      <button type="button" disabled={busy === r.id} onClick={() => act(r.id, "publish", "এই ভার্সনই এখন ডাউনলোড হচ্ছে")} className="btn btn-brand btn-sm">{r.status === "published" ? "বর্তমান করুন" : "প্রকাশ করুন"}</button>
                    )}
                    <button type="button" onClick={() => openEdit(r)} className="btn btn-outline btn-sm">সম্পাদনা</button>
                    <button type="button" onClick={() => setConfirmDelete(r)} className="btn btn-outline btn-sm text-red-600" aria-label="মুছুন"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showForm && (
            <section className={card} aria-label="ভার্সন ফর্ম">
              <h3 className="font-bold text-heading">{form.id ? "ভার্সন সম্পাদনা" : "নতুন ভার্সন"}</h3>
              <div>
                <label className={label} htmlFor="ap-url">APK ফাইলের লিংক (GitHub Release এর)</label>
                <div className="flex gap-2">
                  <input id="ap-url" className={field} value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://github.com/…/releases/download/…/Apon-1.0.0.apk" />
                  <button type="button" onClick={inspect} disabled={busy === "inspect" || !form.source_url.trim()} className="btn btn-outline btn-sm gap-1.5 whitespace-nowrap disabled:opacity-50">
                    {busy === "inspect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} লিংক যাচাই
                  </button>
                </div>
                {busy === "inspect" && <p className="text-xs text-muted mt-1">ফাইলটি পড়া হচ্ছে — ৫০ MB এর ফাইলে ১ মিনিট পর্যন্ত লাগতে পারে…</p>}
                {inspectNote && <p className={cn("text-xs mt-1 font-medium", inspectNote.startsWith("✓") ? "text-green-700" : "text-amber-700")}>{inspectNote}</p>}
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div><label className={label} htmlFor="ap-vn">ভার্সন নাম</label><input id="ap-vn" className={field} value={form.version_name} onChange={(e) => setForm({ ...form, version_name: e.target.value })} placeholder="1.0.0" /></div>
                <div><label className={label} htmlFor="ap-vc">ভার্সন কোড (build number)</label><input id="ap-vc" inputMode="numeric" className={field} value={form.version_code} onChange={(e) => setForm({ ...form, version_code: e.target.value.replace(/\D/g, "") })} placeholder="45" /></div>
                <div><label className={label} htmlFor="ap-ma">ন্যূনতম Android</label><input id="ap-ma" className={field} value={form.min_android} onChange={(e) => setForm({ ...form, min_android: e.target.value })} placeholder="7.0" /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className={label} htmlFor="ap-fn">ফাইলের নাম (ডাউনলোডে যা দেখাবে)</label><input id="ap-fn" className={field} value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} placeholder="Apon-1.0.0.apk" /></div>
                <div><label className={label} htmlFor="ap-sz">সাইজ (বাইট, নিজে বসে)</label><input id="ap-sz" inputMode="numeric" className={field} value={form.size_bytes} onChange={(e) => setForm({ ...form, size_bytes: e.target.value.replace(/\D/g, "") })} /></div>
              </div>
              <div><label className={label} htmlFor="ap-sha">SHA-256 (নিজে বসে)</label><input id="ap-sha" className={cn(field, "font-mono text-xs")} value={form.sha256} onChange={(e) => setForm({ ...form, sha256: e.target.value })} /></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className={label} htmlFor="ap-cb">কী নতুন (বাংলা)</label><textarea id="ap-cb" rows={3} className={field} value={form.changelog_bn} onChange={(e) => setForm({ ...form, changelog_bn: e.target.value })} /></div>
                <div><div className="flex items-center justify-between gap-2 mb-1"><label className="text-xs font-semibold text-muted" htmlFor="ap-ce">What&apos;s new (English)</label><TranslateButton bn={form.changelog_bn} onResult={(t) => setForm((f) => ({ ...f, changelog_en: t }))} en={form.changelog_en} onResultBn={(t) => setForm((f) => ({ ...f, changelog_bn: t }))} /></div><textarea id="ap-ce" rows={3} className={field} value={form.changelog_en} onChange={(e) => setForm({ ...form, changelog_en: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={saveRelease} disabled={busy === "save"} className="btn btn-brand btn-md gap-2">{busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} সংরক্ষণ করুন</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline btn-md">বাতিল</button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ============================== CONTENT ============================== */}
      {tab === "content" && (
        <div className="space-y-5">
          <section className={card}>
            <h2 className="font-bold text-heading">নাম ও বর্ণনা</h2>
            <p className="text-xs text-muted">ফাঁকা রাখলে ডিফল্ট লেখা দেখাবে।</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={label}>অ্যাপের নাম (বাংলা)</label><input className={field} value={v("apon_name_bn")} onChange={(e) => set("apon_name_bn", e.target.value)} placeholder="আপন" /></div>
              <div><div className="flex items-center justify-between gap-2 mb-1"><label className="text-xs font-semibold text-muted">App name (English)</label><TranslateButton bn={v("apon_name_bn")} onResult={(t) => set("apon_name_en", t)} en={v("apon_name_en")} onResultBn={(t) => set("apon_name_bn", t)} /></div><input className={field} value={v("apon_name_en")} onChange={(e) => set("apon_name_en", e.target.value)} placeholder="Apon" /></div>
              <div><label className={label}>ট্যাগলাইন (বাংলা)</label><input className={field} value={v("apon_tagline_bn")} onChange={(e) => set("apon_tagline_bn", e.target.value)} /></div>
              <div><div className="flex items-center justify-between gap-2 mb-1"><label className="text-xs font-semibold text-muted">Tagline (English)</label><TranslateButton bn={v("apon_tagline_bn")} onResult={(t) => set("apon_tagline_en", t)} en={v("apon_tagline_en")} onResultBn={(t) => set("apon_tagline_bn", t)} /></div><input className={field} value={v("apon_tagline_en")} onChange={(e) => set("apon_tagline_en", e.target.value)} /></div>
              <div><label className={label}>বিবরণ (বাংলা)</label><textarea rows={4} className={field} value={v("apon_description_bn")} onChange={(e) => set("apon_description_bn", e.target.value)} /></div>
              <div><div className="flex items-center justify-between gap-2 mb-1"><label className="text-xs font-semibold text-muted">Description (English)</label><TranslateButton bn={v("apon_description_bn")} onResult={(t) => set("apon_description_en", t)} en={v("apon_description_en")} onResultBn={(t) => set("apon_description_bn", t)} /></div><textarea rows={4} className={field} value={v("apon_description_en")} onChange={(e) => set("apon_description_en", e.target.value)} /></div>
              <div><label className={label}>ডাউনলোড বাটনের লেখা (বাংলা)</label><input className={field} value={v("apon_button_label_bn")} onChange={(e) => set("apon_button_label_bn", e.target.value)} placeholder="আপন ডাউনলোড করুন" /></div>
              <div><div className="flex items-center justify-between gap-2 mb-1"><label className="text-xs font-semibold text-muted">Button label (English)</label><TranslateButton bn={v("apon_button_label_bn")} onResult={(t) => set("apon_button_label_en", t)} en={v("apon_button_label_en")} onResultBn={(t) => set("apon_button_label_bn", t)} /></div><input className={field} value={v("apon_button_label_en")} onChange={(e) => set("apon_button_label_en", e.target.value)} placeholder="Download Apon" /></div>
            </div>
            <ImageUpload value={v("apon_icon_url")} onChange={(u) => set("apon_icon_url", u)} label="অ্যাপের আইকন (ফাঁকা = ডিফল্ট)" purpose="apon-icon" previewSize="sm" />
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={label}>প্যাকেজ নাম</label><input className={cn(field, "font-mono text-xs")} value={v("apon_package_name")} onChange={(e) => set("apon_package_name", e.target.value)} placeholder="com.masumon.apon" /></div>
              <div><label className={label}>সাইনিং সার্টিফিকেট SHA-256</label><input className={cn(field, "font-mono text-xs")} value={v("apon_cert_sha256")} onChange={(e) => set("apon_cert_sha256", e.target.value)} placeholder="AE:3D:E5:…" /></div>
            </div>
            <button type="button" disabled={busy === "settings"} onClick={() => saveSettings(["apon_name_bn", "apon_name_en", "apon_tagline_bn", "apon_tagline_en", "apon_description_bn", "apon_description_en", "apon_button_label_bn", "apon_button_label_en", "apon_icon_url", "apon_package_name", "apon_cert_sha256"], "সংরক্ষিত হয়েছে")} className="btn btn-brand btn-md gap-2"><Save className="w-4 h-4" /> সংরক্ষণ করুন</button>
          </section>

          {([
            ["apon_screenshots_json", "স্ক্রিনশট", SHOT_FIELDS, DEFAULT_SHOTS, () => ({ src: "", alt_bn: "", alt_en: "" })],
            ["apon_features_json", "ফিচার", FEATURE_FIELDS, DEFAULT_FEATURES, () => ({ icon: "smartphone", title_bn: "", title_en: "", desc_bn: "", desc_en: "" })],
            ["apon_permissions_json", "অনুমতি ও কারণ", PERMISSION_FIELDS, DEFAULT_PERMISSIONS, () => ({ icon: "shield", name_bn: "", name_en: "", why_bn: "", why_en: "", optional: true })],
            ["apon_faq_json", "সাধারণ প্রশ্ন (FAQ)", FAQ_FIELDS, DEFAULT_FAQ, () => ({ q_bn: "", q_en: "", a_bn: "", a_en: "" })],
          ] as [string, string, JsonListField[], unknown[], () => Record<string, unknown>][]).map(([key, title, fields, defaults, newItem]) => (
            <section key={key} className={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-heading">{title}</h2>
                {!v(key) && <button type="button" onClick={() => set(key, JSON.stringify(defaults))} className="text-xs font-semibold text-brand-600 hover:underline">ডিফল্ট তালিকা থেকে সম্পাদনা শুরু করুন</button>}
              </div>
              {!v(key) && <p className="text-xs text-muted">এখন ওয়েবসাইটে ডিফল্ট তালিকা দেখাচ্ছে। সম্পাদনা করতে উপরের লিংকে চাপুন।</p>}
              {v(key) && <JsonListEditor value={v(key)} onChange={(json) => set(key, json)} fields={fields} newItem={newItem} />}
              {v(key) && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy === "settings"} onClick={() => saveSettings([key], `${title} সংরক্ষিত হয়েছে`)} className="btn btn-brand btn-md gap-2"><Save className="w-4 h-4" /> সংরক্ষণ করুন</button>
                  <button type="button" onClick={() => set(key, "")} className="btn btn-outline btn-md" title="সংরক্ষণ করলে ডিফল্টে ফিরবে">ডিফল্টে ফিরুন</button>
                </div>
              )}
            </section>
          ))}
          <p className="text-xs text-muted">অ্যাপের গোপনীয়তা নীতি ও শর্তাবলী বদলাতে <Link href="/sumon/legal-pages" className="font-semibold text-brand-600 hover:underline">আইনি পেজ</Link> এ “আপন অ্যাপ” বাছুন।</p>
        </div>
      )}

      {/* ============================== CONTROLS ============================== */}
      {tab === "controls" && (
        <div className="space-y-5">
          <section className={card}>
            <h2 className="font-bold text-heading">ডাউনলোড নিয়ন্ত্রণ</h2>
            {([
              ["apon_downloads_enabled", true, "ডাউনলোড চালু", "বন্ধ করলে পেজ থাকবে কিন্তু ডাউনলোড বাটন বন্ধ থাকবে (রক্ষণাবেক্ষণের সময় কাজে লাগে)।"],
              ["apon_captcha_enabled", true, "যোগ-বিয়োগের নিরাপত্তা-প্রশ্ন", "চালু রাখলে রোবট ও অপব্যবহার আটকায়। বন্ধ করা ভালো নয়।"],
            ] as [string, boolean, string, string][]).map(([k, d, t, h]) => (
              <label key={k} className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 h-5 w-5" checked={on(k, d)} onChange={(e) => set(k, String(e.target.checked))} />
                <span className="text-sm"><span className="font-semibold text-heading block">{t}</span><span className="text-muted">{h}</span></span>
              </label>
            ))}
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className={label}>প্রশ্নের কঠিনতা</label>
                <select className={field} value={v("apon_captcha_level", "easy")} onChange={(e) => set("apon_captcha_level", e.target.value)}>
                  <option value="easy">সহজ (১ অঙ্ক)</option><option value="medium">মাঝারি (২ অঙ্ক)</option>
                </select>
              </div>
              <div><label className={label}>একজন (আইপি) দিনে সর্বোচ্চ</label><input inputMode="numeric" className={field} value={v("apon_daily_limit_per_ip")} onChange={(e) => set("apon_daily_limit_per_ip", e.target.value.replace(/\D/g, ""))} placeholder="5" /><p className="text-[11px] text-muted mt-1">ফাঁকা = ৫, ০ = সীমাহীন</p></div>
              <div><label className={label}>মাসে মোট সর্বোচ্চ ডাউনলোড</label><input inputMode="numeric" className={field} value={v("apon_monthly_cap")} onChange={(e) => set("apon_monthly_cap", e.target.value.replace(/\D/g, ""))} placeholder="1500" /><p className="text-[11px] text-muted mt-1">ফাঁকা = ১৫০০, ০ = সীমাহীন। ফ্রি সার্ভার বাঁচাতে।</p></div>
            </div>
          </section>

          <section className={card}>
            <h2 className="font-bold text-heading">কোথায় কোথায় অ্যাপের লিংক দেখাবে</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ["apon_show_nav", "উপরের মেনু (বড় স্ক্রিন)"], ["apon_show_drawer", "মোবাইলের “আরও” মেনু"],
                ["apon_show_home", "হোমপেজের ব্যান্ড"], ["apon_show_footer", "ফুটারের ব্যাজ"],
              ] as [string, string][]).map(([k, t]) => (
                <label key={k} className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3 cursor-pointer">
                  <input type="checkbox" className="h-5 w-5" checked={on(k, true)} onChange={(e) => set(k, String(e.target.checked))} />
                  <span className="text-sm font-semibold">{t}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted">অ্যাপ পেজ বন্ধ থাকলে বা কোনো ভার্সন প্রকাশিত না থাকলে এই সব লিংক নিজে থেকেই লুকিয়ে যায়।</p>
          </section>

          <button type="button" disabled={busy === "settings"} onClick={() => saveSettings(["apon_downloads_enabled", "apon_captcha_enabled", "apon_captcha_level", "apon_daily_limit_per_ip", "apon_monthly_cap", "apon_show_nav", "apon_show_drawer", "apon_show_home", "apon_show_footer"], "নিয়ন্ত্রণ সংরক্ষিত হয়েছে")} className="btn btn-brand btn-md gap-2">{busy === "settings" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} সংরক্ষণ করুন</button>
        </div>
      )}

      {/* ============================== STATS ============================== */}
      {tab === "stats" && (
        <div className="space-y-4">
          {!stats ? (
            <p className="enterprise-card p-6 text-center text-sm text-muted">{backendMissing ? "সার্ভার আপডেটের পর পরিসংখ্যান দেখা যাবে।" : "এখনো কোনো ডাউনলোড নেই।"}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="enterprise-card p-4"><p className="text-xs text-muted">মোট ডাউনলোড</p><p className="text-3xl font-extrabold text-heading">{stats.total}</p></div>
                <div className="enterprise-card p-4"><p className="text-xs text-muted">গত ৩০ দিনে</p><p className="text-3xl font-extrabold text-heading">{stats.last_30_days}</p></div>
              </div>
              <section className={card}>
                <h2 className="font-bold text-heading">দিনভিত্তিক (গত ৩০ দিন)</h2>
                {stats.per_day.length === 0 ? <p className="text-sm text-muted">এই সময়ে কোনো ডাউনলোড নেই।</p> : (
                  <ul className="space-y-1.5">
                    {stats.per_day.map((d) => (
                      <li key={d.date} className="flex items-center gap-2 text-xs">
                        <span className="w-20 flex-none text-muted">{d.date}</span>
                        <span className="h-3 rounded bg-brand-600" style={{ width: `${Math.max(4, (d.count / maxDay) * 100)}%` }} aria-hidden />
                        <span className="font-semibold">{d.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className={card}>
                <h2 className="font-bold text-heading">ভার্সন অনুযায়ী</h2>
                <ul className="text-sm space-y-1">{stats.per_release.map((r) => <li key={r.version} className="flex justify-between"><span>ভার্সন {r.version}</span><b>{r.count}</b></li>)}</ul>
              </section>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={`ভার্সন ${confirmDelete?.version_name ?? ""} মুছবেন?`}
        message="ভার্সনটি তালিকা থেকে সরে যাবে এবং আর ডাউনলোড করা যাবে না। GitHub এর ফাইল অক্ষত থাকবে।"
        confirmLabel="মুছে ফেলুন"
        variant="danger"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
