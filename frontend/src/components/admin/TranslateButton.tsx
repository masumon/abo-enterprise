"use client";

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { translateBnToEn, translateEnToBn } from "@/lib/translate";
import { useToastStore } from "@/store/toast";

interface Props {
  /** Bangla source text to translate. */
  bn?: string | null;
  /** Called with the English translation on success. */
  onResult: (english: string) => void;
  /** Button label. Defaults to "→ English". */
  label?: string;
  className?: string;
  /** Extra disabled condition (e.g. another field mid-translate). */
  disabled?: boolean;
  /** Optional reverse direction: pass the English text and a setter for the Bangla
   * field to also show a "→ বাংলা" button (write English, get Bangla). */
  en?: string | null;
  onResultBn?: (bangla: string) => void;
}

/**
 * Small inline "→ English" button dropped next to any English admin field.
 * Reads the sibling Bangla value and fills the English one — the same
 * Bangla-first flow the blog editor uses, now reusable across every module.
 */
export default function TranslateButton({ bn, onResult, label = "→ English", className, disabled, en, onResultBn }: Props) {
  const toast = useToastStore((s) => s.push);
  const [loading, setLoading] = useState(false);
  const empty = !(bn ?? "").trim();
  const [loadingBn, setLoadingBn] = useState(false);
  const emptyEn = !(en ?? "").trim();
  const cls =
    className ??
    "inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed max-[899px]:min-h-[40px] max-[899px]:px-1.5";

  const runBn = async () => {
    if (emptyEn || loadingBn || !onResultBn) return;
    setLoadingBn(true);
    try {
      onResultBn(await translateEnToBn(en!));
    } catch {
      toast("error", "অনুবাদ করা যায়নি — একটু পরে আবার চেষ্টা করুন বা বাংলা নিজে লিখুন");
    } finally {
      setLoadingBn(false);
    }
  };

  const run = async () => {
    if (empty || loading) return;
    setLoading(true);
    try {
      onResult(await translateBnToEn(bn!));
    } catch {
      toast("error", "অনুবাদ করা যায়নি — একটু পরে আবার চেষ্টা করুন বা ইংরেজি নিজে লিখুন");
    } finally {
      setLoading(false);
    }
  };

  const main = (
    <button
      type="button"
      onClick={run}
      disabled={empty || loading || disabled}
      title={empty ? "আগে বাংলা লিখুন" : "বাংলা থেকে ইংরেজি অনুবাদ"}
      className={cls}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
      {label}
    </button>
  );
  if (!onResultBn) return main;
  return (
    <span className="inline-flex items-center gap-2 flex-shrink-0">
      <button
        type="button"
        onClick={runBn}
        disabled={emptyEn || loadingBn || disabled}
        title={emptyEn ? "আগে ইংরেজি লিখুন" : "ইংরেজি থেকে বাংলা অনুবাদ"}
        className={cls}
      >
        {loadingBn ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
        {className ? "BN" : "→ বাংলা"}
      </button>
      {main}
    </span>
  );
}
