"use client";

import { useEffect, useState, type JSX, type ReactNode } from "react";
import Link from "next/link";
import { Save, Loader2, Check, ImageIcon, ChevronDown, ExternalLink, Pencil, Megaphone, GalleryHorizontal, ArrowRight } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import HomepageSectionNav from "@/components/admin/HomepageSectionNav";
import { adminApi, promoSlidesApi } from "@/lib/api";
import type { PromoSlide } from "@/types";
import ImageUpload from "@/components/admin/ImageUpload";
import BannerDevicePreview, { BannerGuide } from "@/components/admin/BannerDevicePreview";
import { HERO_IMAGE_SLOTS, MEDIA_UPLOAD_FOLDER } from "@/lib/imageRegistry";
import { SITE_ANNOUNCEMENTS_KEY, getAnnouncements, type CmsAnnouncement } from "@/lib/cmsContent";
import { ANNOUNCEMENT_VARIANT_BG } from "@/components/layout/AnnouncementBar";
import { slideLiveState, SLIDE_STATE_LABEL_BN, SLIDE_STATE_CLASS } from "@/lib/promoSlideStatus";
import { isVideoUrl } from "@/lib/media";
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
const HERO_IMG_KEYS = HERO_IMAGE_SLOTS.map((s) => s.key);
const editorFor = (key: string) => HOMEPAGE_CONTENT_EDITORS.find((e) => e.key === key);

/** The editable parts of the homepage, in the order a visitor sees them —
 * drives the sticky section navigator. */
const SECTIONS: { id: string; bn: string; en: string }[] = [
  { id: "announce", bn: "ঘোষণা বার", en: "Announcement bar" },
  { id: "hero", bn: "হিরো ব্যানার", en: "Hero banner" },
  { id: "slides", bn: "স্লাইডার", en: "Slider" },
  { id: "quick-categories", bn: "ক্যাটাগরি টাইল", en: "Category tiles" },
  { id: "flash-sale", bn: "ফ্ল্যাশ সেল", en: "Flash sale" },
  { id: "why-choose", bn: "কেন আমরা", en: "Why choose us" },
  { id: "faq", bn: "প্রশ্নোত্তর", en: "FAQ" },
  { id: "rest", bn: "বাকি অংশ", en: "Other sections" },
  { id: "elsewhere", bn: "অন্য জায়গার লেখা", en: "Used elsewhere" },
];
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const bnNum = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);

/** Full homepage, top to bottom, and where each part is managed. The order
 * is fixed in the website code (app/page.tsx). */
const HOMEPAGE_MAP: { bn: string; href?: string; noteBn: string }[] = [
  { bn: "ঘোষণা বার", href: "#announce", noteBn: "এই পাতায়" },
  { bn: "হিরো ব্যানার ও স্লাইড", href: "#hero", noteBn: "এই পাতায়" },
  { bn: "ক্যাটাগরি টাইল", href: "#quick-categories", noteBn: "এই পাতায়" },
  { bn: "ফিচার আইকন সারি", noteBn: "ওয়েবসাইটে নির্দিষ্ট — কিছু করতে হবে না" },
  { bn: "আপন অ্যাপ ব্যান্ড", href: "/sumon/apon", noteBn: "অ্যাপ প্রকাশ করলে নিজে থেকেই দেখায়" },
  { bn: "ফ্ল্যাশ সেল", href: "#flash-sale", noteBn: "এই পাতায়" },
  { bn: "কম্বো প্যাক", href: "/sumon/combos", noteBn: "কম্বো পাতায় সাজান" },
  { bn: "ফিচার্ড পণ্য", href: "/sumon/products", noteBn: "পণ্যে \"ফিচার্ড\" চালু করুন" },
  { bn: "সেবা", href: "/sumon/services", noteBn: "সেবা পাতায়" },
  { bn: "সফটওয়্যার ও প্রজেক্ট", href: "/sumon/showcase", noteBn: "শোকেস পাতায়" },
  { bn: "ক্লায়েন্ট লোগো", href: "/sumon/about-trust#trust_media", noteBn: "আমাদের সম্পর্কে ও বিশ্বাস" },
  { bn: "কেন আমরা", href: "#why-choose", noteBn: "এই পাতায়" },
  { bn: "যোগাযোগ বার", href: "/sumon/settings#company_info", noteBn: "ফোন/হোয়াটসঅ্যাপ — সেটিংস" },
  { bn: "গ্রাহক রিভিউ", href: "/sumon/reviews", noteBn: "রিভিউ পাতায় অনুমোদন দিন" },
  { bn: "প্রশ্নোত্তর", href: "#faq", noteBn: "এই পাতায়" },
  { bn: "পরামর্শ ফর্ম", href: "/sumon/leads", noteBn: "জমা পড়া ফর্ম লিড পাতায় দেখুন" },
  { bn: "যোগাযোগ ও ম্যাপ", href: "/sumon/settings#company_info", noteBn: "ঠিকানা, সময়, ম্যাপ — সেটিংস" },
];

