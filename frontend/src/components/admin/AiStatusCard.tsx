"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, PenLine, Settings2, Sparkles, XCircle } from "lucide-react";
import { assistantAdminApi, type GeminiStatus } from "@/lib/api";

/** Dashboard card: is AI on, which provider/model, today's use, last problem, quick actions. */
export default function AiStatusCard() {
  const [st, setSt] = useState<GeminiStatus | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    // Never let this card break the dashboard (missing API, network error…).
    Promise.resolve().then(() => assistantAdminApi.getAi()).then((r) => setSt(r?.data?.data ?? null)).catch(() => setFailed(true));
  }, []);
  if (failed) return null;
  const on = !!(st?.has_key && st.enabled);
  const used = st?.used_today ?? 0;
  const cap = st?.daily_cap ?? 0;
  const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  return (
    <section className="admin-card p-4 sm:p-5" aria-labelledby="ai-card-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ai-card-title" className="font-semibold text-heading flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-600" /> AI</h2>
        {st && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${on ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
            {on ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}{on ? "চালু" : "বন্ধ"}
          </span>
        )}
      </div>
      {!st ? (
        <div className="mt-3 h-12 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse" />
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          {on ? (
            <p className="text-muted">{st.provider_label || "Google Gemini"} · <span className="font-mono text-xs break-all">{st.model}</span></p>
          ) : (
            <p className="text-muted">AI কী দেওয়া নেই বা বন্ধ — লেখা, অনুবাদ, ব্লগ ও চ্যাট সহকারী AI ছাড়াই সাধারণভাবে চলছে।</p>
          )}
          {on && (
            <div>
              <div className="flex justify-between text-xs text-muted"><span>আজ ব্যবহার</span><span>{used.toLocaleString("bn-BD")} / {cap ? cap.toLocaleString("bn-BD") : "সীমাহীন"}</span></div>
              {cap > 0 && <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden"><div className={`h-full rounded-full ${pct > 85 ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} /></div>}
            </div>
          )}
          {st.last_error && <p className="text-xs text-amber-700 dark:text-amber-300">⚠️ শেষ সমস্যা: {st.last_error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.dispatchEvent(new Event("abo:open-ai"))} className="btn btn-brand btn-sm min-h-11 gap-1.5"><Sparkles className="w-4 h-4" /> AI সহকারী</button>
            <Link href="/sumon/blog" className="btn btn-outline btn-sm min-h-11 gap-1.5"><PenLine className="w-4 h-4" /> ব্লগ লিখুন</Link>
            <Link href="/sumon/ai" className="btn btn-outline btn-sm min-h-11 gap-1.5"><Settings2 className="w-4 h-4" /> AI সংযোগ</Link>
          </div>
        </div>
      )}
    </section>
  );
}
