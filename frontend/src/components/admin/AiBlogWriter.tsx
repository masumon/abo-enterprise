"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { adminBlogApi, aiCatalogApi, type AiBlogDraft } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { shortId, toSlug } from "@/lib/catalogAdminApi";
import RichText from "@/components/ui/RichText";
import { useToastStore } from "@/store/toast";
import type { BlogPost } from "@/types";

/**
 * AI blog writer: a short idea (and optionally a photo) → a full, structured
 * Bangla + English blog post, plus the products/services worth featuring under
 * it. Saved only as a DRAFT, then opened in the blog editor for a final check.
 */
export default function AiBlogWriter({ onSaved }: { onSaved?: (id: string) => void }) {
  const toast = useToastStore((s) => s.push);
  const [idea, setIdea] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"" | "write" | "save">("");
  const [draft, setDraft] = useState<AiBlogDraft | null>(null);
  const [pick, setPick] = useState<Record<string, boolean>>({});
  const [lang, setLang] = useState<"bn" | "en">("bn");

  const write = async () => {
    setBusy("write");
    try {
      const r = await aiCatalogApi.blogDraft(idea, file);
      const d = r.data.data!;
      setDraft(d);
      setPick(Object.fromEntries(d.suggested.map((x) => [x.id, true])));
    } catch (e) {
      toast("error", apiErrorMessage(e, "AI ব্লগ লিখতে পারেনি — AI সেটিংস দেখুন বা আবার চেষ্টা করুন"));
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy("save");
    try {
      const chosen = draft.suggested.filter((x) => pick[x.id]);
      const r = await adminBlogApi.create({
        slug: `${toSlug(draft.title_en || "blog") || "blog"}-${shortId()}`,
        title_en: draft.title_en, title_bn: draft.title_bn, content_en: draft.content_en, content_bn: draft.content_bn,
        excerpt_en: draft.excerpt_en, excerpt_bn: draft.excerpt_bn, category: draft.category, tags: draft.tags,
        seo_title: draft.seo_title, seo_description: draft.seo_description, status: "draft",
        product_ids: chosen.filter((x) => x.kind === "product").map((x) => x.id),
        service_ids: chosen.filter((x) => x.kind === "service").map((x) => x.id),
      } as Partial<BlogPost>);
      const id = String((r.data.data as { id?: string } | undefined)?.id ?? "");
      toast("success", "ব্লগ খসড়া হিসেবে সেভ হয়েছে — দেখে নিয়ে প্রকাশ করুন");
      setDraft(null); setIdea(""); setFile(null);
      if (onSaved) onSaved(id);
      else if (id) window.location.href = `/sumon/blog?edit=${id}`;
    } catch (e) {
      toast("error", apiErrorMessage(e, "সেভ হয়নি"));
    } finally {
      setBusy("");
    }
  };

  if (draft) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-heading">📰 AI-এর লেখা ব্লগ — দেখে নিন</p>
          <div className="inline-flex rounded-lg border border-[var(--line)] p-0.5">
            {(["bn", "en"] as const).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={`px-3 min-h-9 rounded-md text-xs ${lang === l ? "bg-brand-600 text-white" : ""}`}>{l === "bn" ? "বাংলা" : "English"}</button>)}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] p-3 max-h-[45vh] overflow-y-auto space-y-2">
          <h3 className="text-lg font-bold text-heading">{lang === "bn" ? draft.title_bn : draft.title_en}</h3>
          <p className="text-sm text-muted">{lang === "bn" ? draft.excerpt_bn : draft.excerpt_en}</p>
          <RichText text={lang === "bn" ? draft.content_bn : draft.content_en} className="space-y-2 text-sm leading-6" />
        </div>
        {draft.suggested.length > 0 && (
          <div className="rounded-xl bg-brand-50/50 dark:bg-brand-500/10 p-3 space-y-2">
            <p className="text-xs font-semibold text-heading">🔗 ব্লগের নিচে যা দেখাবে (AI-এর প্রস্তাব)</p>
            {draft.why_bn && <p className="text-[11px] text-muted">{draft.why_bn}</p>}
            <div className="flex flex-wrap gap-1.5">
              {draft.suggested.map((x) => (
                <label key={x.id} className={`flex items-center gap-1.5 rounded-full border px-3 min-h-10 text-xs cursor-pointer ${pick[x.id] ? "border-brand-500 bg-white dark:bg-white/10" : "border-[var(--line)] opacity-60"}`}>
                  <input type="checkbox" checked={!!pick[x.id]} onChange={() => setPick((p) => ({ ...p, [x.id]: !p[x.id] }))} />
                  {x.kind === "product" ? "🛒" : "🛠️"} {x.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <p className="text-[11px] text-muted">ক্যাটাগরি: {draft.category} · ট্যাগ: {draft.tags.join(", ") || "—"} · SEO নিজে থেকে পূরণ হয়েছে</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setDraft(null)} className="btn btn-outline btn-sm min-h-11">আবার লিখুন</button>
          <button type="button" onClick={save} disabled={!!busy} className="btn btn-brand btn-sm min-h-11 gap-1.5">{busy === "save" && <Loader2 className="w-4 h-4 animate-spin" />} খসড়া হিসেবে সেভ করুন</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={4} dir="auto" className="input w-full text-sm" aria-label="ব্লগের বিষয়"
        placeholder="অল্প কথায় লিখুন — যেমন: “৩৩W ফাস্ট চার্জার কেনার আগে যা জানা দরকার” বা “ফটোকপি ও প্রিন্টিং সেবার সুবিধা”" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn btn-outline btn-sm min-h-11 gap-1.5 cursor-pointer">
          <ImagePlus className="w-4 h-4" /> {file ? "ছবি বদলান" : "ছবি দিন (ঐচ্ছিক)"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {file && <span className="text-xs text-muted flex items-center gap-1">{file.name}<button type="button" onClick={() => setFile(null)} aria-label="ছবি সরান"><X className="w-3.5 h-3.5" /></button></span>}
      </div>
      <button type="button" onClick={write} disabled={!!busy || idea.trim().length < 3} className="btn btn-brand w-full min-h-11 gap-2">
        {busy === "write" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {busy === "write" ? "AI ব্লগ লিখছে… (৩০-৯০ সেকেন্ড)" : "ব্লগ লিখুন"}
      </button>
      <p className="text-[11px] text-muted">AI বাংলা ও ইংরেজিতে পূর্ণ ব্লগ (শিরোনাম, অংশ, তালিকা, শেষে আহ্বান) লিখবে আর কোন পণ্য/সেবা নিচে দেখানো যায় তা বলবে। সেভ হবে শুধু খসড়া হিসেবে।</p>
    </div>
  );
}
