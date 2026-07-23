"use client";

import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { useLanguageStore } from "@/store/language";
import JsonListEditor from "@/components/admin/JsonListEditor";
import {
  HOMEPAGE_CONTENT_EDITORS,
  HOMEPAGE_SCALAR_GROUPS,
  HOMEPAGE_SCALAR_FIELDS,
  type HomepageScalarField,
} from "@/lib/homepageContent";

const JSON_KEYS = HOMEPAGE_CONTENT_EDITORS.map((e) => e.key);
const SCALAR_KEYS = HOMEPAGE_SCALAR_FIELDS.map((f) => f.key);
const ALL_KEYS = [...JSON_KEYS, ...SCALAR_KEYS];

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
        setValues(Object.fromEntries(ALL_KEYS.map((k) => [k, s[k] ?? ""])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setValue = (key: string, val: string) => setValues((v) => ({ ...v, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.upsertSettings([
        ...JSON_KEYS.map((k) => ({ key: k, value: (values[k] ?? "").trim(), data_type: "json" })),
        ...HOMEPAGE_SCALAR_FIELDS.map((f) => ({
          key: f.key,
          value: (values[f.key] ?? "").trim(),
          data_type: f.dataType,
        })),
      ]);
      toast("success", bn ? "হোমপেজ কনটেন্ট সংরক্ষিত হয়েছে" : "Homepage content saved");
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const renderScalar = (f: HomepageScalarField) => {
    const val = values[f.key] ?? "";
    const hint = bn ? f.hintBn ?? f.hint : f.hint;
    if (f.type === "boolean") {
      const on = val === "true";
      return (
        <label key={f.key} className="flex items-center gap-3 cursor-pointer py-1">
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => setValue(f.key, on ? "false" : "true")}
            className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${on ? "bg-brand-600" : "bg-gray-200 dark:bg-white/15"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
          </button>
          <span className="text-sm">
            <span className="font-medium text-heading">{bn ? f.labelBn : f.label}</span>
            {hint && <span className="block text-xs text-muted">{hint}</span>}
          </span>
        </label>
      );
    }
    return (
      <label key={f.key} className="block">
        <span className="block text-xs font-medium text-muted mb-1">{bn ? f.labelBn : f.label}</span>
        {f.type === "textarea" ? (
          <textarea
            value={val}
            onChange={(e) => setValue(f.key, e.target.value)}
            placeholder={f.placeholder}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-white/5 text-heading resize-y focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        ) : (
          <input
            type={f.type === "datetime-local" ? "datetime-local" : f.type === "url" ? "url" : "text"}
            value={val}
            onChange={(e) => setValue(f.key, e.target.value)}
            placeholder={f.placeholder}
            className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-white/5 text-heading focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        )}
        {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
      </label>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <AdminPageHeader
        title="Homepage Content"
        titleBn="হোমপেজ কনটেন্ট"
        description="Hero text, Flash Sale, trust badges, Why Choose Us, FAQ, categories & entry cards"
        descriptionBn="হিরো লেখা, ফ্ল্যাশ সেল, ট্রাস্ট ব্যাজ, কেন আমরা, প্রশ্নোত্তর, ক্যাটাগরি ও এন্ট্রি কার্ড"
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
          {HOMEPAGE_SCALAR_GROUPS.map((g) => (
            <section key={g.id} className="enterprise-card p-4">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-heading">{bn ? g.titleBn : g.title}</h2>
                <p className="text-xs text-muted mt-0.5">{bn ? g.descBn : g.desc}</p>
              </div>
              <div className="space-y-3">{g.fields.map(renderScalar)}</div>
            </section>
          ))}

          {HOMEPAGE_CONTENT_EDITORS.map((ed) => (
            <section key={ed.key} className="enterprise-card p-4">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-heading">{bn ? ed.titleBn : ed.title}</h2>
                <p className="text-xs text-muted mt-0.5">{ed.desc}</p>
              </div>
              <JsonListEditor
                value={values[ed.key] ?? ""}
                onChange={(json) => setValue(ed.key, json)}
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
