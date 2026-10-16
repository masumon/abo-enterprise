"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Plus, Sparkles } from "lucide-react";
import { aiCatalogApi, type AiFillField, type AiTone } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toast";

type Item = Record<string, string | number>;

/**
 * "✨ AI দিয়ে পূরণ" — the admin types a few words (or pastes a customer message,
 * a link…), AI drafts one or more items with exactly this form's fields, the
 * admin reviews and adds them. Nothing is saved until the form's own Save.
 */
export default function AiFillPanel({
  context, fields, onAdd, multi = false, placeholder, presets, avoid, title, preview,
}: {
  /** What this form is, e.g. "FAQ on the homepage of a phone/IT shop". */
  context: string;
  fields: AiFillField[];
  onAdd: (items: Item[]) => void;
  /** List editors may ask for several items at once. */
  multi?: boolean;
  placeholder?: string;
  /** Ready-made starting ideas (tap to use). */
  presets?: string[];
  /** Existing item titles, so AI does not repeat them. */
  avoid?: string[];
  title?: string;
  /** How a drafted item is shown for review (defaults to its text values). */
  preview?: (it: Item) => React.ReactNode;
}) {
  const toast = useToastStore((s) => s.push);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [count, setCount] = useState(multi ? 3 : 1);
  const [tone, setTone] = useState<AiTone>("");
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Item[] | null>(null);

  const run = async () => {
    if (!input.trim()) { toast("error", "AI-কে কয়েকটি শব্দে বলুন কী চান"); return; }
    setBusy(true);
    try {
      const r = await aiCatalogApi.fill({ context, fields, input, count, tone, avoid: avoid?.filter(Boolean).slice(0, 40) });
      setDrafts(r.data.data?.items ?? []);
    } catch (e) {
      toast("error", apiErrorMessage(e, "AI কাজ করেনি — AI সেটিংসে কী দেওয়া আছে কিনা দেখুন"));
    } finally {
      setBusy(false);
    }
  };

  const add = (items: Item[]) => {
    onAdd(items);
    toast("success", `${items.length.toLocaleString("bn-BD")}টি যোগ হয়েছে — দেখে নিয়ে “সংরক্ষণ” চাপুন`);
    setDrafts(null); setInput(""); setOpen(false);
  };

  const show = (it: Item) => preview ? preview(it) : (
    <span className="block text-sm text-gray-800 dark:text-gray-100 break-words" dir="auto">
      {fields.filter((f) => f.type !== "icon" && it[f.key] !== undefined && String(it[f.key]).trim()).slice(0, 3).map((f) => String(it[f.key])).join(" · ")}
    </span>
  );

  return (
    <div className="rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/40 dark:bg-brand-500/5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 min-h-11 text-sm font-semibold text-brand-700 dark:text-brand-300">
        <Sparkles className="w-4 h-4" aria-hidden />
        <span className="flex-1 text-left">{title ?? (multi ? "✨ AI দিয়ে যোগ করুন" : "✨ AI দিয়ে পূরণ করুন")}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {drafts ? (
            <>
              <p className="text-xs text-gray-600 dark:text-gray-300">AI-এর খসড়া — দেখে নিয়ে যোগ করুন:</p>
              <ul className="space-y-1.5">
                {drafts.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-2.5 py-2">
                    <span className="flex-1 min-w-0">{show(d)}</span>
                    <button type="button" onClick={() => add([d])} className="btn btn-outline btn-sm min-h-10 gap-1 flex-none"><Plus className="w-4 h-4" aria-hidden /> যোগ</button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setDrafts(null)} className="btn btn-outline btn-sm min-h-10">পেছনে</button>
                <button type="button" onClick={run} disabled={busy} className="btn btn-outline btn-sm min-h-10 gap-1">{busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}নতুন করে বানাও</button>
                {drafts.length > 1 && <button type="button" onClick={() => add(drafts)} className="btn btn-brand btn-sm min-h-10">সব যোগ করুন</button>}
              </div>
            </>
          ) : (
            <>
              {presets && presets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button key={p} type="button" onClick={() => setInput(p)} className="rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 min-h-9 text-xs hover:border-brand-400">{p}</button>
                  ))}
                </div>
              )}
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} dir="auto"
                className="input w-full text-sm" placeholder={placeholder ?? "কয়েকটি শব্দে লিখুন কী চান — যেমন: আমাদের মোবাইল সার্ভিসিং দ্রুত ও ওয়ারেন্টিসহ"} />
              <div className="flex flex-wrap items-center gap-2">
                {multi && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">কয়টি
                    <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="input min-h-9 w-auto text-sm py-1">
                      {[1, 3, 5].map((n) => <option key={n} value={n}>{n.toLocaleString("bn-BD")}</option>)}
                    </select>
                  </label>
                )}
                <div className="flex gap-1" role="group" aria-label="লেখার ধরন">
                  {([["", "পেশাদার"], ["friendly", "বন্ধুসুলভ"], ["sales", "বিক্রয়মুখী"]] as [AiTone, string][]).map(([v, l]) => (
                    <button key={l} type="button" aria-pressed={tone === v} onClick={() => setTone(v)}
                      className={cn("rounded-full border px-2.5 min-h-9 text-xs", tone === v ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5")}>{l}</button>
                  ))}
                </div>
                <button type="button" onClick={run} disabled={busy} className="btn btn-brand btn-sm min-h-10 gap-1.5 ml-auto">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Sparkles className="w-4 h-4" aria-hidden />} বানাও
                </button>
              </div>
              <p className="text-[11px] text-gray-500">AI যা লিখবে তা আগে দেখাবে — আপনি “যোগ” না চাপলে কিছু বসবে না। দাম, ফোন, নম্বর AI বানায় না।</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
