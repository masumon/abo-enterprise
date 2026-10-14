"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Sparkles, X } from "lucide-react";
import { aiCatalogApi, type AiWriteTask } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { AI_TASKS } from "@/components/admin/catalog/AiTextMenu";
import { useToastStore } from "@/store/toast";
import AiBlogWriter from "@/components/admin/AiBlogWriter";

const IDEAS = [
  "নতুন অফারের জন্য Facebook পোস্ট লেখো",
  "এই ক্যাটাগরির জন্য ২ লাইনের বিবরণ লেখো: ",
  "গ্রাহককে দেরিতে ডেলিভারির জন্য দুঃখপ্রকাশের ইমেইল লেখো",
  "নিউজলেটারের জন্য ঈদ অফারের শিরোনাম ও লেখা দাও",
];

/**
 * Floating "✨ AI" on every admin page: write anything from an instruction, or
 * improve / fix / translate pasted text. Nothing is saved — copy and paste
 * the result where it is needed. Uses whichever AI key is set in Settings.
 */
export default function AdminAiAssistant() {
  const toast = useToastStore((s) => s.push);
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState<AiWriteTask | "blog">("write");
  const [instruction, setInstruction] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  // Phones open the assistant from the top bar (no floating button over content).
  useEffect(() => {
    const open = () => setOpen(true);
    window.addEventListener("abo:open-ai", open);
    return () => window.removeEventListener("abo:open-ai", open);
  }, []);

  const run = async () => {
    setBusy(true);
    setResult("");
    try {
      if (task === "blog") return;
      const r = await aiCatalogApi.write({ task, text, instruction: task === "write" ? instruction : "", context: "admin assistant" });
      setResult(r.data.data?.text ?? "");
    } catch (e) {
      toast("error", apiErrorMessage(e, "AI কাজ করেনি — Admin → AI Assistant-এ কী দেওয়া আছে কিনা দেখুন"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="AI সহকারী খুলুন"
        className="hidden lg:flex fixed z-40 right-4 bottom-6 items-center gap-1.5 rounded-full bg-brand-600 text-white shadow-lg px-4 min-h-12 text-sm font-semibold hover:bg-brand-700">
        <Sparkles className="w-4 h-4" /> AI
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="AI সহকারী" onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
              <p className="font-semibold text-heading flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-600" /> AI সহকারী</p>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 min-w-11 flex items-center justify-center text-gray-400" aria-label="বন্ধ"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                কী করবেন?
                <select value={task} onChange={(e) => setTask(e.target.value as AiWriteTask | "blog")} className="input w-full text-sm mt-1">
                  {AI_TASKS.map((t) => <option key={t.id} value={t.id}>{t.bn}</option>)}
                  <option value="seo">🔎 Google-এর জন্য ছোট বিবরণ (SEO)</option>
                  <option value="blog">📰 ব্লগ লিখুন (পণ্য/সেবাসহ)</option>
                </select>
              </label>
              {task === "blog" ? <AiBlogWriter /> : task === "write" ? (
                <>
                  <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={4} className="input w-full text-sm" dir="auto"
                    placeholder="AI-কে কী লিখতে বলবেন — বাংলা বা ইংরেজিতে" aria-label="নির্দেশ" />
                  <div className="flex flex-wrap gap-1.5">
                    {IDEAS.map((i) => <button key={i} type="button" onClick={() => setInstruction(i)} className="rounded-full border border-[var(--line)] px-2.5 min-h-9 text-xs text-left">{i}</button>)}
                  </div>
                </>
              ) : (
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="input w-full text-sm" dir="auto"
                  placeholder="যে লেখা বদলাতে/অনুবাদ করতে চান, এখানে পেস্ট করুন" aria-label="লেখা" />
              )}
              {task !== "blog" && <button type="button" onClick={run} disabled={busy || (task === "write" ? !instruction.trim() : !text.trim())} className="btn btn-brand w-full min-h-11 gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {busy ? "AI লিখছে…" : "চালান"}
              </button>}
              {result && (
                <div className="space-y-2">
                  <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 text-sm whitespace-pre-wrap" dir="auto">{result}</div>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-outline btn-sm min-h-11 gap-1.5 flex-1" onClick={() => { void navigator.clipboard?.writeText(result); toast("success", "কপি হয়েছে — যেখানে দরকার পেস্ট করুন"); }}><Copy className="w-4 h-4" /> কপি</button>
                    <button type="button" className="btn btn-outline btn-sm min-h-11 flex-1" onClick={() => { setTask("improve"); setText(result); setResult(""); }}>এটা আরও উন্নত করুন</button>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-muted">লেখা কোথাও নিজে থেকে সেভ হয় না — কপি করে যেখানে দরকার বসান। প্রতিটি লেখার ঘরেও ✨ বোতাম আছে।</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
