"use client";

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { translateBnToEn } from "@/lib/translate";
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
}

/**
 * Small inline "→ English" button dropped next to any English admin field.
 * Reads the sibling Bangla value and fills the English one — the same
 * Bangla-first flow the blog editor uses, now reusable across every module.
 */
export default function TranslateButton({ bn, onResult, label = "→ English", className, disabled }: Props) {
  const toast = useToastStore((s) => s.push);
  const [loading, setLoading] = useState(false);
  const empty = !(bn ?? "").trim();

  const run = async () => {
    if (empty || loading) return;
    setLoading(true);
    try {
      onResult(await translateBnToEn(bn!));
    } catch {
      toast("error", "অনুবাদ ব্যর্থ — আবার চেষ্টা করুন বা ইংরেজি নিজে লিখুন");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={empty || loading || disabled}
      title={empty ? "আগে বাংলা লিখুন" : "বাংলা থেকে ইংরেজি অনুবাদ"}
      className={
        className ??
        "inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
      }
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
      {label}
    </button>
  );
}
