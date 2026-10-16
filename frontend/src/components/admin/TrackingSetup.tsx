"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PlugZap, XCircle } from "lucide-react";
import api, { adminApi } from "@/lib/api";
import { asObject } from "@/lib/safeData";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import StatusCard, { type StatusState } from "@/components/admin/StatusCard";

/** Google Analytics (GA4) and Facebook Pixel: enter the ID, save, and press "পরীক্ষা করুন".
 * Same settings keys the website already reads (seo_ga4_id, facebook_pixel_id). */
type Line = { ok: boolean; text: string };
const GA_RE = /^G-[A-Z0-9]{6,}$/i;
const PX_RE = /^\d{8,20}$/;

async function reachable(url: string): Promise<boolean> {
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store" });
    return true;
  } catch {
    return false;
  }
}

export default function TrackingSetup() {
  const toast = useToastStore((s) => s.push);
  const [ga, setGa] = useState("");
  const [px, setPx] = useState("");
  const [saved, setSaved] = useState({ ga: "", px: "" });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<"" | "ga" | "px">("");
  const [res, setRes] = useState<{ ga?: Line[]; px?: Line[] }>({});

  useEffect(() => {
    adminApi.getSettings()
      .then((r) => {
        const s = r.data.data ?? {};
        const g = String(s.seo_ga4_id ?? "").trim(), p = String(s.facebook_pixel_id ?? "").trim();
        setGa(g); setPx(p); setSaved({ ga: g, px: p });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = async (which: "ga" | "px") => {
    const item = which === "ga"
      ? { key: "seo_ga4_id", value: ga.trim().toUpperCase(), data_type: "string" }
      : { key: "facebook_pixel_id", value: px.trim(), data_type: "string" };
    await adminApi.upsertSettings([item]);
    setSaved((s) => ({ ...s, [which]: item.value }));
    if (which === "ga") setGa(item.value);
  };

  const test = async (which: "ga" | "px") => {
    setBusy(which);
    const lines: Line[] = [];
    const id = (which === "ga" ? ga : px).trim();
    try {
      if (!id) { lines.push({ ok: false, text: "আইডি দেওয়া হয়নি — ঘরে আইডি বসান" }); return; }
      const valid = which === "ga" ? GA_RE.test(id) : PX_RE.test(id);
      lines.push(valid
        ? { ok: true, text: "আইডির ধরন ঠিক আছে" }
        : { ok: false, text: which === "ga" ? "GA4 আইডি “G-” দিয়ে শুরু হয় (যেমন G-AB12CD34EF) — “UA-” পুরোনো ধরন চলে না" : "Pixel আইডি শুধু সংখ্যা, ৮–২০ অঙ্কের" });
      if (!valid) return;
      await save(which);
      lines.push({ ok: true, text: "সংরক্ষিত হয়েছে — ওয়েবসাইট ১ মিনিটের মধ্যে এটি ব্যবহার করবে" });
      // The site reads this through the public settings API — confirm it is really visible there.
      const pub = await api.get<{ data: Record<string, string> }>("/api/v1/settings", { params: { _t: Date.now() } }).catch(() => null);
      const seen = String(pub?.data?.data?.[which === "ga" ? "seo_ga4_id" : "facebook_pixel_id"] ?? "").trim();
      lines.push(seen === (which === "ga" ? id.toUpperCase() : id)
        ? { ok: true, text: "ওয়েবসাইট আইডিটি পাচ্ছে" }
        : { ok: false, text: "ওয়েবসাইট এখনো আইডিটি পায়নি — কয়েক সেকেন্ড পর আবার পরীক্ষা করুন" });
      const url = which === "ga" ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}` : "https://connect.facebook.net/en_US/fbevents.js";
      lines.push(await reachable(url)
        ? { ok: true, text: `${which === "ga" ? "Google" : "Facebook"}-এর ট্র্যাকিং ফাইল এই ব্রাউজারে পৌঁছাচ্ছে` }
        : { ok: false, text: `${which === "ga" ? "Google" : "Facebook"}-এর ট্র্যাকিং ফাইল পৌঁছাচ্ছে না — আপনার ব্রাউজারের অ্যাড-ব্লকার/ইন্টারনেট দেখুন` });
      if (which === "ga") {
        const h = await api.get("/api/v1/admin/ops/health").catch(() => null);
        const g = asObject<Record<string, { ok?: boolean; detail?: string; message?: string }>>(asObject<{ checks?: unknown }>(h?.data?.data).checks).ga4;
        lines.push(g
          ? (g.ok ? { ok: true, text: "GA4 ডেটা সংযোগ চালু — ভিজিটর পরিসংখ্যান অ্যাডমিনে আসছে" } : { ok: false, text: `GA4 ডেটা সংযোগে সমস্যা: ${g.detail || g.message || "সংযুক্ত নয়"} (শুধু অ্যাডমিনের পরিসংখ্যান পেজে প্রভাব, ভিজিটর গোনায় নয়)` })
          : { ok: false, text: "GA4 ডেটা সংযোগের তথ্য পাওয়া যায়নি" });
      }
      lines.push({ ok: true, text: "মনে রাখুন: ভিজিটর কুকিতে অনুমতি দিলে তবেই গোনা শুরু হয়" });
    } catch (e) {
      lines.push({ ok: false, text: apiErrorMessage(e, "পরীক্ষা করা যায়নি") });
      toast("error", "পরীক্ষা সম্পন্ন হয়নি");
    } finally {
      setRes((r) => ({ ...r, [which]: lines }));
      setBusy("");
    }
  };

  if (!loaded) return <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500" aria-label="লোড হচ্ছে" /></div>;

  const state = (which: "ga" | "px"): StatusState => {
    const lines = res[which];
    if (lines) return lines.slice(0, -1).every((l) => l.ok) ? "ok" : "error";
    return (which === "ga" ? saved.ga : saved.px) ? "ok" : "todo";
  };
  const card = (which: "ga" | "px") => {
    const isGa = which === "ga";
    const val = isGa ? ga : px;
    const lines = res[which];
    return (
      <StatusCard
        key={which}
        id={`tracking-${which}`}
        state={state(which)}
        title={isGa ? "Google Analytics (GA4)" : "Facebook Pixel"}
        subtitle={isGa ? "কতজন সাইটে আসছেন ও কী দেখছেন" : "ফেসবুক বিজ্ঞাপনের ফল মাপা"}
        leading={<span aria-hidden className={`w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center flex-none ${isGa ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-blue-500 to-blue-700"}`}>{isGa ? "G" : "f"}</span>}
      >
        <label className="text-sm block">{isGa ? "Measurement ID" : "Pixel ID"}
          <input className="input w-full min-h-11 text-base font-mono" autoComplete="off" value={val}
            placeholder={isGa ? "G-XXXXXXXXXX" : "123456789012345"}
            onChange={(e) => (isGa ? setGa(e.target.value) : setPx(e.target.value))} />
          <span className="block text-xs text-gray-500 mt-1">{isGa
            ? "analytics.google.com → Admin → Data streams → আপনার ওয়েবসাইট → “Measurement ID”।"
            : "Meta Events Manager → Data sources → আপনার Pixel → ID (শুধু সংখ্যা)।"}</span>
        </label>
        <button type="button" disabled={!!busy} onClick={() => void test(which)} className="btn btn-brand min-h-11 px-5 gap-1.5 w-full sm:w-auto justify-center">
          {busy === which ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <PlugZap className="w-4 h-4" aria-hidden />} সংরক্ষণ ও পরীক্ষা করুন
        </button>
        {lines && (
          <ul className="space-y-1.5" role="status">
            {lines.map((l, i) => (
              <li key={i} className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${l.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300"}`}>
                {l.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-none" aria-hidden /> : <XCircle className="w-4 h-4 mt-0.5 flex-none" aria-hidden />}
                <span className="break-words">{l.text}</span>
              </li>
            ))}
          </ul>
        )}
      </StatusCard>
    );
  };

  return <div className="grid lg:grid-cols-2 gap-4">{card("ga")}{card("px")}</div>;
}
