"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { newsletterAdminApi, type NewsletterSubscriberRecord } from "@/lib/api";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Copy, Check, Download, Mail, Loader2, Trash2, RefreshCw, Search, UserPlus, Send, RotateCcw } from "lucide-react";
import { useToastStore } from "@/store/toast";
import { apiErrorMessage } from "@/lib/apiError";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import RichTextEditor from "@/components/admin/catalog/RichTextEditor";
import AiTextMenu from "@/components/admin/catalog/AiTextMenu";

const SOURCE_BN: Record<string, string> = { footer: "ওয়েবসাইট", admin: "অ্যাডমিন যোগ করেছেন", checkout: "অর্ডারের সময়" };
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" }) : "—");

/**
 * Newsletter: subscribers (active / unsubscribed), stats, search, add by hand,
 * copy / CSV export, remove / restore, and e-mail everyone (test first, AI
 * help, one-click unsubscribe link in every e-mail).
 */
export default function NewsletterAdminPage() {
  const toast = useToastStore((s) => s.push);
  const [tab, setTab] = useState<"active" | "unsubscribed">("active");
  const [subscribers, setSubscribers] = useState<NewsletterSubscriberRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ active: number; unsubscribed: number; new_30_days: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<NewsletterSubscriberRecord | null>(null);
  const [panel, setPanel] = useState<"" | "add" | "send">("");
  const [addText, setAddText] = useState("");
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, st] = await Promise.all([
        newsletterAdminApi.listByStatus({ page: 1, per_page: 500, status: tab }),
        newsletterAdminApi.stats().catch(() => null),
      ]);
      setSubscribers(res.data.data ?? []);
      setTotal(res.data.meta?.total ?? (res.data.data ?? []).length);
      if (st) setStats(st.data.data ?? null);
    } catch (err) {
      toast("error", apiErrorMessage(err, "তালিকা আনা যায়নি"));
    } finally {
      setLoading(false);
    }
  }, [toast, tab]);

  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? subscribers.filter((s) => s.email.includes(q)) : subscribers;
  }, [subscribers, search]);

  const handleCopyEmail = (email: string) => {
    void navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };
  const handleCopyAll = () => {
    void navigator.clipboard.writeText(shown.map((s) => s.email).join("\n"));
    toast("success", `${shown.length}টি ইমেইল কপি হয়েছে`);
  };
  const handleDownloadCsv = () => {
    const csv = ["email,subscribed_at,source,unsubscribed_at", ...shown.map((s) => `${s.email},${s.subscribed_at},${s.source ?? ""},${s.unsubscribed_at ?? ""}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-${tab}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("success", "CSV ডাউনলোড হয়েছে");
  };
  const handleRemove = async (sub: NewsletterSubscriberRecord) => {
    try {
      await newsletterAdminApi.remove(sub.id);
      toast("success", "তালিকা থেকে সরানো হয়েছে (মুছে যায়নি — “বাদ পড়া” ট্যাবে আছে)");
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "সরানো যায়নি"));
    } finally {
      setRemoveTarget(null);
    }
  };
  const handleRestore = async (sub: NewsletterSubscriberRecord) => {
    try {
      await newsletterAdminApi.restore(sub.id);
      toast("success", "আবার তালিকায় যোগ হয়েছে");
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "যোগ করা যায়নি"));
    }
  };
  const handleAdd = async () => {
    setBusy(true);
    try {
      const r = await newsletterAdminApi.add(addText);
      const d = r.data.data;
      toast("success", `নতুন ${d?.added ?? 0}টি, ফেরত ${d?.restored ?? 0}টি, আগে থেকেই ${d?.already ?? 0}টি${d?.invalid ? `, ভুল ঠিকানা ${d.invalid}টি` : ""}`);
      setAddText("");
      setPanel("");
      await load();
    } catch (err) {
      toast("error", apiErrorMessage(err, "যোগ করা যায়নি"));
    } finally {
      setBusy(false);
    }
  };
  const send = async (test: boolean) => {
    setBusy(true);
    try {
      const r = await newsletterAdminApi.send({ subject, body, test_email: test ? testEmail : undefined });
      toast("success", test ? `পরীক্ষার ইমেইল ${testEmail}-এ পাঠানো হচ্ছে — ইনবক্স দেখুন` : `${r.data.data?.queued ?? 0} জনকে পাঠানো শুরু হয়েছে (ধীরে ধীরে যাবে)`);
      if (!test) { setPanel(""); setSubject(""); setBody(""); }
    } catch (err) {
      toast("error", apiErrorMessage(err, "পাঠানো যায়নি — ইমেইল সেটিংস দেখুন"));
    } finally {
      setBusy(false);
      setConfirmSend(false);
    }
  };

  const card = "bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4";
  const actionBtn = "btn btn-outline btn-sm min-h-11 gap-1.5";

  return (
    <div className="admin-page">
      <AdminPageHeader title="Newsletter" titleBn="নিউজলেটার" description="যারা ইমেইলে খবর ও অফার পেতে চেয়েছেন — তাদের তালিকা ও সবাইকে ইমেইল পাঠানো" />

      <div className="grid grid-cols-3 gap-3">
        <div className={card}><p className="text-xs text-muted font-semibold">সক্রিয় সাবস্ক্রাইবার</p><p className="text-3xl font-bold text-heading">{stats?.active ?? (tab === "active" ? total : "…")}</p></div>
        <div className={card}><p className="text-xs text-muted font-semibold">গত ৩০ দিনে নতুন</p><p className="text-3xl font-bold text-emerald-600">{stats?.new_30_days ?? "…"}</p></div>
        <div className={card}><p className="text-xs text-muted font-semibold">বাদ পড়েছেন</p><p className="text-3xl font-bold text-gray-500">{stats?.unsubscribed ?? "…"}</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPanel(panel === "send" ? "" : "send")} className="btn btn-brand btn-sm min-h-11 gap-1.5"><Send className="w-4 h-4" /> সবাইকে ইমেইল পাঠান</button>
        <button type="button" onClick={() => setPanel(panel === "add" ? "" : "add")} className={actionBtn}><UserPlus className="w-4 h-4" /> ইমেইল যোগ করুন</button>
        <button type="button" onClick={handleCopyAll} disabled={!shown.length} className={actionBtn}><Copy className="w-4 h-4" /> সব কপি</button>
        <button type="button" onClick={handleDownloadCsv} disabled={!shown.length} className={actionBtn}><Download className="w-4 h-4" /> CSV</button>
        <button type="button" onClick={() => void load()} disabled={loading} className={actionBtn}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} রিফ্রেশ</button>
      </div>

      {panel === "add" && (
        <div className={`${card} space-y-2`}>
          <p className="text-sm font-semibold text-heading">ইমেইল যোগ করুন</p>
          <p className="text-xs text-muted">প্রতি লাইনে একটি বা কমা দিয়ে অনেকগুলো। শুধু যারা অনুমতি দিয়েছেন তাদেরই যোগ করুন।</p>
          <textarea value={addText} onChange={(e) => setAddText(e.target.value)} rows={4} className="input w-full text-sm font-mono" placeholder={"name@gmail.com\nother@yahoo.com"} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPanel("")} className="btn btn-outline btn-sm min-h-11">বাতিল</button>
            <button type="button" onClick={handleAdd} disabled={busy || !addText.trim()} className="btn btn-brand btn-sm min-h-11 gap-1.5">{busy && <Loader2 className="w-4 h-4 animate-spin" />} যোগ করুন</button>
          </div>
        </div>
      )}

      {panel === "send" && (
        <div className={`${card} space-y-3`}>
          <p className="text-sm font-semibold text-heading">📧 সবাইকে ইমেইল ({stats?.active ?? total} জন)</p>
          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">বিষয় (Subject)</label>
              <AiTextMenu text={subject} onApply={setSubject} context="newsletter e-mail subject" compact />
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input w-full" placeholder="যেমন: ঈদ উপলক্ষে সব চার্জারে ২০% ছাড় 🎉" dir="auto" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">ইমেইলের লেখা</label>
            <RichTextEditor value={body} onChange={setBody} rows={8} placeholder="প্রিয় গ্রাহক, ..." dir="auto" label="newsletter e-mail body" />
            <p className="text-[11px] text-muted mt-1">বোল্ড, লিংক ও পয়েন্ট ইমেইলে দেখাবে। প্রতিটি ইমেইলের নিচে নিজে থেকে “আর ইমেইল চাই না” লিংক যোগ হবে।</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <label className="flex-1 text-xs text-gray-600 dark:text-gray-300">আগে নিজেকে পরীক্ষা পাঠান
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value.trim())} className="input w-full mt-1" placeholder="আপনার ইমেইল" inputMode="email" />
            </label>
            <button type="button" onClick={() => send(true)} disabled={busy || !testEmail || subject.length < 3 || body.length < 10} className="btn btn-outline btn-sm min-h-11">পরীক্ষা পাঠান</button>
            <button type="button" onClick={() => setConfirmSend(true)} disabled={busy || subject.length < 3 || body.length < 10} className="btn btn-brand btn-sm min-h-11 gap-1.5"><Send className="w-4 h-4" /> সবাইকে পাঠান</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-[var(--line)] p-1 bg-white dark:bg-white/5">
          {(["active", "unsubscribed"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`px-3 min-h-10 rounded-lg text-sm font-semibold ${tab === k ? "bg-brand-600 text-white" : "text-muted"}`}>
              {k === "active" ? "সক্রিয়" : "বাদ পড়া"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input w-full pl-9" placeholder="ইমেইল খুঁজুন…" aria-label="ইমেইল খুঁজুন" />
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted">
            <Mail className="w-8 h-8" />
            <p className="text-sm">{search ? "কিছু পাওয়া যায়নি" : tab === "active" ? "এখনো কেউ সাবস্ক্রাইব করেননি — ওয়েবসাইটের নিচে সাবস্ক্রাইব বক্স আছে" : "কেউ বাদ পড়েননি"}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/10">
            {shown.map((sub) => (
              <li key={sub.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading break-all">{sub.email}</p>
                  <p className="text-xs text-muted">
                    {tab === "active" ? `যোগ: ${fmt(sub.subscribed_at)}` : `বাদ: ${fmt(sub.unsubscribed_at)}`}
                    {sub.source ? ` · ${SOURCE_BN[sub.source] ?? sub.source}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => handleCopyEmail(sub.email)} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600" aria-label="কপি">
                  {copiedEmail === sub.email ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
                {tab === "active" ? (
                  <button type="button" onClick={() => setRemoveTarget(sub)} className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600" aria-label="সরান">
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="button" onClick={() => handleRestore(sub)} className="min-h-11 px-3 flex items-center gap-1 rounded-lg text-xs text-brand-600 hover:bg-brand-50" aria-label="আবার যোগ">
                    <RotateCcw className="w-4 h-4" /> আবার যোগ
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="তালিকা থেকে সরাবেন?"
        message={`${removeTarget?.email ?? ""} আর নিউজলেটার পাবেন না। মুছে যাবে না — “বাদ পড়া” ট্যাব থেকে আবার যোগ করা যাবে।`}
        confirmLabel="সরান"
        variant="danger"
        onConfirm={() => removeTarget && handleRemove(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      />
      <ConfirmDialog
        open={confirmSend}
        title={`${stats?.active ?? total} জনকে ইমেইল পাঠাবেন?`}
        message={`বিষয়: “${subject}”। একবার পাঠানো শুরু হলে ফেরানো যায় না — আগে নিজেকে পরীক্ষা পাঠিয়ে দেখে নেওয়া ভালো।`}
        confirmLabel="পাঠান"
        variant="warning"
        onConfirm={() => send(false)}
        onCancel={() => setConfirmSend(false)}
      />
    </div>
  );
}
