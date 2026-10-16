"use client";

import StatusCard from "@/components/admin/StatusCard";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Loader2, PlugZap, Truck, Zap } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import type { ApiResponse } from "@/types";
import SteadfastSettings from "./SteadfastSettings";
import TrackingLinks from "./TrackingLinks";

type Field = { key: string; label: string; secret: boolean; value: string; set: boolean };
type Provider = { key: string; label: string; note: string; sandbox_supported: boolean; enabled: boolean | null; sandbox: boolean; ready: boolean; fields: Field[] };
type Data = { mode: "auto" | "manual"; default: string; providers: Provider[]; soon: string[]; undo_seconds: number };

/** Where each courier's keys live — plain Bangla steps + the official panel link. */
const GUIDE: Record<string, { link: string; linkLabel: string; steps: string[]; color: string; letter: string }> = {
  steadfast: {
    link: "https://steadfast.com.bd", linkLabel: "Steadfast", color: "from-emerald-500 to-teal-600", letter: "S",
    steps: ["Steadfast মার্চেন্ট প্যানেলে লগইন করুন → API অংশ খুলুন।", "API Key ও Secret Key কপি করে নিচের ঘরে বসান।", "“সংরক্ষণ ও পরীক্ষা করুন” চাপুন — সফল হলে “প্রস্তুত” দেখাবে।"],
  },
  pathao: {
    link: "https://merchant.pathao.com", linkLabel: "Pathao Merchant", color: "from-red-500 to-rose-600", letter: "P",
    steps: ["Pathao মার্চেন্ট প্যানেলে লগইন করুন → Developers API অংশ খুলুন।", "Client ID ও Client Secret কপি করুন; আপনার মার্চেন্ট লগইন ইমেইল ও পাসওয়ার্ডও লাগবে।", "নিচে বসিয়ে “সংরক্ষণ ও পরীক্ষা” চাপুন — সফল হলে আপনার Store ID দেখাবে, সেটি Store ID ঘরে বসান।"],
  },
  redx: {
    link: "https://redx.com.bd", linkLabel: "RedX", color: "from-rose-600 to-red-700", letter: "R",
    steps: ["RedX মার্চেন্ট প্যানেলে লগইন করুন → API / Developer অংশ থেকে Access Token নিন।", "নিচে বসিয়ে “সংরক্ষণ ও পরীক্ষা” চাপুন।", "পিকআপ স্টোর একাধিক থাকলে Store ID দিন (ঐচ্ছিক)।"],
  },
};

const errText = (e: unknown, fb: string): string => {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" && d ? d : fb;
};

