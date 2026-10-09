"use client";

import { useEffect, useState, type JSX } from "react";
import Link from "next/link";
import { Save, Loader2, Check, ImageIcon, GalleryHorizontal, ChevronDown } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import HomepageSectionNav from "@/components/admin/HomepageSectionNav";
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
  HERO_STYLE_PRESETS,
  matchesPreset,
  heroTitleClass,
  heroSubClass,
  heroAlignClass,
} from "@/lib/heroTextStyle";
import LivePreview from "@/components/admin/LivePreview";
import { AdminIcon } from "@/lib/adminIcons";
import { cn } from "@/lib/utils";
import FlashSaleAdminStatus from "@/components/admin/FlashSaleAdminStatus";
import { parseBoolSetting, parseDhakaDateTime, storedToDhakaInput } from "@/lib/flashSale";

/** Show stored values in the form the inputs expect: booleans as explicit
 * "true"/"false" (a never-saved flash-sale switch is ON on the website, so it
 * must read ON here too) and date-times as Bangladesh-time datetime-local. */
function normaliseScalar(f: HomepageScalarField, raw: string | undefined): string {
  if (f.type === "boolean") return parseBoolSetting(raw, true) ? "true" : "false";
  if (f.type === "datetime-local") return storedToDhakaInput(raw);
  return raw ?? "";
}

const JSON_KEYS = HOMEPAGE_CONTENT_EDITORS.map((e) => e.key);

// "As it appears on the website" mini-previews under each row, so a
// non-technical admin sees the result of what they type. Kept faithful but
// lightweight (icon + text), language-aware.
const sv = (v: unknown) => (v == null ? "" : String(v));
const CONTENT_PREVIEWS: Record<string, (item: Record<string, unknown>, bn: boolean) => JSX.Element> = {
  site_trust_badges_json: (it, bn) => (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-50 text-accent-800 text-xs font-semibold">
      <AdminIcon name={sv(it.icon)} className="w-3.5 h-3.5" />
      {sv(bn ? it.bn : it.en) || "…"}
    </span>
  ),
  site_why_choose_json: (it, bn) => (
    <div className="flex items-start gap-3">
      <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0"><AdminIcon name={sv(it.icon)} className="w-5 h-5" /></span>
      <div className="min-w-0">
        <p className="font-bold text-heading text-sm">{sv(bn ? it.title_bn : it.title_en) || "শিরোনাম"}</p>
        <p className="text-xs text-muted">{sv(bn ? it.desc_bn : it.desc_en)}</p>
      </div>
    </div>
  ),
  site_faq_json: (it, bn) => (
    <div>
      <p className="font-semibold text-heading text-sm">{sv(bn ? it.q_bn : it.q_en) || "প্রশ্ন?"}</p>
      <p className="text-xs text-muted mt-1">{sv(bn ? it.a_bn : it.a_en)}</p>
    </div>
  ),
  site_quick_categories_json: (it, bn) => (
    <div className="inline-flex flex-col items-center text-center gap-1.5 w-28 p-3 rounded-2xl border border-[var(--line)]">
      <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center"><AdminIcon name={sv(it.icon)} className="w-5 h-5" /></span>
      <span className="text-xs font-bold text-heading">{sv(bn ? it.label_bn : it.label_en) || "নাম"}</span>
      <span className="text-[10px] text-muted line-clamp-1">{sv(bn ? it.desc_bn : it.desc_en)}</span>
    </div>
  ),
  site_entry_points_json: (it, bn) => (
    <div className="w-56 max-w-full p-4 rounded-2xl border border-[var(--line)]">
      <span className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-2"><AdminIcon name={sv(it.icon)} className="w-6 h-6" /></span>
      <p className="font-bold text-heading text-sm">{sv(bn ? it.title_bn : it.title_en) || "শিরোনাম"}</p>
      <p className="text-xs text-muted">{sv(bn ? it.desc_bn : it.desc_en)}</p>
      <span className="inline-block mt-2 px-3 py-1 rounded-lg bg-brand-600 text-white text-xs font-semibold">{sv(bn ? it.cta_bn : it.cta_en) || "দেখুন"}</span>
    </div>
  ),
};

