"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { asArray, asNumber, asObject } from "@/lib/safeData";
import { useToastStore } from "@/store/toast";

interface FeedItem { severity: "error" | "warning" | "info"; kind: string; at: string; text: string }

const SEV: Record<string, { label: string; tone: string }> = {
  error: { label: "জরুরি", tone: "text-red-700 bg-red-50" },
  warning: { label: "সতর্কতা", tone: "text-amber-700 bg-amber-50" },
  info: { label: "তথ্য", tone: "text-brand-700 bg-brand-50" },
};

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const n = (v: number) => Math.round(v).toLocaleString("bn-BD");
  if (s < 90) return "এইমাত্র";
  if (s < 5400) return `${n(s / 60)} মিনিট আগে`;
  if (s < 172800) return `${n(s / 3600)} ঘণ্টা আগে`;
  return `${n(s / 86400)} দিন আগে`;
}

/** Live operations feed (failed emails/payments, runtime errors…) — moved
 * here from Analytics → Operations so all alerts live in one module. */
export default function SystemAlerts() {
  const toast = useToastStore((s) => s.push);
  const [feed, setFeed] = useState<{ items: FeedItem[]; counts: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/v1/admin/ops/notifications");
      const f = asObject<{ items: FeedItem[]; counts: Record<string, number> }>(r?.data?.data);
      setFeed({ items: asArray<FeedItem>(f.items), counts: asObject<Record<string, number>>(f.counts) as Record<string, number> });
    } catch (e) {
      toast("error", apiErrorMessage(e, "সিস্টেম সতর্কতা আনা যায়নি"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="admin-card p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="text-sm text-gray-600">
          {feed ? <>জরুরি {asNumber(feed.counts.error).toLocaleString("bn-BD")} · সতর্কতা {asNumber(feed.counts.warning).toLocaleString("bn-BD")} · তথ্য {asNumber(feed.counts.info).toLocaleString("bn-BD")}</> : "সার্ভার, ইমেইল ও পেমেন্টের সাম্প্রতিক সমস্যা"}
        </p>
        <button type="button" onClick={load} disabled={loading} className="btn btn-outline btn-sm min-h-11 gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden /> আবার দেখুন
        </button>
      </div>
      {loading && !feed ? (
        <div className="h-24 bg-gray-50 rounded-lg animate-pulse" />
      ) : !feed?.items.length ? (
        <p className="text-sm text-emerald-700 py-6 text-center flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" aria-hidden /> সব ঠিক আছে — কোনো সতর্কতা নেই
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {feed.items.map((n, i) => (
            <li key={i} className="flex items-start gap-3 py-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md flex-none mt-0.5 ${(SEV[n.severity] ?? SEV.info).tone}`}>{(SEV[n.severity] ?? SEV.info).label}</span>
              <span className="flex-1 text-sm text-gray-700 break-words leading-relaxed">{n.text}</span>
              <span className="text-xs text-gray-500 flex-none whitespace-nowrap">{ago(n.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
