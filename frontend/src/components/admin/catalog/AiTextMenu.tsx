"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { aiCatalogApi, type AiTone, type AiWriteTask } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toast";

export const AI_TASKS: { id: AiWriteTask; bn: string }[] = [
  { id: "improve", bn: "✨ সুন্দর ও পেশাদার করুন" },
  { id: "fix", bn: "✔️ শুধু বানান/ব্যাকরণ ঠিক করুন" },
  { id: "shorten", bn: "✂️ ছোট করুন" },
  { id: "expand", bn: "➕ আরও বিস্তারিত করুন" },
  { id: "bullets", bn: "• পয়েন্ট আকারে সাজান" },
  { id: "to_en", bn: "🇬🇧 ইংরেজিতে অনুবাদ" },
  { id: "to_bn", bn: "🇧🇩 বাংলায় অনুবাদ" },
  { id: "write", bn: "📝 নির্দেশ দিয়ে লেখান" },
];

/**
 * "✨ AI" for any text box: improve, fix, shorten, expand, bullets, translate or
 * write from an instruction. The result is shown first; it replaces the text
 * only when the admin taps "বসান".
 */
export default function AiTextMenu({ text, onApply, context, className, compact }: {
  text: string;
  onApply: (v: string) => void;
  /** Where the text is used, e.g. "service FAQ answer" — helps the AI. */
  context?: string;
  className?: string;
  compact?: boolean;
}) {
  const toast = useToastStore((s) => s.push);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [askWrite, setAskWrite] = useState(false);
  // Tone for every task; the last task can be re-run ("নতুন করে লেখো"); "৩টি বিকল্প" shows pickable chips.
  const [tone, setTone] = useState<AiTone>("");
  const [lastTask, setLastTask] = useState<AiWriteTask | null>(null);
  const [options, setOptions] = useState<string[] | null>(null);
  const suggest = async () => {
    setBusy(true);
    try {
      const r = await aiCatalogApi.write({ task: "write", text, context, tone,
        instruction: "Give 3 different alternatives for this text (same language as the text; if empty, Bangla). One per line. No numbering, no quotes, nothing else." });
      const lines = (r.data.data?.text ?? "").split("\n").map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 3);
      setOptions(lines.length ? lines : null);
      if (!lines.length) toast("error", "AI কোনো বিকল্প দেয়নি — আবার চেষ্টা করুন");
    } catch (e) {
      toast("error", apiErrorMessage(e, "AI কাজ করেনি — AI সেটিংসে কী দেওয়া আছে কিনা দেখুন"));
    } finally {
      setBusy(false);
    }
  };

  const run = async (task: AiWriteTask) => {
    if (task === "write" && !askWrite) { setAskWrite(true); return; }
    setBusy(true);
    try {
      const r = await aiCatalogApi.write({ task, text, instruction: task === "write" ? instruction : "", context, tone });
      setResult(r.data.data?.text ?? "");
      setLastTask(task);
      setAskWrite(false);
    } catch (e) {
      toast("error", apiErrorMessage(e, "AI কাজ করেনি — AI সেটিংসে কী দেওয়া আছে কিনা দেখুন"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <button type="button" onClick={() => { setOpen((o) => !o); setResult(null); setAskWrite(false); setOptions(null); }}
        className={cn("inline-flex items-center justify-center gap-1 rounded-lg text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/15 font-medium", compact ? "min-h-10 min-w-10 px-1.5 text-xs" : "min-h-10 px-2 text-xs")}
        title="AI দিয়ে লেখা" aria-expanded={open}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{!compact && " AI"}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[var(--line)] bg-white dark:bg-gray-900 shadow-xl p-2 space-y-1">
          {result !== null ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted px-1">AI-এর লেখা — দেখে নিন:</p>
              <div className="max-h-56 overflow-y-auto rounded-lg bg-gray-50 dark:bg-white/5 p-2 text-sm whitespace-pre-wrap" dir="auto">{result}</div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-outline btn-sm min-h-10" onClick={() => setResult(null)}>অন্য কাজ</button>
                {lastTask && <button type="button" className="btn btn-outline btn-sm min-h-10 gap-1" disabled={busy} onClick={() => run(lastTask)}>{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}নতুন করে লেখো</button>}
                <button type="button" className="btn btn-outline btn-sm min-h-10" onClick={() => { void navigator.clipboard?.writeText(result); toast("success", "কপি হয়েছে"); }}>কপি</button>
                <button type="button" className="btn btn-brand btn-sm min-h-10" onClick={() => { onApply(result); setOpen(false); setResult(null); }}>বসান</button>
              </div>
            </div>
          ) : options ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted px-1">একটি বেছে নিন:</p>
              {options.map((o) => (
                <button key={o} type="button" onClick={() => { onApply(o); setOpen(false); setOptions(null); }}
                  className="w-full text-left rounded-lg border border-[var(--line)] px-2.5 py-2 min-h-10 text-sm hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-white/5" dir="auto">{o}</button>
              ))}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-outline btn-sm min-h-10" onClick={() => setOptions(null)}>পেছনে</button>
                <button type="button" className="btn btn-outline btn-sm min-h-10 gap-1" disabled={busy} onClick={suggest}>{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}আরও ৩টি</button>
              </div>
            </div>
          ) : askWrite ? (
            <div className="space-y-2">
              <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} className="input w-full text-sm" dir="auto"
                placeholder="যেমন: এই সেবার জন্য ৩ লাইনের আকর্ষণীয় বিবরণ লেখো" autoFocus />
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-outline btn-sm min-h-10" onClick={() => setAskWrite(false)}>পেছনে</button>
                <button type="button" className="btn btn-brand btn-sm min-h-10 gap-1" disabled={busy || !instruction.trim()} onClick={() => run("write")}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} লিখুন
                </button>
              </div>
            </div>
          ) : (<>
            <div className="flex flex-wrap gap-1 px-1 pb-1" role="group" aria-label="লেখার ধরন">
              {([["", "পেশাদার"], ["friendly", "বন্ধুসুলভ"], ["sales", "বিক্রয়মুখী"]] as [AiTone, string][]).map(([v, l]) => (
                <button key={l} type="button" aria-pressed={tone === v} onClick={() => setTone(v)}
                  className={cn("rounded-full border px-2.5 min-h-8 text-xs", tone === v ? "bg-brand-600 text-white border-brand-600" : "border-[var(--line)] hover:border-brand-300")}>{l}</button>
              ))}
            </div>
            <button type="button" disabled={busy} onClick={suggest} className="w-full text-left rounded-lg px-2.5 min-h-10 text-sm hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-40">💡 ৩টি বিকল্প প্রস্তাব</button>
            {AI_TASKS.map((t) => (
              <button key={t.id} type="button" disabled={busy || (t.id !== "write" && !text.trim())} onClick={() => run(t.id)}
                className="w-full text-left rounded-lg px-2.5 min-h-10 text-sm hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-40">
                {t.bn}
              </button>
            ))}
          </>)}
          {busy && result === null && !askWrite && !options && <p className="text-[11px] text-muted px-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> AI লিখছে…</p>}
        </div>
      )}
    </div>
  );
}