export default function CouriersPage() {
  const toast = useToastStore((s) => s.push);
  const [data, setData] = useState<Data | null>(null);
  const [vals, setVals] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const jumped = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<ApiResponse<Data>>("/api/v1/admin/couriers");
      setData(r.data.data ?? null);
    } catch (e) {
      toast("error", errText(e, "কুরিয়ারের তথ্য আনা যায়নি"));
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  // Deep link: /sumon/couriers#pathao opens and highlights that courier's card.
  useEffect(() => {
    if (!data || jumped.current) return;
    jumped.current = true;
    const key = window.location.hash.replace("#", "");
    if (!key || !data.providers.some((p) => p.key === key)) return;
    requestAnimationFrame(() => {
      setFocusKey(key);
      document.getElementById(`courier-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => setFocusKey(null), 3500);
    });
  }, [data]);

  const save = async (patch: Record<string, unknown>, ok = "সংরক্ষিত হয়েছে") => {
    try {
      await api.put("/api/v1/admin/couriers", patch);
      toast("success", ok);
      await load();
    } catch (e) {
      toast("error", errText(e, "সংরক্ষণ করা যায়নি"));
    }
  };

  const saveAndTest = async (p: Provider) => {
    setBusy(p.key);
    try {
      await api.put("/api/v1/admin/couriers", { providers: { [p.key]: { values: vals[p.key] ?? {} } } });
      const r = await api.post<ApiResponse<{ ok: boolean }>>(`/api/v1/admin/couriers/${p.key}/test`, {}, { timeout: 60000 });
      setResult((m) => ({ ...m, [p.key]: { ok: true, text: r.data.message || "সংযোগ সফল" } }));
      await load();
    } catch (e) {
      setResult((m) => ({ ...m, [p.key]: { ok: false, text: errText(e, "পরীক্ষা ব্যর্থ — তথ্য দেখে আবার চেষ্টা করুন") } }));
    } finally {
      setBusy("");
    }
  };

  if (!data) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>;

  const def = data.providers.find((p) => p.key === data.default);
  const defReady = !!def?.ready && result[def.key]?.ok !== false;
  const done = [data.providers.some((p) => p.ready), true];

  return (
    <div className="admin-page">
      <AdminPageHeader title="Couriers" titleBn="কুরিয়ার" descriptionBn="কুরিয়ারের API বসান → পরীক্ষা করুন → স্বয়ংক্রিয় বা হাতে পাঠানো বেছে নিন" />

      {/* status */}
      <div className={`card p-4 sm:p-5 border-l-4 ${defReady ? "border-emerald-500" : "border-amber-500"}`}>
        <div className="flex items-start gap-3">
          <span className={`w-12 h-12 rounded-full flex items-center justify-center flex-none ${defReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {defReady ? <CheckCircle2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-lg ${defReady ? "text-emerald-800" : "text-amber-800"}`}>
              {defReady ? `${def?.label} প্রস্তুত` : "প্রধান কুরিয়ার এখনো যুক্ত বা পরীক্ষা করা হয়নি"}
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              <div className="rounded-lg bg-gray-50 px-3 py-2"><p className="text-xs text-gray-600">অর্ডার কনফার্ম করলে</p>
                <p className="font-semibold text-gray-900">{data.mode === "auto" ? `স্বয়ংক্রিয় — ${data.undo_seconds} সেকেন্ডে যাবে` : "হাতে — “কুরিয়ারে পাঠান” চাপলে"}</p></div>
              <div className="rounded-lg bg-gray-50 px-3 py-2"><p className="text-xs text-gray-600">প্রধান কুরিয়ার</p>
                <p className="font-semibold text-gray-900">{def?.label ?? "—"}</p></div>
            </div>
            {data.mode === "auto" && !defReady && (
              <p className="mt-2 text-sm text-amber-800">⚠️ স্বয়ংক্রিয় মোড চালু, কিন্তু প্রধান কুরিয়ার প্রস্তুত নয় — নিচে তথ্য দিয়ে পরীক্ষা করুন, নইলে অর্ডার পাঠানো যাবে না।</p>
            )}
          </div>
        </div>
      </div>

      {/* step 1+2: couriers */}
      <Step n={1} title="কুরিয়ার যুক্ত করে পরীক্ষা করুন" done={done[0]}>
        <div className="grid md:grid-cols-2 gap-4">
          {data.providers.map((p) => {
            const g = GUIDE[p.key];
            return (
              <StatusCard key={p.key} id={`courier-${p.key}`}
                state={result[p.key]?.ok === false ? "error" : p.ready ? "ok" : "todo"}
                forceOpen={focusKey === p.key}
                className={focusKey === p.key ? "!border-brand-500 ring-4 ring-brand-200" : ""}
                title={p.label}
                subtitle={result[p.key]?.ok === false ? result[p.key].text : p.ready ? "যুক্ত ও চালু — ক্লিক করলে খুলবে" : "API তথ্য বসিয়ে পরীক্ষা করুন"}
                leading={<span aria-hidden className={`w-10 h-10 rounded-xl bg-gradient-to-br ${g?.color ?? "from-gray-500 to-gray-700"} text-white font-bold flex items-center justify-center flex-none`}>{g?.letter ?? "C"}</span>}
                aside={p.enabled !== null ? (
                    <label className="flex items-center gap-2 text-sm min-h-11 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5" checked={!!p.enabled}
                        onChange={(e) => save({ providers: { [p.key]: { enabled: e.target.checked } } }, e.target.checked ? "চালু হয়েছে" : "বন্ধ হয়েছে")} />
                      চালু
                    </label>
                  ) : undefined}>
                {g && (
                  <details className="rounded-lg bg-gray-50 p-3 text-sm group" open={!p.fields.some((f) => f.set) && p.key !== "steadfast"}>
                    <summary className="cursor-pointer min-h-11 flex items-center gap-1 font-medium list-none">
                      কোথায় পাবেন? <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    </summary>
                    <ol className="list-decimal pl-5 space-y-1 text-gray-700">{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                    <a href={g.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-brand-700 underline min-h-11">{g.linkLabel} খুলুন <ExternalLink className="w-3.5 h-3.5" /></a>
                  </details>
                )}
                {p.key === "steadfast" && <SteadfastSettings onChanged={load} onResult={(ok, text) => setResult((m) => ({ ...m, steadfast: { ok, text } }))} />}
                {p.key !== "steadfast" && p.fields.map((f) => (
                  <label key={f.key} className="text-sm block">{f.label}{f.secret && f.set && <span className="text-xs text-emerald-700"> (সংরক্ষিত — বদলাতে নতুনটি লিখুন)</span>}
                    <input className="input w-full min-h-11 text-base" type={f.secret ? "password" : "text"} autoComplete="off"
                      placeholder={f.secret && f.set ? "••••••••" : ""}
                      value={vals[p.key]?.[f.key] ?? f.value}
                      onChange={(e) => setVals((m) => ({ ...m, [p.key]: { ...(m[p.key] ?? {}), [f.key]: e.target.value } }))} />
                  </label>
                ))}
                {p.sandbox_supported && (
                  <label className="flex items-start gap-2 text-sm min-h-11 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 mt-0.5" checked={p.sandbox}
                      onChange={(e) => save({ providers: { [p.key]: { sandbox: e.target.checked } } })} />
                    পরীক্ষামূলক (Sandbox) সার্ভার — আসল পার্সেল তৈরি হবে না
                  </label>
                )}
                {p.key !== "steadfast" && (
                <button type="button" disabled={!!busy} onClick={() => saveAndTest(p)} className="btn btn-brand min-h-11 px-5 gap-1.5 w-full sm:w-auto justify-center">
                  {busy === p.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
                  সংরক্ষণ ও পরীক্ষা করুন
                </button>
                )}
                {p.key !== "steadfast" && result[p.key] && (
                  <p role="status" className={`text-sm rounded-lg p-2 ${result[p.key].ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                    {result[p.key].ok ? "✓ " : "⚠️ "}{result[p.key].text}
                  </p>
                )}
              </StatusCard>
            );
          })}
        </div>
        <p className="text-sm text-gray-600">শীঘ্রই: {data.soon.join(" · ")} — অফিসিয়াল API নথি পেলে যোগ হবে। ততদিন এদের পার্সেল নিজ পোর্টালে বুক করে অর্ডারে ট্র্যাকিং নম্বর বসান।</p>
      </Step>

      {/* step 3: mode */}
      <Step n={2} title="অর্ডার কনফার্ম করলে কী হবে" done={done[1]}>
        <div className="grid sm:grid-cols-2 gap-3">
          {([["auto", "স্বয়ংক্রিয়", `কনফার্ম করার ${data.undo_seconds} সেকেন্ড পরে নিজে কুরিয়ারে যাবে — এর মধ্যে “ফিরিয়ে নিন” বা ✕ চাপলে বাতিল।`],
             ["manual", "হাতে", "অর্ডারের ভেতরে “কুরিয়ারে পাঠান” বোতাম চাপলে তবেই যাবে। প্রথমবার এটিই নিরাপদ।"]] as const).map(([v, t, d]) => (
            <button key={v} type="button" disabled={!!busy} onClick={() => save({ mode: v })}
              className={`text-left rounded-xl border p-3 min-h-16 ${data.mode === v ? "border-brand-500 bg-brand-50 ring-1 ring-brand-300" : "border-gray-200 hover:border-brand-300"}`}>
              <p className="font-medium flex items-center gap-2">{data.mode === v ? <CheckCircle2 className="w-4 h-4 text-brand-600" /> : <Zap className="w-4 h-4 text-gray-400" />}{t}</p>
              <p className="text-sm text-gray-600 mt-0.5">{d}</p>
            </button>
          ))}
        </div>
        <label className="text-sm block max-w-xs">প্রধান কুরিয়ার
          <select className="input w-full min-h-11 text-base" value={data.default} onChange={(e) => save({ default: e.target.value })}>
            {data.providers.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>
      </Step>

      <Step n={3} title="গ্রাহকের জন্য ট্র্যাকিং লিংক" done={false}>
        <TrackingLinks />
      </Step>
    </div>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5 space-y-3">
      <h2 className="font-semibold text-gray-900 flex items-center gap-3">
        <span className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center flex-none text-white ${done ? "bg-emerald-600" : "bg-brand-600"}`}>
          {done ? "✓" : n.toLocaleString("bn-BD")}
        </span>
        <span className="flex-1 flex items-center gap-2"><Truck className="w-4 h-4 text-brand-600" aria-hidden />{title}</span>
      </h2>
      {children}
    </section>
  );
}