export default function AdminHomepageContentPage() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const toast = useToastStore((s) => s.push);
  const [values, setValues] = useState<Record<string, string>>({});
  const [hstyle, setHstyle] = useState<HeroTextStyle>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Unsaved-changes / just-saved feedback next to the Save buttons.
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  // Read-only: the hero images (edited in Media / Promo slides) for the live preview.
  const [heroMedia, setHeroMedia] = useState<{ desktop: string; promo: string }>({ desktop: "", promo: "" });

  useEffect(() => {
    adminApi.getSettings()
      .then((r) => {
        const s = r.data.data ?? {};
        setValues({
          ...Object.fromEntries(JSON_KEYS.map((k) => [k, s[k] ?? ""])),
          ...Object.fromEntries(HOMEPAGE_SCALAR_FIELDS.map((f) => [f.key, normaliseScalar(f, s[f.key])])),
        });
        setHstyle(parseHeroTextStyle(s[HERO_TEXT_STYLE_KEY]));
        setHeroMedia({ desktop: s.hero_image_url ?? "", promo: s.hero_promo_media_url ?? "" });
      })
      .catch((err) => toast("error", apiErrorMessage(err, "Failed to load homepage content")))
      .finally(() => setLoading(false));
  }, []);

  const touch = () => { setDirty(true); setJustSaved(false); };
  const setValue = (key: string, val: string) => { setValues((v) => ({ ...v, [key]: val })); touch(); };
  const setS = (patch: Partial<HeroTextStyle>) => { setHstyle((p) => ({ ...p, ...patch })); touch(); };
  const applyPreset = (style: HeroTextStyle) => { setHstyle({ ...style }); touch(); };
  const segCls = (on: boolean) =>
    `text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${on ? "bg-brand-600 text-white border-transparent" : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-muted"}`;
  const swCls = (on: boolean) =>
    `w-7 h-7 rounded-lg border-2 shadow ${on ? "border-brand-600 ring-2 ring-brand-300" : "border-white dark:border-white/20"}`;

  const save = async () => {
    // Flash sale: the end must come after the start (both Bangladesh time).
    const fsStart = parseDhakaDateTime(values.flash_sale_start);
    const fsEnd = parseDhakaDateTime(values.flash_sale_end);
    if (fsStart && fsEnd && fsEnd.getTime() <= fsStart.getTime()) {
      toast("error", bn ? "ফ্ল্যাশ সেল: শেষের সময় শুরুর সময়ের পরে হতে হবে" : "Flash sale: end must be after start");
      return;
    }
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
      toast("success", bn ? "হোমপেজ কনটেন্ট সংরক্ষিত হয়েছে — ওয়েবসাইটে ১ মিনিটের মধ্যে দেখাবে" : "Homepage content saved — live on the website within a minute");
      setDirty(false);
      setJustSaved(true);
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


  const heroGroup = HOMEPAGE_SCALAR_GROUPS.find((g) => g.id === "hero");
  const otherGroups = HOMEPAGE_SCALAR_GROUPS.filter((g) => g.id !== "hero");
  const previewTitle =
    (bn ? values.hero_title_bn : values.hero_title_en) || values.hero_title_bn || values.hero_title_en || "এবিও এন্টারপ্রাইজ";
  const previewSub =
    (bn ? values.hero_subtitle_bn : values.hero_subtitle_en) || "প্রিমিয়াম টেক প্রোডাক্ট, ডিজিটাল সেবা ও AI সমাধান।";
  const switchRow = (on: boolean, onClick: () => void, label: string, help: string) => (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onClick}
        className={`relative inline-flex flex-none w-11 h-6 rounded-full transition-colors ${on ? "bg-brand-600" : "bg-gray-200 dark:bg-white/15"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
      </button>
      <span className="text-sm min-w-0">
        <span className="font-medium text-heading">{label}</span>
        <span className="block text-xs text-muted">{help}</span>
      </span>
    </label>
  );
  const saveStatus = dirty ? (
    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{bn ? "● অসংরক্ষিত পরিবর্তন" : "● Unsaved changes"}</span>
  ) : justSaved ? (
    <span className="text-xs font-medium text-green-600 dark:text-green-400 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" />{bn ? "সংরক্ষিত" : "Saved"}</span>
  ) : null;

  return (
    <div className="admin-page admin-page-narrow pb-24">
      <HomepageSectionNav />
      <AdminPageHeader
        title="Homepage Content"
        titleBn="হোমপেজ কনটেন্ট"
        description="Hero text, Flash Sale, trust badges, Why Choose Us, FAQ, categories & entry cards. Banner images & the announcement bar are edited in the linked pages above."
        descriptionBn="হিরো লেখা, ফ্ল্যাশ সেল, ট্রাস্ট ব্যাজ, কেন আমরা, প্রশ্নোত্তর, ক্যাটাগরি ও এন্ট্রি কার্ড। ব্যানার ছবি ও ঘোষণা বার উপরের লিংক থেকে সম্পাদনা করুন।"
        className="mb-6"
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {saveStatus}
            <button type="button" onClick={save} disabled={saving || loading} className="btn btn-brand btn-sm disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {bn ? "সংরক্ষণ" : "Save all"}
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-6">
          {/* ── 1. Hero: text + images + style, all in one place ── */}
          {heroGroup && (
            <section className="enterprise-card p-4">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-heading">{bn ? "১. " + heroGroup.titleBn : "1. " + heroGroup.title}</h2>
                <p className="text-xs text-muted mt-0.5">{bn ? heroGroup.descBn : heroGroup.desc}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">{heroGroup.fields.map(renderScalar)}</div>

              <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/10 p-3">
                <p className="text-xs font-semibold text-heading mb-2">{bn ? "হিরো ছবি" : "Hero images"}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link href="/sumon/media" className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-white/10 p-2 hover:border-brand-300 transition-colors min-w-0">
                    <span className="w-16 h-10 flex-none rounded-md overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center">
                      {heroMedia.desktop && !/\.(mp4|webm|mov)(\?|$)/i.test(heroMedia.desktop) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                        <img src={heroMedia.desktop} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-white/80" />
                      )}
                    </span>
                    <span className="min-w-0 text-xs">
                      <span className="block font-semibold text-heading">{bn ? "ডেস্কটপ ব্যানার ও প্রোমো ছবি" : "Desktop banner & promo media"}</span>
                      <span className="block text-muted">{bn ? "মিডিয়া → ব্র্যান্ড ট্যাবে বদলান (মাপ ও প্রিভিউ সেখানে)" : "Change in Media → Brand tab (sizes & preview there)"}</span>
                    </span>
                  </Link>
                  <Link href="/sumon/promo-slides" className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-white/10 p-2 hover:border-brand-300 transition-colors min-w-0">
                    <span className="w-16 h-10 flex-none rounded-md bg-brand-50 dark:bg-white/10 flex items-center justify-center">
                      <GalleryHorizontal className="w-4 h-4 text-brand-600 dark:text-brand-300" />
                    </span>
                    <span className="min-w-0 text-xs">
                      <span className="block font-semibold text-heading">{bn ? "প্রোমো স্লাইড" : "Promo slides"}</span>
                      <span className="block text-muted">{bn ? "মোবাইল/ট্যাবে হিরো = স্লাইড; ডেস্কটপে ডান পাশের কার্ড" : "Mobile/tablet hero = slides; desktop right-hand card"}</span>
                    </span>
                  </Link>
                </div>
              </div>
            </section>
          )}

          <section className="enterprise-card p-4">
            <div className="mb-3">
              <h2 className="text-sm font-bold text-heading">{bn ? "২. হিরো লেখার স্টাইল" : "2. Hero Text Style"}</h2>
              <p className="text-xs text-muted mt-0.5">
                {bn
                  ? "একটি তৈরি স্টাইল বেছে নিন — সব স্ক্রিনে পড়ার মতো থাকবে। ছবির উপর সবসময় হালকা কালো ছায়া থাকে, তাই লেখা হারিয়ে যায় না।"
                  : "Pick a ready-made look — readable on every screen. A dark scrim always sits behind the text over the photo."}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4" role="radiogroup" aria-label={bn ? "তৈরি স্টাইল" : "Presets"}>
              {HERO_STYLE_PRESETS.map((p) => {
                const on = matchesPreset(hstyle, p.style);
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => applyPreset(p.style)} className={segCls(on)}>
                    {on && <Check className="w-3 h-3 inline -mt-0.5 mr-1" />}
                    {bn ? p.labelBn : p.label}
                  </button>
                );
              })}
            </div>

            <LivePreview showDevice={false} defaultDevice="desktop" className="mb-4" titleBn={bn ? "ডেস্কটপ হিরো — যেমন দেখাবে" : "Desktop hero — as it will look"}>
              <div className="pointer-events-none relative rounded-xl overflow-hidden gradient-hero aspect-[16/9] sm:aspect-[16/7] max-h-[420px] w-full">
                {heroMedia.desktop && !/\.(mp4|webm|mov)(\?|$)/i.test(heroMedia.desktop) && (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview
                  <img src={heroMedia.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(90deg, rgba(12,17,38,0.86) 0%, rgba(12,17,38,0.66) 40%, rgba(12,17,38,0.30) 70%, rgba(12,17,38,0.18) 100%)" }}
                />
                <div className="absolute inset-0 flex items-center p-4 sm:p-6">
                  <div className={cn("w-[62%] flex flex-col gap-2 text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.35)]", heroAlignClass(hstyle))}>
                    <h1 className={cn("leading-tight !text-lg sm:!text-2xl", heroTitleClass(hstyle))} style={hstyle.titleColor ? { color: hstyle.titleColor } : undefined}>
                      {previewTitle}
                    </h1>
                    <p
                      className={cn("leading-snug !text-[11px] sm:!text-sm line-clamp-2", heroSubClass(hstyle), !hstyle.subColor && "text-white/90")}
                      style={hstyle.subColor ? { color: hstyle.subColor } : undefined}
                    >
                      {previewSub}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-accent-500 text-white text-[10px] sm:text-xs font-semibold">{bn ? "সেবা বুক করুন" : "Book a service"}</span>
                      <span className="px-2.5 py-1 rounded-lg border border-white/60 text-white text-[10px] sm:text-xs font-semibold">
                        {values.hero_cta_text || (bn ? "পণ্য দেখুন" : "Products")}
                      </span>
                    </div>
                  </div>
                  <div className="absolute right-[4%] top-1/2 -translate-y-1/2 w-[28%] space-y-2">
                    <div className="aspect-video rounded-lg bg-white/15 border border-white/30 overflow-hidden">
                      {heroMedia.promo && !/\.(mp4|webm|mov)(\?|$)/i.test(heroMedia.promo) && (
                        // eslint-disable-next-line @next/next/no-img-element -- admin preview
                        <img src={heroMedia.promo} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="h-10 sm:h-16 rounded-lg bg-[#0c1330]/85 border border-white/15" />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                {bn
                  ? "মোবাইল ও ট্যাবলেটে হিরোতে প্রোমো স্লাইড ও সার্চ বার দেখায়; এই শিরোনাম শুধু বড় স্ক্রিনে দেখা যায়।"
                  : "On mobile & tablet the hero shows the promo slider and search; this headline appears on large screens."}
              </p>
            </LivePreview>

            <details className="group rounded-xl border border-gray-200 dark:border-white/10">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-heading">
                {bn ? "বিস্তারিত নিয়ন্ত্রণ (রঙ, সাইজ, অবস্থান)" : "Advanced controls (colour, size, position)"}
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-4 px-3 pb-3">
                <div>
                  <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "লেখা কোন পাশে থাকবে" : "Text alignment"}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {HERO_ALIGNS.map((o) => (
                      <button key={o.v} type="button" onClick={() => setS({ align: o.v })} className={segCls((hstyle.align ?? "left") === o.v)}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "উপর/নিচ অবস্থান" : "Vertical position"}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {HERO_VALIGNS.map((o) => (
                      <button key={o.v} type="button" onClick={() => setS({ valign: o.v })} className={segCls((hstyle.valign ?? "center") === o.v)}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "শিরোনামের রঙ" : "Title color"}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {HERO_COLOR_OPTIONS.map((c) => (
                        <button key={c} type="button" onClick={() => setS({ titleColor: c })} className={swCls(hstyle.titleColor === c)} style={{ background: c }} aria-label={c} />
                      ))}
                      <button type="button" onClick={() => setS({ titleColor: undefined })} className="text-[11px] text-muted underline">{bn ? "অটো" : "Auto"}</button>
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "শিরোনামের সাইজ" : "Title size"}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {HERO_TITLE_SIZES.map((o) => (
                        <button key={o.v} type="button" onClick={() => setS({ titleSize: o.v })} className={segCls((hstyle.titleSize ?? "md") === o.v)}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "ছোট লেখার রঙ" : "Subtitle color"}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {HERO_COLOR_OPTIONS.map((c) => (
                        <button key={c} type="button" onClick={() => setS({ subColor: c })} className={swCls(hstyle.subColor === c)} style={{ background: c }} aria-label={c} />
                      ))}
                      <button type="button" onClick={() => setS({ subColor: undefined })} className="text-[11px] text-muted underline">{bn ? "অটো" : "Auto"}</button>
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-muted mb-1.5">{bn ? "ছোট লেখার সাইজ" : "Subtitle size"}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {HERO_SUB_SIZES.map((o) => (
                        <button key={o.v} type="button" onClick={() => setS({ subSize: o.v })} className={segCls((hstyle.subSize ?? "md") === o.v)}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                  {switchRow(hstyle.bold !== false, () => setS({ bold: !(hstyle.bold !== false) }), bn ? "মোটা শিরোনাম" : "Bold title", bn ? "বন্ধ করলে একটু হালকা দেখাবে" : "Off = slightly lighter weight")}
                  {switchRow(!!hstyle.shadow, () => setS({ shadow: !hstyle.shadow }), bn ? "গাঢ় ছায়া" : "Strong shadow", bn ? "ব্যস্ত ছবির উপর লেখা আরও স্পষ্ট হয়" : "Makes text pop over busy photos")}
                  {switchRow(!!hstyle.italic, () => setS({ italic: !hstyle.italic }), bn ? "বাঁকা লেখা (Italic)" : "Italic", bn ? "শিরোনাম ও ছোট লেখা বাঁকা হবে" : "Slants title and subtitle")}
                  {switchRow(!!hstyle.uppercase, () => setS({ uppercase: !hstyle.uppercase }), bn ? "বড় হাতের অক্ষর" : "Uppercase", bn ? "শুধু ইংরেজি লেখায় কাজ করে" : "Affects English text only")}
                </div>
              </div>
            </details>
          </section>

          {otherGroups.map((g) => (
            <section key={g.id} className="enterprise-card p-4">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-heading">{bn ? g.titleBn : g.title}</h2>
                <p className="text-xs text-muted mt-0.5">{bn ? g.descBn : g.desc}</p>
              </div>
              <div className="space-y-3">{g.fields.map(renderScalar)}</div>
              {g.id === "flash_sale" && (
                <div className="mt-3">
                  <FlashSaleAdminStatus values={values} />
                </div>
              )}
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

          {HOMEPAGE_CONTENT_EDITORS.map((ed) => (
            <section key={ed.key} className="enterprise-card p-4">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-heading">{bn ? ed.titleBn : ed.title}</h2>
                <p className="text-xs text-muted mt-0.5">{bn && ed.descBn ? ed.descBn : ed.desc}</p>
              </div>
              <JsonListEditor
                value={values[ed.key] ?? ""}
                onChange={(json) => setValue(ed.key, json)}
                fields={ed.fields}
                newItem={ed.newItem}
                previewRow={CONTENT_PREVIEWS[ed.key] ? (item) => CONTENT_PREVIEWS[ed.key](item, bn) : undefined}
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

      {/* Sticky save bar — appears once something changed, so a long page never hides the Save button. */}
      {dirty && !loading && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 z-40 flex items-center justify-between sm:justify-end gap-3 rounded-2xl bg-white dark:bg-[#111a2e] border border-gray-200 dark:border-white/10 shadow-xl px-4 py-2.5">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{bn ? "অসংরক্ষিত পরিবর্তন আছে" : "You have unsaved changes"}</span>
          <button type="button" onClick={save} disabled={saving} className="btn btn-brand btn-sm disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {bn ? "সংরক্ষণ" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