function Section({ id, n, title, desc, children, aside }: { id: string; n: number; title: string; desc?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} className="enterprise-card p-4 scroll-mt-36">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-heading flex items-center gap-2">
            <span className="w-6 h-6 flex-none rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">{bnNum(n)}</span>
            {title}
          </h2>
          {desc && <p className="text-xs text-muted mt-1">{desc}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

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
  // Read-only summaries: the announcement bar and promo slides have their own editors.
  const [announcements, setAnnouncements] = useState<CmsAnnouncement[] | null>(null);
  const [slides, setSlides] = useState<PromoSlide[] | null>(null);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  useEffect(() => {
    adminApi.getSettings()
      .then((r) => {
        const s = r.data.data ?? {};
        setValues({
          ...Object.fromEntries(JSON_KEYS.map((k) => [k, s[k] ?? ""])),
          ...Object.fromEntries(HOMEPAGE_SCALAR_FIELDS.map((f) => [f.key, normaliseScalar(f, s[f.key])])),
          ...Object.fromEntries(HERO_IMG_KEYS.map((k) => [k, s[k] ?? ""])),
        });
        setHstyle(parseHeroTextStyle(s[HERO_TEXT_STYLE_KEY]));
        setAnnouncements(s[SITE_ANNOUNCEMENTS_KEY] ? getAnnouncements(s, []) : null);
      })
      .catch((err) => toast("error", apiErrorMessage(err, "Failed to load homepage content")))
      .finally(() => setLoading(false));
    promoSlidesApi.adminList()
      .then((r) => setSlides(r.data.data ?? []))
      .catch(() => setSlides([]));
  }, []);

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Highlight the section currently on screen in the sticky navigator.
  useEffect(() => {
    if (loading) return;
    const els = SECTIONS.map((x) => document.getElementById(x.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActiveSection(vis[0].target.id);
      },
      { rootMargin: "-140px 0px -55% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loading]);

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
        ...HERO_IMG_KEYS.map((k) => ({ key: k, value: (values[k] ?? "").trim(), data_type: "string" })),
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
  const flashGroup = HOMEPAGE_SCALAR_GROUPS.find((g) => g.id === "flash_sale");
  const heroDesktop = values.hero_image_url ?? "";
  const heroPromo = values.hero_promo_media_url ?? "";
  const previewTitle =
    (bn ? values.hero_title_bn : values.hero_title_en) || values.hero_title_bn || values.hero_title_en || "এবিও এন্টারপ্রাইজ";
  const previewSub =
    (bn ? values.hero_subtitle_bn : values.hero_subtitle_en) || "প্রিমিয়াম টেক প্রোডাক্ট, ডিজিটাল সেবা ও AI সমাধান।";
  const activeAnnouncements = (announcements ?? []).filter((x) => x.active !== false);
  const heroSlides = (slides ?? []).filter((x) => x.placement === "hero");
  const flashSlides = (slides ?? []).filter((x) => x.placement === "flash_sale");
  const liveCount = (list: PromoSlide[]) => list.filter((x) => slideLiveState(x) === "live").length;
  const jsonEditor = (key: string, descBn?: string) => {
    const ed = editorFor(key);
    if (!ed) return null;
    return (
      <>
        {descBn && <p className="text-xs text-muted mb-2">{descBn}</p>}
        <JsonListEditor
          value={values[ed.key] ?? ""}
          onChange={(json) => setValue(ed.key, json)}
          fields={ed.fields}
          newItem={ed.newItem}
          previewRow={CONTENT_PREVIEWS[ed.key] ? (item) => CONTENT_PREVIEWS[ed.key](item, bn) : undefined}
        />
        <p className="text-[11px] text-muted mt-2">{bn ? "খালি রাখলে ওয়েবসাইটে আগের মতো ডিফল্ট লেখা দেখাবে।" : "Leave empty to show the built-in default."}</p>
      </>
    );
  };
  const slideThumbs = (list: PromoSlide[]) =>
    list.length === 0 ? (
      <p className="text-xs text-muted">{bn ? "এখনো কোনো স্লাইড নেই।" : "No slides yet."}</p>
    ) : (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...list].sort((x, y) => x.sort_order - y.sort_order).map((sl) => {
          const st = slideLiveState(sl);
          return (
            <div key={sl.id} className="w-32 flex-none">
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                {sl.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                  <img src={sl.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-muted">{bn ? "ভিডিও" : "Video"}</span>
                )}
              </div>
              <span className={cn("mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded border font-medium", SLIDE_STATE_CLASS[st])}>{SLIDE_STATE_LABEL_BN[st]}</span>
            </div>
          );
        })}
      </div>
    );
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
        title="Arrange Homepage"
        titleBn="হোমপেজ সাজান"
        description="Everything on the homepage, top to bottom in the order visitors see it. Change, then press Save."
        descriptionBn="হোমপেজের সব অংশ — ভিজিটর উপর থেকে নিচে যে ক্রমে দেখে, সেই ক্রমে। বদলান, তারপর 'সংরক্ষণ' চাপুন।"
        className="mb-4"
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
          {/* Sticky section navigator — the homepage in visitor order. */}
          <nav aria-label={bn ? "হোমপেজের অংশ" : "Homepage sections"} className="sticky top-14 z-10 enterprise-card px-2 py-2 shadow-sm">
            <div className="flex gap-1 overflow-x-auto">
              {SECTIONS.map((x, idx) => (
                <a
                  key={x.id}
                  href={`#${x.id}`}
                  aria-current={activeSection === x.id ? "true" : undefined}
                  className={cn(
                    "flex-none inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                    activeSection === x.id ? "bg-brand-600 text-white" : "text-muted hover:bg-gray-100 dark:hover:bg-white/10"
                  )}
                >
                  <span className="opacity-70">{bnNum(idx + 1)}</span>
                  {bn ? x.bn : x.en}
                </a>
              ))}
            </div>
          </nav>

          {/* 1. Announcement bar — summary; edited on its own page. */}
          <Section
            id="announce"
            n={1}
            title={bn ? "ঘোষণা বার" : "Announcement bar"}
            desc={bn ? "ওয়েবসাইটের একদম উপরে চলমান ছোট লেখা (অফার, নোটিশ)। লেখা বদলাতে ডান পাশের বাটন চাপুন।" : "The scrolling strip at the very top (offers, notices)."}
            aside={
              <Link href="/sumon/announcements" className="btn btn-outline btn-sm gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> {bn ? "ঘোষণা বদলান" : "Edit announcements"}
              </Link>
            }
          >
            {announcements === null ? (
              <p className="text-xs text-muted">{bn ? "এখনো সাজানো হয়নি — ওয়েবসাইটে ডিফল্ট ৩টি ঘোষণা দেখাচ্ছে।" : "Not set yet — the website shows 3 default announcements."}</p>
            ) : activeAnnouncements.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">{bn ? "কোনো ঘোষণা চালু নেই — ঘোষণা বার লুকানো আছে।" : "No active announcement — the bar is hidden."}</p>
            ) : (
              <div className="space-y-1.5">
                {activeAnnouncements.slice(0, 3).map((a, i) => (
                  <div key={i} className={cn(ANNOUNCEMENT_VARIANT_BG[a.variant ?? "promo"] ?? ANNOUNCEMENT_VARIANT_BG.promo, "rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-2 min-w-0")}>
                    <Megaphone className="w-3.5 h-3.5 flex-none opacity-80" />
                    {a.icon && <span aria-hidden>{a.icon}</span>}
                    <span className="truncate">{(bn ? a.bn : a.en) || a.bn || a.en}</span>
                  </div>
                ))}
                <p className="text-[11px] text-muted">
                  {bn ? `${bnNum(activeAnnouncements.length)}টি ঘোষণা চালু আছে` : `${activeAnnouncements.length} active`}
                </p>
              </div>
            )}
          </Section>

          {/* 2. Hero banner: text + images + style, all in one place. */}
          {heroGroup && (
            <Section
              id="hero"
              n={2}
              title={bn ? "হিরো ব্যানার" : "Hero banner"}
              desc={bn ? "হোমপেজের সবচেয়ে বড় অংশ — শিরোনাম, ছোট লেখা, বাটন ও ছবি। বড় স্ক্রিনে ডেস্কটপ ছবি, মোবাইলে স্লাইড/মোবাইল ছবি দেখায়।" : "The big top area — headline, subtitle, button and images."}
            >
              <div className="grid gap-3 sm:grid-cols-2">{heroGroup.fields.map(renderScalar)}</div>

              <div className="mt-5">
                <p className="text-xs font-semibold text-heading mb-1 flex items-center gap-1.5"><ImageIcon className="w-4 h-4" />{bn ? "হিরো ছবি ও ভিডিও" : "Hero images & video"}</p>
                <p className="text-[11px] text-muted mb-3">{bn ? "ছবি বদলে নিচের 'সংরক্ষণ' চাপুন। প্রতিটির নিচে 'মাপ ও প্রিভিউ' খুলে দেখুন মোবাইল/ডেস্কটপে কেমন দেখাবে।" : "Change an image, then Save. Open 'size & preview' to check each device."}</p>
                <div className="grid gap-3 lg:grid-cols-3">
                  {HERO_IMAGE_SLOTS.map((slot) => (
                    <div key={slot.key} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 min-w-0">
                      <p className="text-sm font-semibold text-heading">{bn ? slot.labelBn : slot.label}</p>
                      {slot.usedOn && <p className="text-[11px] text-muted mb-2">{slot.usedOn}</p>}
                      <ImageUpload
                        value={values[slot.key] ?? ""}
                        onChange={(url) => setValue(slot.key, url)}
                        folder={MEDIA_UPLOAD_FOLDER}
                        hint={slot.hint}
                        guide={slot.guide}
                        purpose={slot.purpose}
                        previewSize="md"
                        accept="both"
                      />
                      {slot.kind && (
                        <details className="group mt-2">
                          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-xs font-semibold text-brand-700 dark:text-brand-300 py-1">
                            {bn ? "মাপ ও প্রিভিউ" : "Size & preview"}
                            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                          </summary>
                          <BannerGuide kind={slot.kind} />
                          <BannerDevicePreview kind={slot.kind} value={values[slot.key] ?? ""} />
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold text-heading mb-1">{bn ? "হিরো লেখার স্টাইল" : "Hero text style"}</p>
                <p className="text-[11px] text-muted mb-2">
                  {bn
                    ? "একটি তৈরি স্টাইল বেছে নিন — সব স্ক্রিনে পড়ার মতো থাকবে। ছবির উপর সবসময় হালকা কালো ছায়া থাকে, তাই লেখা হারিয়ে যায় না।"
                    : "Pick a ready-made look — readable on every screen. A dark scrim always sits behind the text over the photo."}
                </p>
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
                {heroDesktop && !isVideoUrl(heroDesktop) && (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview
                  <img src={heroDesktop} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
                      {heroPromo && !isVideoUrl(heroPromo) && (
                        // eslint-disable-next-line @next/next/no-img-element -- admin preview
                        <img src={heroPromo} alt="" className="w-full h-full object-cover" />
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
              </div>
            </Section>
          )}

          {/* 3. Promo slides — summary; edited on its own page (DB-backed). */}
          <Section
            id="slides"
            n={3}
            title={bn ? "স্লাইডার / প্রোমো স্লাইড" : "Slider / promo slides"}
            desc={bn ? "মোবাইল ও ট্যাবলেটে হিরোর জায়গায় ঘুরতে থাকা ছবি; ডেস্কটপে ডান পাশের কার্ডে। ফ্ল্যাশ সেলের নিচের ব্যানারও এখানে।" : "Rotating images: the mobile/tablet hero and the desktop promo card; also the flash-sale strip."}
            aside={
              <Link href="/sumon/promo-slides" className="btn btn-outline btn-sm gap-1.5">
                <GalleryHorizontal className="w-3.5 h-3.5" /> {bn ? "স্লাইড বদলান" : "Edit slides"}
              </Link>
            }
          >
            {slides === null ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-heading mb-1.5">
                    {bn ? `হিরো স্লাইড — ${bnNum(liveCount(heroSlides))}টি এখন দেখাচ্ছে` : `Hero slides — ${liveCount(heroSlides)} live`}
                  </p>
                  {slideThumbs(heroSlides)}
                  {liveCount(heroSlides) === 0 && (
                    <p className="text-[11px] text-muted mt-1">{bn ? "কোনো স্লাইড চালু না থাকলে মোবাইলে উপরের 'হোমপেজ ব্যানার (মোবাইল)' ছবি দেখায়।" : "With no live slide, mobile shows the 'Homepage banner (mobile)' image above."}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-heading mb-1.5">
                    {bn ? `ফ্ল্যাশ সেল ব্যানার — ${bnNum(liveCount(flashSlides))}টি এখন দেখাচ্ছে` : `Flash-sale banners — ${liveCount(flashSlides)} live`}
                  </p>
                  {slideThumbs(flashSlides)}
                </div>
              </div>
            )}
          </Section>

          {/* 4. Quick category tiles */}
          <Section id="quick-categories" n={4} title={bn ? "ক্যাটাগরি টাইল" : "Category tiles"} desc={bn ? "হিরোর ঠিক নিচে ছোট শর্টকাট (দোকান/সেবা/সফটওয়্যার)। আইকন, নাম ও লিংক দিন।" : "Small shortcuts right under the hero."}>
            {jsonEditor("site_quick_categories_json")}
          </Section>

          {/* 5. Flash sale */}
          {flashGroup && (
            <Section id="flash-sale" n={5} title={bn ? "ফ্ল্যাশ সেল" : "Flash sale"} desc={bn ? flashGroup.descBn : flashGroup.desc}>
              <div className="space-y-3">{flashGroup.fields.map(renderScalar)}</div>
              <div className="mt-3">
                <FlashSaleAdminStatus values={values} />
              </div>
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
              <p className="text-[11px] text-muted mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <Link href="/sumon/products" className="text-brand-600 dark:text-brand-300 hover:underline inline-flex items-center gap-1">{bn ? "পণ্যে ফ্ল্যাশ-সেল দাম দিন" : "Set flash-sale prices on products"} <ArrowRight className="w-3 h-3" /></Link>
                <Link href="/sumon/promo-slides" className="text-brand-600 dark:text-brand-300 hover:underline inline-flex items-center gap-1">{bn ? "ফ্ল্যাশ সেল ব্যানার" : "Flash-sale banners"} <ArrowRight className="w-3 h-3" /></Link>
              </p>
            </Section>
          )}

          {/* 6. Why choose us */}
          <Section id="why-choose" n={6} title={bn ? "কেন আমরা" : "Why choose us"} desc={bn ? editorFor("site_why_choose_json")?.descBn : editorFor("site_why_choose_json")?.desc}>
            {jsonEditor("site_why_choose_json")}
          </Section>

          {/* 7. FAQ */}
          <Section id="faq" n={7} title={bn ? "প্রশ্নোত্তর" : "FAQ"} desc={bn ? editorFor("site_faq_json")?.descBn : editorFor("site_faq_json")?.desc}>
            {jsonEditor("site_faq_json")}
          </Section>

          {/* 8. The rest of the homepage — where each part is managed. */}
          <Section
            id="rest"
            n={8}
            title={bn ? "পুরো হোমপেজ — বাকি অংশ কোথায় বদলাবেন" : "Whole homepage — where the rest is managed"}
            desc={bn ? "উপর থেকে নিচে হোমপেজের সব অংশ। অংশগুলোর ক্রম ওয়েবসাইটে নির্দিষ্ট; কিছু অংশে কিছু না থাকলে সেটি নিজে থেকেই লুকিয়ে থাকে।" : "Every homepage part, top to bottom. The order is fixed by the website."}
          >
            <ol className="divide-y divide-gray-100 dark:divide-white/10">
              {HOMEPAGE_MAP.map((m, i) => (
                <li key={m.bn} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-6 text-xs text-muted tabular-nums flex-none">{bnNum(i + 1)}</span>
                  <span className="font-medium text-heading flex-1 min-w-0">{m.bn}</span>
                  {m.href ? (
                    m.href.startsWith("#") ? (
                      <a href={m.href} className="text-xs text-brand-600 dark:text-brand-300 hover:underline whitespace-nowrap">{m.noteBn}</a>
                    ) : (
                      <Link href={m.href} className="text-xs text-brand-600 dark:text-brand-300 hover:underline inline-flex items-center gap-1 text-right">
                        {m.noteBn} <ExternalLink className="w-3 h-3 flex-none" />
                      </Link>
                    )
                  ) : (
                    <span className="text-xs text-muted text-right">{m.noteBn}</span>
                  )}
                </li>
              ))}
            </ol>
          </Section>

          {/* 9. Content kept here but shown outside the homepage. */}
          <Section
            id="elsewhere"
            n={9}
            title={bn ? "অন্য জায়গার লেখা" : "Used elsewhere"}
            desc={bn ? "এগুলো হোমপেজের মূল অংশে দেখায় না, তবে লেখা এখানেই রাখা হয়।" : "Not part of the main homepage flow, but kept here."}
          >
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-heading">{bn ? "ট্রাস্ট ব্যাজ" : "Trust badges"}</p>
                {jsonEditor("site_trust_badges_json", bn ? "ওয়েবসাইটের নিচে (ফুটারে) ছোট আস্থা-ব্যাজ হিসেবে দেখায়।" : "Shown as small badges in the footer.")}
              </div>
              <details className="group rounded-xl border border-gray-200 dark:border-white/10">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-heading">
                  {bn ? "এন্ট্রি পয়েন্ট কার্ড (এখন ওয়েবসাইটে দেখানো হয় না)" : "Entry point cards (not shown on the website now)"}
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-3 pb-3">
                  {jsonEditor("site_entry_points_json", bn ? "বড় অ্যাকশন কার্ড। বর্তমান ডিজাইনে এগুলো দেখানো হয় না — লেখা সংরক্ষিত থাকবে, মুছে যাবে না।" : "Large call-to-action cards. Not shown in the current design — your text is kept.")}
                </div>
              </details>
            </div>
          </Section>
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
