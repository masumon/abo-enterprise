"use client";

import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { aiCatalogApi, type LinkDraft } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

/**
 * "Fill from a link": paste a supplier / maker page and get a draft (name,
 * description, specs, photo, tags). Nothing is saved until the admin saves.
 */
export default function LinkImportBox({ kind, onDraft }: { kind: "product" | "service"; onDraft: (d: LinkDraft) => void }) {
  const toast = useToastStore((s) => s.push);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!/^(https?:\/\/|www\.)\S+\.\S+/i.test(url.trim())) { toast("error", "সঠিক ওয়েব লিংক দিন (https://…)"); return; }
    setBusy(true);
    try {
      const r = await aiCatalogApi.fromLink({ url: url.trim(), kind });
      const d = r.data.data;
      if (!d) throw new Error("empty");
      onDraft(d);
      toast("success", d.ai_used ? "লিংক থেকে খসড়া তৈরি হয়েছে — দেখে নিয়ে সেভ করুন" : "পাতার নাম, বিবরণ ও ছবি বসানো হয়েছে (AI চালু থাকলে আরও ভালো হয়)");
      setOpen(false);
      setUrl("");
    } catch (e) {
      toast("error", apiErrorMessage(e, "লিংক থেকে তথ্য আনা যায়নি"));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline btn-sm gap-1.5 min-h-11">
        <Link2 className="w-4 h-4" /> লিংক থেকে পূরণ
      </button>
    );
  }
  return (
    <div className="w-full rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/40 dark:bg-brand-500/5 p-3 space-y-2">
      <p className="text-sm font-semibold text-heading">🔗 লিংক থেকে পূরণ</p>
      <p className="text-[11px] text-muted">সরবরাহকারী বা প্রস্তুতকারকের {kind === "product" ? "পণ্যের" : "সেবার"} পাতার লিংক দিন — নাম, বিবরণ, স্পেসিফিকেশন ও ছবি নিজে থেকে বসবে। দাম অবশ্যই নিজে যাচাই করে দিন।</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://…" className="input flex-1 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void run(); } }} aria-label="পাতার লিংক" />
        <div className="flex gap-2">
          <button type="button" onClick={run} disabled={busy} className="btn btn-brand btn-sm gap-1.5 min-h-11 flex-1">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {busy ? "আনছে…" : "আনুন"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-outline btn-sm min-h-11">বাতিল</button>
        </div>
      </div>
    </div>
  );
}
