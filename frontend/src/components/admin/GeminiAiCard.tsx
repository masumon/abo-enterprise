"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, ShieldCheck, Sparkles, Trash2, XCircle } from "lucide-react";
import { assistantAdminApi, type GeminiStatus } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

/**
 * Admin → AI Assistant → Google AI. The owner pastes a free Gemini API key; the server
 * tests it against Google before saving (a bad key is never stored) and keeps it
 * encrypted. Without a working key the assistant simply keeps using its knowledge base.
 */
export default function GeminiAiCard() {
  const toast = useToastStore((s) => s.push);
  const [status, setStatus] = useState<GeminiStatus | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "verify" | "toggle" | "remove">("");
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await assistantAdminApi.getAi();
      setStatus(r.data.data ?? null);
    } catch {
      setStatus(null);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (kind: typeof busy, fn: () => Promise<{ data: { data?: GeminiStatus | null; message?: string } }>, ok: string) => {
    setBusy(kind);
    setError("");
    try {
      const r = await fn();
      setStatus(r.data.data ?? null);
      toast("success", ok);
      if (kind === "save") setKey("");
    } catch (e) {
      const msg = apiErrorMessage(e, "কাজটি করা যায়নি");
      setError(msg);
      toast("error", msg);
    } finally {
      setBusy("");
    }
  };

  const active = !!(status?.has_key && status.enabled);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-800">Google AI (Gemini) — ঐচ্ছিক</h2>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
          {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {active ? "চালু" : status?.has_key ? "বন্ধ করা আছে" : "চালু নেই"}
        </span>
      </div>

      <div className="p-6 space-y-5 text-sm">
        <p className="text-gray-600 leading-relaxed">
          সহকারী নিজের জ্ঞান-ভাণ্ডারে উত্তর না পেলে Google AI ওই জ্ঞান-ভাণ্ডারের তথ্য দিয়েই স্বাভাবিক ভাষায় উত্তর লিখবে — নিজে কোনো দাম বা তথ্য বানাবে না।
          কী না দিলে বা AI কাজ না করলে সহকারী আগের মতোই সাধারণভাবে চলবে।
        </p>

        {status?.has_key ? (
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <p><span className="text-gray-500">সংরক্ষিত কী:</span> <span className="font-mono font-semibold">{status.key_hint}</span></p>
              <p><span className="text-gray-500">মডেল:</span> <span className="font-semibold">{status.model}</span></p>
              <p><span className="text-gray-500">আজ ব্যবহার:</span> <span className="font-semibold">{status.used_today} / {status.daily_cap || "সীমাহীন"}</span></p>
              {status.verified_at && <p><span className="text-gray-500">শেষ যাচাই:</span> <span className="font-semibold">{new Date(status.verified_at).toLocaleString("bn-BD")}</span></p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!!busy} onClick={() => run("verify", () => assistantAdminApi.verifyAi(), "যাচাই সফল — Google AI কাজ করছে")} className="btn btn-outline btn-sm gap-1.5">
                {busy === "verify" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} আবার যাচাই
              </button>
              <button type="button" disabled={!!busy} onClick={() => run("toggle", () => assistantAdminApi.updateAi({ enabled: !status.enabled }), status.enabled ? "Google AI বন্ধ করা হয়েছে" : "Google AI চালু হয়েছে")} className="btn btn-outline btn-sm">
                {busy === "toggle" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{status.enabled ? "সাময়িক বন্ধ করুন" : "আবার চালু করুন"}
              </button>
              <button type="button" disabled={!!busy} onClick={() => setConfirmRemove(true)} className="btn btn-outline btn-sm gap-1.5 text-red-600">
                <Trash2 className="w-4 h-4" /> কী মুছুন
              </button>
            </div>
            <label className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
              দিনে সর্বোচ্চ AI উত্তর:
              <input
                type="number" min={0} max={5000} defaultValue={status.daily_cap}
                onBlur={(e) => { const v = Number(e.target.value); if (v !== status.daily_cap) void run("toggle", () => assistantAdminApi.updateAi({ daily_cap: v }), "সীমা সংরক্ষিত"); }}
                className="input w-28 text-sm"
              />
              <span className="text-gray-400">(০ = সীমাহীন; ফ্রি সীমা বাঁচাতে ৩০০ রাখাই ভালো)</span>
            </label>
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="gemini-key" className="block text-xs font-semibold text-gray-600">
            {status?.has_key ? "নতুন কী দিয়ে বদলাতে চাইলে এখানে বসান" : "Google AI API কী"}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="gemini-key" type="password" autoComplete="off" spellCheck={false}
                value={key} onChange={(e) => { setKey(e.target.value.trim()); setError(""); }}
                placeholder="AIza… বা AQ.…" className="input w-full pl-9 font-mono text-sm"
              />
            </div>
            <button
              type="button" disabled={!key || !!busy}
              onClick={() => run("save", () => assistantAdminApi.updateAi({ api_key: key }), "সফল! Google AI চালু হয়েছে")}
              className="btn btn-brand btn-md gap-2 justify-center disabled:opacity-50"
            >
              {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} যাচাই করে সংরক্ষণ
            </button>
          </div>
          {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
          <p className="text-xs text-gray-500">কী সার্ভারে এনক্রিপ্ট করে রাখা হয়, কোথাও পুরোটা দেখানো হয় না। ভুল কী কখনো সংরক্ষণ হয় না।</p>
        </div>

        <details className="rounded-xl bg-brand-50/60 p-4 text-xs leading-relaxed text-gray-700">
          <summary className="cursor-pointer font-bold text-gray-800">ফ্রি কী কীভাবে পাবেন? (২ মিনিট)</summary>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline inline-flex items-center gap-1">
                aistudio.google.com/app/apikey <ExternalLink className="w-3 h-3" />
              </a>{" "}খুলে আপনার Google অ্যাকাউন্ট দিয়ে ঢুকুন।
            </li>
            <li>শর্তাবলী মেনে নিন, তারপর <b>Create API key</b> চাপুন।</li>
            <li>যে কী-টা আসে (AIza… বা AQ.… দিয়ে শুরু — দুটোই চলবে) সেটা <b>Copy</b> করুন।</li>
            <li>এখানে বসিয়ে <b>যাচাই করে সংরক্ষণ</b> চাপুন — “সফল” এলে কাজ শুরু।</li>
          </ol>
          <p className="mt-2 text-gray-500">জানা দরকার: ফ্রি সংস্করণে দিনে/মিনিটে সীমা আছে, আর Google তাদের শর্ত অনুযায়ী ফ্রি ব্যবহারের লেখা নিজেদের পণ্য উন্নয়নে ব্যবহার করতে পারে। গ্রাহকের ফোন নম্বর ও ইমেইল আমরা Google-এ পাঠাই না।</p>
        </details>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Google AI কী মুছবেন?"
        message="কী মুছে ফেললে সহকারী শুধু নিজের জ্ঞান-ভাণ্ডার দিয়ে উত্তর দেবে। পরে আবার কী বসানো যাবে।"
        confirmLabel="মুছে ফেলুন"
        variant="danger"
        onConfirm={async () => { setConfirmRemove(false); await run("remove", () => assistantAdminApi.removeAi(), "কী মুছে ফেলা হয়েছে"); }}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}
