"use client";

import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { useLanguageStore } from "@/store/language";
import JsonListEditor from "@/components/admin/JsonListEditor";
import { HOMEPAGE_CONTENT_EDITORS } from "@/lib/homepageContent";

const KEYS = HOMEPAGE_CONTENT_EDITORS.map((e) => e.key);

export default function AdminHomepageContentPage() {
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
        setValues(Object.fromEntries(KEYS.map((k) => [k, s[k] ?? ""])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.upsertSettings(
        KEYS.map((k) => ({ key: k, value: (values[k] ?? "").trim(), data_type: "json" }))
      );
      toast("success", bn ? "হোমপেজ কনটেন্ট সংরক্ষিত হয়েছে" : "Homepage content saved");
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <AdminPageHeader
        title="Homepage Content"
        titleBn="হোমপেজ কনটেন্ট"
        description="Trust badges, Why Choose Us, FAQ, categories & entry cards"
        descriptionBn="ট্রাস্ট ব্যাজ, কেন আমরা, প্রশ্নোত্তর, ক্যাটাগরি ও এন্ট্রি কার্ড"
        className="mb-6"
        actions={
          <button type="button" onClick={save} disabled={saving || loading} className="btn btn-brand btn-sm disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {bn ? "সংরক্ষণ" : "Save all"}
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-6">
          {HOMEPAGE_CONTENT_EDITORS.map((ed) => (
            <section key={ed.key} className="enterprise-card p-4">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-heading">{bn ? ed.titleBn : ed.title}</h2>
                <p className="text-xs text-muted mt-0.5">{ed.desc}</p>
              </div>
              <JsonListEditor
                value={values[ed.key] ?? ""}
                onChange={(json) => setValues((v) => ({ ...v, [ed.key]: json }))}
                fields={ed.fields}
                newItem={ed.newItem}
              />
            </section>
          ))}
          <p className="text-xs text-muted">
            {bn
              ? "খালি রাখলে ওয়েবসাইটে ডিফল্ট কনটেন্ট দেখাবে। পরিবর্তনের পর 'সংরক্ষণ' চাপুন।"
              : "Leave a section empty to show the built-in default. Click Save after editing."}
          </p>
        </div>
      )}
    </div>
  );
}
