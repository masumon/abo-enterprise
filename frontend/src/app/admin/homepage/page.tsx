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
import {
  HERO_TEXT_STYLE_KEY,
  parseHeroTextStyle,
  type HeroTextStyle,
  HERO_COLOR_OPTIONS,
  HERO_TITLE_SIZES,
  HERO_SUB_SIZES,
  HERO_ALIGNS,
  HERO_VALIGNS,
  heroTitleClass,
  heroSubClass,
  heroAlignClass,
} from "@/lib/heroTextStyle";
import LivePreview from "@/components/admin/LivePreview";
import { cn } from "@/lib/utils";

const JSON_KEYS = HOMEPAGE_CONTENT_EDITORS.map((e) => e.key);
const SCALAR_KEYS = HOMEPAGE_SCALAR_FIELDS.map((f) => f.key);
const ALL_KEYS = [...JSON_KEYS, ...SCALAR_KEYS];

export default function AdminHomepageContentPage() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const toast = useToastStore((s) => s.push);
  const [values, setValues] = useState<Record<string, string>>({});
  const [hstyle, setHstyle] = useState<HeroTextStyle>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getSettings()
      .then((r) => {
        const s = r.data.data ?? {};
        setValues(Object.fromEntries(ALL_KEYS.map((k) => [k, s[k] ?? ""])));
        setHstyle(parseHeroTextStyle(s[HERO_TEXT_STYLE_KEY]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setValue = (key: string, val: string) => setValues((v) => ({ ...v, [key]: val }));
  const setS = (patch: Partial<HeroTextStyle>) => setHstyle((p) => ({ ...p, ...patch }));
  const segCls = (on: boolean) =>
    `text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${on ? "bg-brand-600 text-white border-transparent" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-muted"}`;
  const swCls = (on: boolean) =>
    `w-7 h-7 rounded-lg border-2 shadow ${on ? "border-brand-600 ring-2 ring-brand-300" : "border-white dark:border-white/20"}`;

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
        { key: HERO_TEXT_STYLE_KEY, value: JSON.stringify(hstyle), data_type: "json" },
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
              {g.id === "flash_sale" && (
                <div className="mt-4">
                  <LivePreview showDevice={false}>
                    <div className="pointer-events-none rounded-xl overflow-hidden bg-gradient-to-r from-accent-600 to-brand-700 text-white p-4 flex items-center gap-3">
                      <span className="text-2xl">⚡</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">
                          {(bn ? values.flash_sale_title_bn : values.flash_sale_title_en) || values.flash_sale_title_bn || values.flash_sale_title_en || "ফ্ল্যাশ সেল"}
                        </p>
                        <p className="text-xs text-white/80">
                          {values.feature_flash_sale === "true" ? (bn ? "চালু" : "On") : (bn ? "বন্ধ" : "Off")} · {bn ? "কাউন্টডাউন হোমপেজে" : "countdown on homepage"}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-none">
                        {["০২", "১১", "৪৫"].map((n, i) => (
                          <span key={i} className="bg-white/20 rounded px-2 py-1 text-sm font-bold tabular-nums">{n}</span>
                        ))}
                      </div>
                    </div>
                  </LivePreview>
                </div>
              )}
            </section>
          ))}

          <section className="enterprise-card p-4">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-heading">{bn ? "হিরো টেক্সট স্টাইল" : "Hero Text Style"}</h2>
              <p className="text-xs text-muted mt-0.5">
                {bn ? "রঙ · সাইজ · পজিশন · স্টাইল — মোবাইল/ট্যাব/ডেস্কটপ ফ্রেন্ডলি। খালি = ডিফল্ট।" : "Color · size · position · style — responsive. Empty = default."}
              </p>
            </div>
            <LivePreview showDevice={false} className="mb-4">
              <div className="pointer-events-none rounded-xl overflow-hidden gradient-brand p-6">
                <div className={cn("flex flex-col gap-2 text-white", heroAlignClass(hstyle))}>
                  <h1 className={cn("leading-tight", heroTitleClass(hstyle))} style={hstyle.titleColor ? { color: hstyle.titleColor } : undefined}>
                    এবিও এন্টারপ্রাইজ
                  </h1>
                  <p
                    className={cn("max-w-lg leading-relaxed", heroSubClass(hstyle), !hstyle.subColor && "text-white/80")}
                    style={hstyle.subColor ? { color: hstyle.subColor } : undefined}
                  >
                    প্রিমিয়াম টেক প্রোডাক্ট, ডিজিটাল সেবা ও AI সমাধান।
                  </p>
                </div>
              </div>
            </LivePreview>

            <div className="space-y-4">
              <div>
                <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "অবস্থান (বাম/মাঝ/ডান)" : "Alignment"}</span>
                <div className="flex flex-wrap gap-1.5">
                  {HERO_ALIGNS.map((o) => (
                    <button key={o.v} type="button" onClick={() => setS({ align: o.v })} className={segCls((hstyle.align ?? "left") === o.v)}>{o.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "উপর/নিচ (মোবাইল)" : "Vertical (mobile)"}</span>
                <div className="flex flex-wrap gap-1.5">
                  {HERO_VALIGNS.map((o) => (
                    <button key={o.v} type="button" onClick={() => setS({ valign: o.v })} className={segCls((hstyle.valign ?? "center") === o.v)}>{o.label}</button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "টাইটেল রঙ" : "Title color"}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {HERO_COLOR_OPTIONS.map((c) => (
                      <button key={c} type="button" onClick={() => setS({ titleColor: c })} className={swCls(hstyle.titleColor === c)} style={{ background: c }} aria-label={c} />
                    ))}
                    <button type="button" onClick={() => setS({ titleColor: undefined })} className="text-[11px] text-muted underline">{bn ? "ডিফল্ট" : "Default"}</button>
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "টাইটেল সাইজ" : "Title size"}</span>
                  <div className="flex gap-1.5">
                    {HERO_TITLE_SIZES.map((o) => (
                      <button key={o.v} type="button" onClick={() => setS({ titleSize: o.v })} className={segCls((hstyle.titleSize ?? "md") === o.v)}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "সাবটাইটেল রঙ" : "Subtitle color"}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {HERO_COLOR_OPTIONS.map((c) => (
                      <button key={c} type="button" onClick={() => setS({ subColor: c })} className={swCls(hstyle.subColor === c)} style={{ background: c }} aria-label={c} />
                    ))}
                    <button type="button" onClick={() => setS({ subColor: undefined })} className="text-[11px] text-muted underline">{bn ? "ডিফল্ট" : "Default"}</button>
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "সাবটাইটেল সাইজ" : "Subtitle size"}</span>
                  <div className="flex gap-1.5">
                    {HERO_SUB_SIZES.map((o) => (
                      <button key={o.v} type="button" onClick={() => setS({ subSize: o.v })} className={segCls((hstyle.subSize ?? "md") === o.v)}>{o.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "টাইটেল স্টাইল" : "Title style"}</span>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setS({ bold: !(hstyle.bold !== false) })} className={segCls(hstyle.bold !== false)}>Bold</button>
                  <button type="button" onClick={() => setS({ italic: !hstyle.italic })} className={segCls(!!hstyle.italic)}>Italic</button>
                  <button type="button" onClick={() => setS({ shadow: !hstyle.shadow })} className={segCls(!!hstyle.shadow)}>Shadow</button>
                  <button type="button" onClick={() => setS({ uppercase: !hstyle.uppercase })} className={segCls(!!hstyle.uppercase)}>Uppercase</button>
                </div>
              </div>
            </div>
          </section>

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
