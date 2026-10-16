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
  const [provider, setProvider] = useState("auto");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
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
    <div className="admin-surface bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-800">AI (যেকোনো প্রদানকারী) — ঐচ্ছিক</h2>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
          {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {active ? "চালু" : status?.has_key ? "বন্ধ করা আছে" : "চালু নেই"}
        </span>
      </div>

      <div className="p-6 space-y-5 text-sm">
        <p className="text-gray-600 leading-relaxed">
          Google Gemini, OpenAI (ChatGPT), Anthropic Claude, OpenRouter, Groq, DeepSeek, xAI, Mistral বা যেকোনো OpenAI-সামঞ্জস্যপূর্ণ সার্ভার —
          ফ্রি বা পেইড, যেকোনো কী ও মডেল চলবে। এই কী দিয়েই সহকারীর উত্তর, অনুবাদ, পণ্য/সেবার লেখা, ✨ AI বোতাম ও AI সহকারী — সব কাজ করবে।
          সহকারী শুধু জ্ঞান-ভাণ্ডারের তথ্য দিয়েই উত্তর দেয়, নিজে দাম বা তথ্য বানায় না। কী না দিলে বা AI কাজ না করলে সব আগের মতোই চলবে।
        </p>

        {status?.has_key ? (
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <p><span className="text-gray-500">সংরক্ষিত কী:</span> <span className="font-mono font-semibold">{status.key_hint}</span></p>
              <p><span className="text-gray-500">প্রদানকারী:</span> <span className="font-semibold">{status.provider_label || "Google Gemini"}</span></p>
              <p><span className="text-gray-500">মডেল:</span> <span className="font-semibold break-all">{status.model}</span></p>
              <p><span className="text-gray-500">আজ ব্যবহার:</span> <span className="font-semibold">{status.used_today} / {status.daily_cap || "সীমাহীন"}</span></p>
              {status.last_error ? <p className="sm:col-span-2 text-red-600"><span className="font-semibold">শেষ সমস্যা:</span> {status.last_error}{status.last_error_at ? ` (${new Date(status.last_error_at).toLocaleString("bn-BD")})` : ""} — এ সময় সহকারী সাধারণ উত্তর দিয়েছে।</p> : null}
              {status.verified_at && <p><span className="text-gray-500">শেষ যাচাই:</span> <span className="font-semibold">{new Date(status.verified_at).toLocaleString("bn-BD")}</span></p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!!busy} onClick={() => run("verify", () => assistantAdminApi.verifyAi(), "যাচাই সফল — AI কাজ করছে")} className="btn btn-outline btn-sm gap-1.5">
                {busy === "verify" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} আবার যাচাই
              </button>
              <button type="button" disabled={!!busy} onClick={() => run("toggle", () => assistantAdminApi.updateAi({ enabled: !status.enabled }), status.enabled ? "AI বন্ধ করা হয়েছে" : "AI চালু হয়েছে")} className="btn btn-outline btn-sm">
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
            {status?.has_key ? "নতুন কী দিয়ে বদলাতে চাইলে এখানে বসান" : "AI API কী"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">
              প্রদানকারী
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input w-full text-sm mt-1">
                <option value="auto">স্বয়ংক্রিয় (কী দেখে চিনে নেবে)</option>
                {(status?.providers ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-600">
              মডেল <span className="text-gray-400">(ঐচ্ছিক — খালি = নিজে বেছে নেবে)</span>
              <input value={model} onChange={(e) => setModel(e.target.value.trim())} placeholder="যেমন: gpt-4o-mini, claude-haiku-5-5" className="input w-full text-sm mt-1 font-mono" />
            </label>
            {provider === "custom" && (
              <label className="text-xs text-gray-600 sm:col-span-2">
                API ঠিকানা (Base URL)
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value.trim())} placeholder="https://…/v1" inputMode="url" className="input w-full text-sm mt-1 font-mono" />
              </label>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="gemini-key" type="password" autoComplete="off" spellCheck={false}
                value={key} onChange={(e) => { setKey(e.target.value.trim()); setError(""); }}
                placeholder="AIza… / sk-… / sk-ant-… / gsk_… ইত্যাদি" className="input w-full pl-9 font-mono text-sm"
              />
            </div>
            <button
              type="button" disabled={!key || !!busy}
              onClick={() => run("save", () => assistantAdminApi.updateAi({ api_key: key, provider, base_url: baseUrl || undefined, model: model || undefined }), "সফল! AI চালু হয়েছে")}
              className="btn btn-brand btn-md gap-2 justify-center disabled:opacity-50"
            >
              {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} যাচাই করে সংরক্ষণ
            </button>
          </div>
          {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
          <p className="text-xs text-gray-500">কী সার্ভারে এনক্রিপ্ট করে রাখা হয়, কোথাও পুরোটা দেখানো হয় না। ভুল কী কখনো সংরক্ষণ হয় না।</p>
        </div>

        <details className="rounded-xl bg-brand-50/60 p-4 text-xs leading-relaxed text-gray-700">
          <summary className="cursor-pointer font-bold text-gray-800">কী কোথায় পাবেন? (ফ্রি ও পেইড)</summary>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><b>Google Gemini (ফ্রি):</b> aistudio.google.com/app/apikey — নিচের ধাপ দেখুন।</li>
            <li><b>OpenAI (পেইড):</b> platform.openai.com/api-keys — কী “sk-…” দিয়ে শুরু।</li>
            <li><b>Anthropic Claude (পেইড):</b> console.anthropic.com — কী “sk-ant-…”।</li>
            <li><b>OpenRouter (অনেক মডেল, কিছু ফ্রি):</b> openrouter.ai/keys — কী “sk-or-…”।</li>
            <li><b>Groq (ফ্রি সীমা আছে):</b> console.groq.com/keys — কী “gsk_…”।</li>
            <li><b>অন্য সার্ভার:</b> প্রদানকারী “অন্য” বেছে API ঠিকানা ও মডেল দিন।</li>
          </ul>
          <p className="mt-2 font-semibold text-gray-800">Google-এর ফ্রি কী (২ মিনিট):</p>
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
          <p className="mt-2 text-gray-500">জানা দরকার: ফ্রি সংস্করণে দিনে/মিনিটে সীমা থাকে, আর কিছু প্রদানকারী ফ্রি ব্যবহারের লেখা নিজেদের উন্নয়নে ব্যবহার করতে পারে। পেইড কী হলে খরচ নিয়ন্ত্রণে “দিনে সর্বোচ্চ AI উত্তর” সীমা রাখুন। গ্রাহকের ফোন নম্বর ও ইমেইল আমরা কোনো AI-তে পাঠাই না।</p>
        </details>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="AI কী মুছবেন?"
        message="কী মুছে ফেললে সহকারী শুধু নিজের জ্ঞান-ভাণ্ডার দিয়ে উত্তর দেবে। পরে আবার কী বসানো যাবে।"
        confirmLabel="মুছে ফেলুন"
        variant="danger"
        onConfirm={async () => { setConfirmRemove(false); await run("remove", () => assistantAdminApi.removeAi(), "কী মুছে ফেলা হয়েছে"); }}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}
