"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ClipboardPaste, Copy, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import BnEnText from "@/components/admin/catalog/BnEnText";
import { aiCatalogApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import {
  DETAIL_TEMPLATES, itemText, mergeLists, parseFaq, parseLines, renumber, templateLists, toPair,
  type DetailLists, type Faq, type ListKey, type Pair, type Step,
} from "@/lib/serviceDetailKit";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toast";

const TABS: { key: ListKey; icon: string; bn: string; add: string; hint: string }[] = [
  { key: "process_steps", icon: "🪜", bn: "কাজের ধাপ", add: "ধাপ", hint: "গ্রাহক কীভাবে সেবা পাবেন — ধাপে ধাপে। নম্বর নিজে থেকে বসে।" },
  { key: "benefits", icon: "⭐", bn: "সুবিধা", add: "সুবিধা", hint: "কেন এই সেবা নেবেন — ছোট ছোট লাইনে।" },
  { key: "requirements", icon: "📌", bn: "শর্ত", add: "শর্ত", hint: "গ্রাহককে যা মানতে বা জানাতে হবে।" },
  { key: "required_documents", icon: "🗂️", bn: "কাগজপত্র", add: "কাগজ", hint: "যে কাগজ বা ফাইল লাগবে।" },
  { key: "faq", icon: "❓", bn: "প্রশ্নোত্তর", add: "প্রশ্ন", hint: "গ্রাহকেরা সাধারণত যা জিজ্ঞেস করেন।" },
];

type Item = Step | Pair | Faq;

/**
 * Service "more details" — steps, benefits, requirements, documents, FAQ — for
 * a non-technical admin: tabs, Bangla-first cards (English folded, translated
 * on save), paste many at once, ready-made sets, AI, copy from another service.
 */
export default function ServiceDetailsEditor({ value, onChange, serviceName, notes, otherServices, loadService }: {
  value: DetailLists;
  onChange: (next: DetailLists) => void;
  serviceName?: string;
  notes?: string;
  otherServices: { id: string; name: string }[];
  loadService: (id: string) => Promise<Partial<DetailLists> | null>;
}) {
  const toast = useToastStore((s) => s.push);
  const [tab, setTab] = useState<ListKey>("process_steps");
  const [open, setOpen] = useState<number | null>(null);
  const [panel, setPanel] = useState<"" | "paste" | "template" | "ai" | "copy">("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiDraft, setAiDraft] = useState<Partial<DetailLists> | null>(null);
  const [aiPick, setAiPick] = useState<Record<string, boolean>>({});

  const meta = TABS.find((t) => t.key === tab)!;
  const list = (value[tab] as Item[]) ?? [];
  const setList = (items: Item[]) => {
    const next = { ...value, [tab]: tab === "process_steps" ? renumber(items as Step[]) : items } as DetailLists;
    onChange(next);
  };
  const update = (i: number, patch: Partial<Step & Pair & Faq>) => setList(list.map((it, j) => (j === i ? { ...it, ...patch } as Item : it)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    setList(n);
    setOpen(j);
  };
  const blank = (): Item =>
    tab === "process_steps" ? { step: list.length + 1, title: "", title_bn: "", description: "", description_bn: "" }
      : tab === "faq" ? { question: "", answer: "", question_bn: "", answer_bn: "" } : { en: "", bn: "" };
  const addOne = () => { setList([...list, blank()]); setOpen(list.length); };

  const addPasted = () => {
    let items: Item[] = [];
    if (tab === "faq") items = parseFaq(paste).map(({ q, a }) => ({ question: "", answer: "", question_bn: q, answer_bn: a }));
    else if (tab === "process_steps") items = parseLines(paste).map((l) => {
      const [t, ...rest] = l.split(/\s*[—–:-]\s+/);
      return { step: 0, title: "", title_bn: t, description: "", description_bn: rest.join(" — ") };
    });
    else items = parseLines(paste).map((l) => ({ bn: l, en: "" }));
    if (!items.length) { toast("error", "কিছু পাওয়া যায়নি — প্রতি লাইনে একটি করে লিখুন"); return; }
    onChange(mergeLists(value, { [tab]: items } as Partial<DetailLists>));
    toast("success", `${items.length}টি যোগ হয়েছে`);
    setPaste("");
    setPanel("");
  };

  const applyTemplate = (id: string) => {
    onChange(mergeLists(value, templateLists(id)));
    toast("success", "নমুনা বসানো হয়েছে — নিজের মতো বদলে নিন (ইংরেজি সেভের সময় নিজে থেকে হবে)");
    setPanel("");
  };

  const runAi = async () => {
    if (!serviceName?.trim()) { toast("error", "আগে সেবার নাম লিখুন"); return; }
    setPanel("ai");
    setBusy(true);
    setAiDraft(null);
    try {
      const r = await aiCatalogApi.serviceDetails({ name: serviceName, notes, parts: ["steps", "benefits", "requirements", "documents", "faq"] });
      const d = r.data.data ?? {};
      setAiDraft(d);
      setAiPick(Object.fromEntries(TABS.map((t) => [t.key, !!(d[t.key] as unknown[] | undefined)?.length])));
    } catch (e) {
      setPanel("");
      toast("error", apiErrorMessage(e, "AI লিখতে পারেনি — একটু পরে আবার চেষ্টা করুন"));
    } finally {
      setBusy(false);
    }
  };
  const acceptAi = (replace: boolean) => {
    if (!aiDraft) return;
    const chosen = Object.fromEntries(TABS.filter((t) => aiPick[t.key] && aiDraft[t.key]?.length).map((t) => [t.key, aiDraft[t.key]])) as Partial<DetailLists>;
    onChange(replace ? { ...value, ...chosen, process_steps: renumber((chosen.process_steps as Step[]) ?? value.process_steps) } : mergeLists(value, chosen));
    toast("success", "AI-এর লেখা বসানো হয়েছে — দেখে নিয়ে সেভ করুন");
    setPanel("");
    setAiDraft(null);
  };

  const copyFrom = async (id: string) => {
    if (!id) return;
    setBusy(true);
    try {
      const src = await loadService(id);
      if (!src) throw new Error("none");
      onChange(mergeLists(value, {
        ...src,
        benefits: (src.benefits ?? []).map(toPair), requirements: (src.requirements ?? []).map(toPair),
        required_documents: (src.required_documents ?? []).map(toPair),
      }));
      toast("success", "কপি হয়েছে — একই রকম লেখা বাদ দিয়ে নতুনগুলো যোগ হয়েছে");
      setPanel("");
    } catch {
      toast("error", "ওই সেবার তথ্য আনা যায়নি");
    } finally {
      setBusy(false);
    }
  };

  const total = TABS.reduce((n, t) => n + ((value[t.key] as unknown[]) ?? []).length, 0);
  const actionBtn = "btn btn-outline btn-sm gap-1.5 min-h-11";

  return (
    <section className="rounded-xl border border-[var(--line)] overflow-hidden">
      <div className="px-3 py-3 bg-gray-50/80 dark:bg-white/5 space-y-2">
        <div>
          <p className="text-sm font-semibold text-heading">📋 আরও তথ্য <span className="text-muted font-normal">({total}টি)</span></p>
          <p className="text-[11px] text-muted">শুধু বাংলা লিখলেই হবে — ইংরেজি সেভের সময় নিজে থেকে অনুবাদ হবে। লেখায় লিংক বা ছবির লিংক দিলে সাইটে ক্লিকযোগ্য হবে।</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={actionBtn} onClick={runAi} disabled={busy}>{busy && panel === "ai" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI দিয়ে সব তৈরি</button>
          <button type="button" className={actionBtn} onClick={() => setPanel(panel === "template" ? "" : "template")}>📋 তৈরি নমুনা</button>
          {otherServices.length > 0 && <button type="button" className={actionBtn} onClick={() => setPanel(panel === "copy" ? "" : "copy")}><Copy className="w-4 h-4" /> অন্য সেবা থেকে কপি</button>}
        </div>
        {panel === "template" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DETAIL_TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => applyTemplate(t.id)} className="rounded-xl border border-[var(--line)] bg-white dark:bg-white/5 px-3 py-2.5 text-left hover:border-brand-400 min-h-11">
                <span className="text-lg">{t.icon}</span> <span className="text-sm font-medium text-heading">{t.bn}</span>
              </button>
            ))}
          </div>
        )}
        {panel === "copy" && (
          <select className="input w-full text-sm" defaultValue="" onChange={(e) => copyFrom(e.target.value)} disabled={busy} aria-label="কোন সেবা থেকে কপি">
            <option value="">— কোন সেবা থেকে কপি করবেন? —</option>
            {otherServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {panel === "ai" && (
          busy || !aiDraft ? (
            <p className="text-sm text-muted flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> AI “{serviceName}”-এর জন্য লিখছে… (৩০-৬০ সেকেন্ড)</p>
          ) : (
            <div className="rounded-xl border border-brand-200 dark:border-brand-500/30 bg-white dark:bg-white/5 p-3 space-y-2">
              <p className="text-sm font-semibold text-heading">✨ AI যা লিখেছে — কোনগুলো রাখবেন?</p>
              <div className="flex flex-wrap gap-2">
                {TABS.map((t) => {
                  const n = (aiDraft[t.key] as unknown[] | undefined)?.length ?? 0;
                  return (
                    <label key={t.key} className={cn("flex items-center gap-1.5 rounded-full border px-3 min-h-10 text-sm cursor-pointer", !n && "opacity-50")}>
                      <input type="checkbox" className="rounded" disabled={!n} checked={!!aiPick[t.key]} onChange={() => setAiPick((p) => ({ ...p, [t.key]: !p[t.key] }))} />
                      {t.icon} {t.bn} ({n})
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="btn btn-outline btn-sm min-h-11" onClick={() => setPanel("")}>বাতিল</button>
                <button type="button" className="btn btn-outline btn-sm min-h-11" onClick={() => acceptAi(true)}>আগেরগুলো বদলে দিন</button>
                <button type="button" className="btn btn-brand btn-sm min-h-11" onClick={() => acceptAi(false)}>আগেরগুলোর সাথে যোগ করুন</button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="flex overflow-x-auto border-y border-[var(--line)]" role="tablist">
        {TABS.map((t) => {
          const n = ((value[t.key] as unknown[]) ?? []).length;
          return (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setOpen(null); setPanel(panel === "paste" ? "" : panel); }}
              className={cn("flex-shrink-0 px-3 min-h-11 text-sm whitespace-nowrap border-b-2", tab === t.key ? "border-brand-600 text-brand-700 dark:text-brand-300 font-semibold" : "border-transparent text-muted")}>
              {t.icon} {t.bn} <span className="text-[11px]">({n})</span>
            </button>
          );
        })}
      </div>

      <div className="p-3 space-y-2">
        <p className="text-[11px] text-muted">{meta.hint}</p>
        {list.map((it, i) => {
          const isOpen = open === i;
          const text = itemText(tab, it) || "(খালি)";
          return (
            <div key={i} className={cn("rounded-xl border", isOpen ? "border-brand-300 dark:border-brand-500/40" : "border-[var(--line)]")}>
              <div className="flex items-center gap-1 pl-3">
                <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex-1 min-w-0 flex items-center gap-2 text-left min-h-11 py-1.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm text-heading truncate">{text}</span>
                  <ChevronDown className={cn("w-4 h-4 text-gray-400 flex-shrink-0 transition-transform", isOpen && "rotate-180")} />
                </button>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="উপরে" className="min-h-11 min-w-10 flex items-center justify-center text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="নিচে" className="min-h-11 min-w-10 flex items-center justify-center text-gray-400 hover:text-brand-600 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                <button type="button" onClick={() => { const n = [...list]; n.splice(i + 1, 0, { ...it }); setList(n); setOpen(i + 1); }} aria-label="কপি" className="min-h-11 min-w-10 flex items-center justify-center text-gray-400 hover:text-brand-600"><Copy className="w-4 h-4" /></button>
                <button type="button" onClick={() => { if (window.confirm(`“${text}” মুছবেন?`)) { setList(list.filter((_, j) => j !== i)); setOpen(null); } }} aria-label="মুছুন" className="min-h-11 min-w-10 flex items-center justify-center text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              {isOpen && (
                <div className="px-3 pb-3 space-y-3 border-t border-[var(--line)] pt-3">
                  {tab === "process_steps" && (
                    <>
                      <BnEnText label="ধাপের শিরোনাম" bn={(it as Step).title_bn} en={(it as Step).title} onBn={(v) => update(i, { title_bn: v })} onEn={(v) => update(i, { title: v })} placeholderBn="যেমন: ফাইল জমা দিন" />
                      <BnEnText label="বিবরণ" rich rows={3} bn={(it as Step).description_bn} en={(it as Step).description} onBn={(v) => update(i, { description_bn: v })} onEn={(v) => update(i, { description: v })} />
                    </>
                  )}
                  {tab === "faq" && (
                    <>
                      <BnEnText label="প্রশ্ন" bn={(it as Faq).question_bn} en={(it as Faq).question} onBn={(v) => update(i, { question_bn: v })} onEn={(v) => update(i, { question: v })} placeholderBn="যেমন: কত সময় লাগে?" />
                      <BnEnText label="উত্তর" rich rows={3} bn={(it as Faq).answer_bn} en={(it as Faq).answer} onBn={(v) => update(i, { answer_bn: v })} onEn={(v) => update(i, { answer: v })} />
                    </>
                  )}
                  {tab !== "process_steps" && tab !== "faq" && (
                    <BnEnText label={meta.add} bn={toPair(it).bn} en={toPair(it).en} onBn={(v) => update(i, { ...toPair(it), bn: v })} onEn={(v) => update(i, { ...toPair(it), en: v })} />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && <p className="text-sm text-muted rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2">এখনো কিছু নেই — নিচের বোতাম, “তৈরি নমুনা” বা “AI দিয়ে সব তৈরি” ব্যবহার করুন।</p>}

        {panel === "paste" ? (
          <div className="space-y-2 rounded-xl border border-dashed border-[var(--line)] p-3">
            <p className="text-[11px] text-muted">
              {tab === "faq" ? "প্রশ্নের লাইন “?” দিয়ে শেষ করুন, পরের লাইনে উত্তর। যেমন:\nকত সময় লাগে?\nসাধারণত একই দিনে।" : tab === "process_steps" ? "প্রতি লাইনে একটি ধাপ। বিবরণ দিতে চাইলে: শিরোনাম — বিবরণ" : "প্রতি লাইনে একটি করে লিখুন বা পেস্ট করুন।"}
            </p>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} className="input w-full text-sm" dir="auto" aria-label="একসাথে পেস্ট" />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline btn-sm min-h-11" onClick={() => setPanel("")}><X className="w-4 h-4" /> বাতিল</button>
              <button type="button" className="btn btn-brand btn-sm min-h-11" onClick={addPasted}>যোগ করুন</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addOne} className="btn btn-brand btn-sm gap-1.5 min-h-11"><Plus className="w-4 h-4" /> নতুন {meta.add}</button>
            <button type="button" onClick={() => setPanel("paste")} className="btn btn-outline btn-sm gap-1.5 min-h-11"><ClipboardPaste className="w-4 h-4" /> একসাথে অনেক</button>
          </div>
        )}
      </div>
    </section>
  );
}
