"use client";

import { useEffect, useState } from "react";
import { Truck, Save, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { useLanguageStore } from "@/store/language";

const FIELDS: { key: string; label: string; labelBn: string; hint: string }[] = [
  { key: "delivery_charge_sylhet", label: "Sylhet (local) delivery (৳)", labelBn: "সিলেট (লোকাল) ডেলিভারি (৳)", hint: "Inside your district" },
  { key: "delivery_charge_dhaka", label: "Dhaka & metro delivery (৳)", labelBn: "ঢাকা ও মেট্রো ডেলিভারি (৳)", hint: "Dhaka / Gazipur / Narayanganj" },
  { key: "delivery_charge_outside", label: "Outside delivery (৳)", labelBn: "ঢাকার বাইরে ডেলিভারি (৳)", hint: "Rest of Bangladesh" },
  { key: "free_delivery_min_amount", label: "Free delivery over (৳)", labelBn: "ফ্রি ডেলিভারি (৳-এর বেশি)", hint: "Order subtotal above this = free" },
  { key: "advance_delivery_charge", label: "Advance / prepaid charge (৳)", labelBn: "অগ্রিম চার্জ (৳)", hint: "For products/services flagged 'requires advance'" },
];

export default function AdminDeliveryPage() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const toast = useToastStore((s) => s.push);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getSettings()
      .then((r) => {
        const s = r.data.data ?? {};
        setValues(Object.fromEntries(FIELDS.map((f) => [f.key, s[f.key] ?? ""])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.upsertSettings(
        FIELDS.map((f) => ({ key: f.key, value: String(values[f.key] ?? "").trim() || "0", data_type: "number" }))
      );
      toast("success", bn ? "সংরক্ষিত হয়েছে" : "Delivery settings saved");
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
            <Truck className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-heading">{bn ? "ডেলিভারি ও চার্জ" : "Delivery & Charges"}</h1>
            <p className="text-xs text-muted">{bn ? "জোন ডেলিভারি, ফ্রি লিমিট ও অগ্রিম চার্জ" : "Zone delivery, free limit & advance charge"}</p>
          </div>
        </div>
        <button type="button" onClick={save} disabled={saving || loading} className="btn btn-brand btn-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {bn ? "সংরক্ষণ" : "Save"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="enterprise-card p-4">
              <label className="block text-sm font-semibold text-heading mb-1">{bn ? f.labelBn : f.label}</label>
              <p className="text-xs text-muted mb-2">{f.hint}</p>
              <input
                type="number" min="0" step="1"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="input w-full"
                placeholder="0"
              />
            </div>
          ))}
          <p className="text-xs text-muted">
            {bn
              ? "প্রতিটি পণ্য/সার্ভিসের নিজস্ব ডেলিভারি/কনসালটেন্সি চার্জ ও 'অগ্রিম প্রয়োজন' টগল ঐ পণ্য/সার্ভিস এডিট ফর্মে সেট করা যায়।"
              : "Per-product/service delivery, consultancy fee and the 'requires advance' toggle are set on each item's own edit form."}
          </p>
        </div>
      )}
    </div>
  );
}
