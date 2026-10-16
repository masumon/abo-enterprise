"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Copy, Loader2, PlugZap } from "lucide-react";
import api, { adminApi } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/apiBase";
import { useToastStore } from "@/store/toast";
import type { ApiResponse } from "@/types";

/** Steadfast keys live in site settings (same keys as before — moved here from
 * Settings so every courier field is on the courier page). */
const HIDDEN = "***HIDDEN***";
const SECRET_KEYS = ["steadfast_api_key", "steadfast_secret_key", "steadfast_webhook_token"] as const;
const KEYS = ["steadfast_enabled", ...SECRET_KEYS, "steadfast_delivery_type", "steadfast_base_url"] as const;
const DEFAULT_BASE = "https://portal.packzy.com/api/v1";

const errText = (e: unknown, fb: string): string => {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" && d ? d : fb;
};

export default function SteadfastSettings({ onChanged }: { onChanged: () => void }) {
  const toast = useToastStore((s) => s.push);
  const [saved, setSaved] = useState<Record<string, string> | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const webhookUrl = `${getApiBaseUrl()}/api/v1/orders/steadfast/webhook`;

  useEffect(() => {
    adminApi.getSettings()
      .then((r) => {
        const all = r.data.data ?? {};
        setSaved(Object.fromEntries(KEYS.map((k) => [k, all[k] ?? ""])));
      })
      .catch(() => setSaved({}));
  }, []);

  if (!saved) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-600" aria-label="লোড হচ্ছে" /></div>;

  const val = (k: string) => vals[k] ?? (SECRET_KEYS.includes(k as never) ? "" : saved[k]);
  const isSet = (k: string) => !!saved[k] && saved[k] !== "";
  const enabled = (vals.steadfast_enabled ?? saved.steadfast_enabled) === "true";

  const persist = async (patch: Record<string, string>) => {
    // Secrets: an empty box means "keep the saved one".
    const items = Object.entries(patch)
      .filter(([k, v]) => !(SECRET_KEYS.includes(k as never) && (!v.trim() || v === HIDDEN)))
      .map(([key, value]) => ({ key, value: value.trim(), data_type: key === "steadfast_enabled" ? "boolean" : "string" }));
    if (items.length) await adminApi.upsertSettings(items);
    setSaved((s) => ({ ...s, ...Object.fromEntries(items.map((i) => [i.key, SECRET_KEYS.includes(i.key as never) ? HIDDEN : i.value])) }));
    setVals({});
  };

  const toggle = async (on: boolean) => {
    try {
      await persist({ steadfast_enabled: on ? "true" : "false" });
      toast("success", on ? "Steadfast চালু হয়েছে" : "Steadfast বন্ধ হয়েছে");
      onChanged();
    } catch (e) {
      toast("error", errText(e, "বদলানো যায়নি"));
    }
  };

  const saveAndTest = async () => {
    setBusy(true);
    setResult(null);
    try {
      await persist(vals);
      const r = await api.post<ApiResponse<{ ok: boolean }>>("/api/v1/admin/couriers/steadfast/test", {}, { timeout: 60000 });
      setResult({ ok: true, text: r.data.message || "সংযোগ সফল" });
    } catch (e) {
      setResult({ ok: false, text: errText(e, "পরীক্ষা ব্যর্থ — Key দেখে আবার চেষ্টা করুন") });
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(webhookUrl); toast("success", "কপি হয়েছে"); }
    catch { toast("error", "কপি করা যায়নি"); }
  };

  const field = (k: string, label: string, hint?: string) => (
    <label className="text-sm block">
      {label}{SECRET_KEYS.includes(k as never) && isSet(k) && <span className="text-xs text-emerald-700"> (সংরক্ষিত — বদলাতে নতুনটি লিখুন)</span>}
      <input className="input w-full min-h-11 text-base" type={SECRET_KEYS.includes(k as never) ? "password" : "text"} autoComplete="off"
        placeholder={SECRET_KEYS.includes(k as never) && isSet(k) ? "••••••••" : k === "steadfast_base_url" ? DEFAULT_BASE : ""}
        value={val(k)} onChange={(e) => setVals((m) => ({ ...m, [k]: e.target.value }))} />
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm min-h-11 cursor-pointer">
        <input type="checkbox" className="w-5 h-5" checked={enabled} onChange={(e) => toggle(e.target.checked)} />
        Steadfast চালু
      </label>
      {field("steadfast_api_key", "API Key", "Steadfast → Profile → API পেজের Api-Key।")}
      {field("steadfast_secret_key", "Secret Key", "একই পেজের Secret-Key। ⚠️ Key কোথাও শেয়ার হয়ে গেলে Steadfast-এ “Regenerate Key” চেপে নতুন নিন।")}
      <label className="text-sm block">ডেলিভারি টাইপ
        <select className="input w-full min-h-11 text-base" value={val("steadfast_delivery_type") || "0"} onChange={(e) => setVals((m) => ({ ...m, steadfast_delivery_type: e.target.value }))}>
          <option value="0">বাসায় ডেলিভারি (Home Delivery)</option>
          <option value="1">হাব থেকে নেওয়া (Point / Hub Pickup)</option>
        </select>
      </label>
      <details className="rounded-lg bg-gray-50 p-3 text-sm group">
        <summary className="cursor-pointer min-h-11 flex items-center gap-1 font-medium list-none">
          ডেলিভারি স্ট্যাটাস নিজে আপডেট (Webhook) ও উন্নত <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" aria-hidden />
        </summary>
        <div className="space-y-3 pt-1">
          <p className="text-gray-700">Steadfast প্যানেলে <b>Callback Url</b> হিসেবে এটি বসান, আর <b>Auth Token (Bearer)</b> হিসেবে নিচের টোকেনটিই দিন — তাহলে delivered/hold/cancelled নিজে থেকেই অর্ডারে আসবে।</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 break-all rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs">{webhookUrl}</code>
            <button type="button" onClick={copy} className="btn btn-outline btn-sm min-h-11 gap-1.5 flex-none"><Copy className="w-4 h-4" aria-hidden /> কপি</button>
          </div>
          {field("steadfast_webhook_token", "Webhook Auth Token", "নিজে একটি গোপন শব্দ বানিয়ে দিন — Steadfast-এও হুবহু একই দেবেন।")}
          {field("steadfast_base_url", "API Base URL", "সাধারণত বদলানোর দরকার নেই — খালি রাখলে ডিফল্ট চলবে।")}
        </div>
      </details>
      <button type="button" disabled={busy} onClick={saveAndTest} className="btn btn-brand min-h-11 px-5 gap-1.5 w-full sm:w-auto justify-center">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <PlugZap className="w-4 h-4" aria-hidden />} সংরক্ষণ ও পরীক্ষা করুন
      </button>
      {result && (
        <p role="status" className={`text-sm rounded-lg p-2 ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {result.ok ? "✓ " : "⚠️ "}{result.text}
        </p>
      )}
    </div>
  );
}
