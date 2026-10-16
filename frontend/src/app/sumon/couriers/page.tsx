"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, PlugZap, Truck, Zap } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import type { ApiResponse } from "@/types";

type Field = { key: string; label: string; secret: boolean; value: string; set: boolean };
type Provider = { key: string; label: string; note: string; sandbox_supported: boolean; enabled: boolean | null; sandbox: boolean; fields: Field[] };
type Data = { mode: "auto" | "manual"; default: string; providers: Provider[]; soon: string[]; undo_seconds: number };

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

  const load = useCallback(async () => {
    try {
      const r = await api.get<ApiResponse<Data>>("/api/v1/admin/couriers");
      setData(r.data.data ?? null);
    } catch (e) {
      toast("error", errText(e, "কুরিয়ারের তথ্য আনা যায়নি"));
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const save = async (patch: Record<string, unknown>, ok = "সংরক্ষিত হয়েছে") => {
    await api.put("/api/v1/admin/couriers", patch);
    toast("success", ok);
    await load();
  };

  const saveAndTest = async (p: Provider) => {
    setBusy(p.key);
    try {
      if (p.key !== "steadfast") await save({ providers: { [p.key]: { values: vals[p.key] ?? {} } } }, "তথ্য সংরক্ষিত হয়েছে");
      const r = await api.post<ApiResponse<{ ok: boolean }>>(`/api/v1/admin/couriers/${p.key}/test`, {}, { timeout: 60000 });
      setResult((m) => ({ ...m, [p.key]: { ok: true, text: r.data.message || "সংযোগ সফল" } }));
    } catch (e) {
      setResult((m) => ({ ...m, [p.key]: { ok: false, text: errText(e, "পরীক্ষা ব্যর্থ — তথ্য দেখে আবার চেষ্টা করুন") } }));
    } finally {
      setBusy("");
    }
  };

  if (!data) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <AdminPageHeader title="Couriers" titleBn="কুরিয়ার" descriptionBn="কুরিয়ারের API বসান → পরীক্ষা করুন → স্বয়ংক্রিয় বা হাতে পাঠানো বেছে নিন" />

      <section className="card p-4 sm:p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Zap className="w-5 h-5 text-brand-600" /> অর্ডার কনফার্ম করলে কী হবে</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {([["auto", "স্বয়ংক্রিয়", `কনফার্ম করার ${data.undo_seconds} সেকেন্ড পরে নিজে কুরিয়ারে যাবে — এর মধ্যে “ফিরিয়ে নিন” বা ✕ চাপলে বাতিল।`],
             ["manual", "হাতে", "অর্ডারের ভেতরে “কুরিয়ারে পাঠান” বোতাম চাপলে তবেই যাবে।"]] as const).map(([v, t, d]) => (
            <button key={v} type="button" disabled={!!busy} onClick={() => save({ mode: v })}
              className={`text-left rounded-xl border p-3 min-h-16 ${data.mode === v ? "border-brand-500 bg-brand-50 ring-1 ring-brand-300" : "border-gray-200 hover:border-brand-300"}`}>
              <p className="font-medium flex items-center gap-2">{data.mode === v && <CheckCircle2 className="w-4 h-4 text-brand-600" />}{t}</p>
              <p className="text-sm text-gray-600 mt-0.5">{d}</p>
            </button>
          ))}
        </div>
        <label className="text-sm block max-w-xs">প্রধান কুরিয়ার (স্বয়ংক্রিয় পাঠাতে)
          <select className="input w-full min-h-11 text-base" value={data.default} onChange={(e) => save({ default: e.target.value })}>
            {data.providers.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {data.providers.map((p) => (
          <section key={p.key} className="card p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-600" />
              <h3 className="font-semibold flex-1">{p.label}</h3>
              {p.enabled !== null && (
                <label className="flex items-center gap-2 text-sm min-h-11 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5" checked={!!p.enabled}
                    onChange={(e) => save({ providers: { [p.key]: { enabled: e.target.checked } } }, e.target.checked ? "চালু হয়েছে" : "বন্ধ হয়েছে")} />
                  চালু
                </label>
              )}
            </div>
            {p.note && <p className="text-sm text-gray-600">{p.note} <Link href="/sumon/settings" className="text-brand-700 underline">সাইট সেটিংস</Link></p>}
            {p.fields.map((f) => (
              <label key={f.key} className="text-sm block">{f.label}{f.secret && f.set && <span className="text-xs text-emerald-700"> (সংরক্ষিত — বদলাতে নতুনটি লিখুন)</span>}
                <input className="input w-full min-h-11 text-base" type={f.secret ? "password" : "text"} autoComplete="off"
                  placeholder={f.secret && f.set ? "••••••••" : ""}
                  value={vals[p.key]?.[f.key] ?? f.value}
                  onChange={(e) => setVals((m) => ({ ...m, [p.key]: { ...(m[p.key] ?? {}), [f.key]: e.target.value } }))} />
              </label>
            ))}
            {p.sandbox_supported && (
              <label className="flex items-center gap-2 text-sm min-h-11 cursor-pointer">
                <input type="checkbox" className="w-5 h-5" checked={p.sandbox}
                  onChange={(e) => save({ providers: { [p.key]: { sandbox: e.target.checked } } })} />
                পরীক্ষামূলক (Sandbox) সার্ভার — আসল পার্সেল তৈরি হবে না
              </label>
            )}
            <button type="button" disabled={!!busy} onClick={() => saveAndTest(p)} className="btn btn-brand min-h-11 gap-1.5 w-full sm:w-auto justify-center">
              {busy === p.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
              {p.key === "steadfast" ? "পরীক্ষা করুন" : "সংরক্ষণ ও পরীক্ষা করুন"}
            </button>
            {result[p.key] && (
              <p role="status" className={`text-sm rounded-lg p-2 ${result[p.key].ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                {result[p.key].ok ? "✓ " : "⚠️ "}{result[p.key].text}
              </p>
            )}
          </section>
        ))}
      </div>

      <section className="card p-4 sm:p-5 text-sm text-gray-700">
        <p className="font-medium mb-1">শীঘ্রই যুক্ত হবে</p>
        <p>{data.soon.join(" · ")} — এদের অফিসিয়াল API নথি পেলে যোগ করা হবে। ততদিন এদের পার্সেল নিজ পোর্টালে বুক করে অর্ডারে ট্র্যাকিং নম্বর বসান।</p>
      </section>
    </div>
  );
}
