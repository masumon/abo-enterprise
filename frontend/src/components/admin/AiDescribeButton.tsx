"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { aiCatalogApi, type AiDescription } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useAiAvailable } from "@/lib/useAiAvailable";
import { useToastStore } from "@/store/toast";

interface Props {
  kind: "product" | "service" | "software" | "showcase";
  /** Current name (Bangla or English). */
  name?: string | null;
  /** Short notes the owner typed (features, brand, size…). Optional. */
  notes?: string | null;
  /** Receives the AI text; the form decides which fields to fill. */
  onResult: (d: AiDescription) => void;
  className?: string;
}

/**
 * "AI দিয়ে বিবরণ লিখুন" — writes Bangla + English description, feature bullets
 * and FAQ from the name and notes. Hidden when no Google AI key is configured.
 * Only the product/service name and the owner's notes are sent — never customer data.
 */
export default function AiDescribeButton({ kind, name, notes, onResult, className }: Props) {
  const available = useAiAvailable();
  const toast = useToastStore((s) => s.push);
  const [loading, setLoading] = useState(false);
  if (!available) return null;

  const run = async () => {
    const n = (name ?? "").trim();
    if (n.length < 2) { toast("error", "আগে নাম লিখুন — তারপর AI বিবরণ লিখবে"); return; }
    setLoading(true);
    try {
      const r = await aiCatalogApi.describe({ kind, name: n, notes: (notes ?? "").slice(0, 1500) });
      onResult(r.data.data);
      toast("success", "AI বিবরণ বসানো হয়েছে — সেভ করার আগে পড়ে দেখুন");
    } catch (e) {
      toast("error", apiErrorMessage(e, "AI এখন বিবরণ লিখতে পারছে না — একটু পরে চেষ্টা করুন"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      className={className ?? "btn btn-outline btn-sm gap-1.5"}
      title="নাম ও নোট থেকে বাংলা + ইংরেজি বিবরণ, বৈশিষ্ট্য ও প্রশ্নোত্তর লিখবে (খালি ঘরগুলো পূরণ হবে)"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      AI দিয়ে বিবরণ লিখুন
    </button>
  );
}
