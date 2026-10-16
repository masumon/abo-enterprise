"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

/** Customer-facing "track parcel" links (moved here from Checkout & Delivery —
 * same setting keys). {tracking_id} is replaced with the order's tracking code. */
const FIELDS = [
  { key: "courier_steadfast_url", label: "Steadfast ট্র্যাকিং লিংক", placeholder: "https://steadfast.com.bd/t/{tracking_id}" },
  { key: "courier_pathao_url", label: "Pathao ট্র্যাকিং লিংক", placeholder: "https://merchant.pathao.com/tracking?consignment_id={tracking_id}" },
];

export default function TrackingLinks() {
  const toast = useToastStore((s) => s.push);
  const [vals, setVals] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getSettings()
      .then((r) => { const s = r.data.data ?? {}; setVals(Object.fromEntries(FIELDS.map((f) => [f.key, s[f.key] ?? ""]))); })
      .catch(() => setVals(Object.fromEntries(FIELDS.map((f) => [f.key, ""]))));
  }, []);

  if (!vals) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-600" aria-label="লোড হচ্ছে" /></div>;

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.upsertSettings(FIELDS.map((f) => ({ key: f.key, value: (vals[f.key] ?? "").trim(), data_type: "string" })));
      toast("success", "সংরক্ষিত হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "সংরক্ষণ করা যায়নি"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">গ্রাহক “অর্ডার ট্র্যাক” পাতায় এই লিংকে পার্সেল দেখতে পান। লিংকে <code className="text-xs bg-gray-100 rounded px-1">{"{tracking_id}"}</code> লিখুন — সেখানে অর্ডারের ট্র্যাকিং নম্বর বসবে।</p>
      <div className="grid md:grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="text-sm block">{f.label}
            <input className="input w-full min-h-11 text-base" type="text" inputMode="url" placeholder={f.placeholder}
              value={vals[f.key]} onChange={(e) => setVals((m) => ({ ...(m ?? {}), [f.key]: e.target.value }))} />
          </label>
        ))}
      </div>
      <button type="button" onClick={save} disabled={saving} className="btn btn-brand min-h-11 px-5 gap-1.5 w-full sm:w-auto justify-center">
        {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} সংরক্ষণ করুন
      </button>
    </div>
  );
}
