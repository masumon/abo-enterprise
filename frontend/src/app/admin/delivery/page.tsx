"use client";

import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { useLanguageStore } from "@/store/language";

type FieldType = "number" | "text" | "textarea";
const FIELDS: { key: string; label: string; labelBn: string; hint: string; type?: FieldType }[] = [
  { key: "delivery_charge_sylhet", label: "Sylhet (local) delivery (৳)", labelBn: "সিলেট (লোকাল) ডেলিভারি (৳)", hint: "Inside your district", type: "number" },
  { key: "delivery_charge_dhaka", label: "Dhaka & metro delivery (৳)", labelBn: "ঢাকা ও মেট্রো ডেলিভারি (৳)", hint: "Dhaka / Gazipur / Narayanganj", type: "number" },
  { key: "delivery_charge_outside", label: "Outside delivery (৳)", labelBn: "ঢাকার বাইরে ডেলিভারি (৳)", hint: "Rest of Bangladesh", type: "number" },
  { key: "free_delivery_min_amount", label: "Free delivery over (৳)", labelBn: "ফ্রি ডেলিভারি (৳-এর বেশি)", hint: "Order subtotal above this = free", type: "number" },
  { key: "advance_delivery_charge", label: "Advance / prepaid charge (৳)", labelBn: "অগ্রিম চার্জ (৳)", hint: "For products/services flagged 'requires advance'", type: "number" },
  { key: "courier_pathao_url", label: "Pathao tracking URL", labelBn: "Pathao ট্র্যাকিং URL", hint: "Use {tracking_id} placeholder", type: "text" },
  { key: "courier_steadfast_url", label: "Steadfast tracking URL", labelBn: "Steadfast ট্র্যাকিং URL", hint: "Use {tracking_id} placeholder", type: "text" },
  { key: "cod_max_pending_per_phone", label: "Max pending COD orders / phone", labelBn: "প্রতি ফোনে সর্বোচ্চ অপেক্ষমান COD", hint: "Blocks stacking unconfirmed COD orders. 0 = unlimited", type: "number" },
  { key: "order_blocked_phones", label: "Blocked phone numbers", labelBn: "ব্লক করা ফোন নম্বর", hint: "Comma/newline separated — these numbers cannot order", type: "textarea" },
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
        FIELDS.map((f) => {
          const raw = String(values[f.key] ?? "").trim();
          if ((f.type ?? "number") === "number") {
            return { key: f.key, value: raw || "0", data_type: "number" };
          }
          return { key: f.key, value: raw, data_type: "string" };
        })
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
      <AdminPageHeader
        title="Delivery & Charges"
        titleBn="ডেলিভারি ও চার্জ"
        description="Zone delivery, free limit, advance charge, courier tracking & COD guard"
        descriptionBn="জোন ডেলিভারি, ফ্রি লিমিট, অগ্রিম চার্জ, কুরিয়ার ট্র্যাকিং ও COD সুরক্ষা"
        className="mb-6"
        actions={
          <button type="button" onClick={save} disabled={saving || loading} className="btn btn-brand btn-sm disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {bn ? "সংরক্ষণ" : "Save"}
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="enterprise-card p-4">
              <label className="block text-sm font-semibold text-heading mb-1">{bn ? f.labelBn : f.label}</label>
              <p className="text-xs text-muted mb-2">{f.hint}</p>
              {(f.type ?? "number") === "textarea" ? (
                <textarea
                  rows={3}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="input w-full"
                  placeholder="01712345678, 01898765432"
                />
              ) : f.type === "text" ? (
                <input
                  type="text"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="input w-full"
                  placeholder="https://…/{tracking_id}"
                />
              ) : (
                <input
                  type="number" min="0" step="1"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="input w-full"
                  placeholder="0"
                />
              )}
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
