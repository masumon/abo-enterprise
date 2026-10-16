"use client";

import AiTextMenu from "@/components/admin/catalog/AiTextMenu";
import { useUnsavedGuard } from "@/hooks/useUnsavedGuard";
import Link from "next/link";
import { validateSettingValues } from "@/lib/settingsValidation";
import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/api";
import ImageUpload from "@/components/admin/ImageUpload";
import JsonListEditor, { type JsonListField } from "@/components/admin/JsonListEditor";
import type { UploadPurpose } from "@/lib/uploadGuides";
import TranslateButton from "@/components/admin/TranslateButton";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

/** Friendly field-editor for the search-suggestions object-array setting.
 * Team, client/partner logos and registrations moved to /sumon/about-trust. */
const TRUST_EDITORS: Record<string, { fields: JsonListField[]; newItem: () => Record<string, unknown>; mapKey?: string; previewRow?: (item: Record<string, unknown>) => React.ReactNode }> = {
  // Curated links shown under "Suggestions" on the storefront search screen.
  search_suggestions_json: {
    fields: [
      { path: "label_en", label: "Label (EN)", translateFrom: "label_bn" },
      { path: "label_bn", label: "Label (বাংলা)" },
      { path: "href", label: "Link", hint: "e.g. /products?category_slug=chargers or /projects" },
    ],
    newItem: () => ({ label_en: "", label_bn: "", href: "/" }),
  },
};
import { Save, RefreshCw, Loader2, Building2, Share2, ImageIcon, ShoppingBag, MapPin, Check, SaveAll, Shield, Globe, Zap, Mail, Info, Search, Settings as SettingsIcon } from "lucide-react";
import { useToastStore } from "@/store/toast";
import { parseGoogleMapsEmbedInput } from "@/lib/maps";
import { apiErrorMessage } from "@/lib/apiError";

type SettingValues = Record<string, string>;

const HIDDEN_PLACEHOLDER = "***HIDDEN***";

const JSON_SETTING_KEYS = new Set<string>([]);

const BOOL_SETTING_KEYS = new Set([
  "maintenance_mode",
  "steadfast_enabled",
  "steadfast_auto_send",
  "feature_flash_sale",
  "feature_coupons",
  "feature_guest_checkout",
  "feature_newsletter",
  "feature_infinite_scroll",
  "feature_assistant_chat",
  "feature_assistant_whatsapp",
]);

function settingDataType(key: string, fieldType?: string): string {
  if (fieldType === "number") return "number";
  if (fieldType === "boolean" || BOOL_SETTING_KEYS.has(key)) return "boolean";
  if (JSON_SETTING_KEYS.has(key) || key.endsWith("_json")) return "json";
  return "string";
}

function buildSaveItems(section: Section, values: SettingValues) {
  return section.fields
    .map((f) => {
      let value = values[f.key] ?? "";
      if (f.key === "google_maps_embed" && value.trim()) {
        const parsed = parseGoogleMapsEmbedInput(value);
        if (parsed) value = parsed;
      }
      return {
        key: f.key,
        value,
        data_type: settingDataType(f.key, f.type),
      };
    })
    .filter((item) => item.value !== HIDDEN_PLACEHOLDER);
}

interface SettingField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "url" | "email" | "tel" | "number" | "textarea" | "boolean" | "datetime-local" | "password" | "select";
  /** Choices for type: "select". */
  options?: { value: string; label: string }[];
  hint?: string;
  upload?: boolean;
  accept?: "image" | "video" | "both";
  /** Bangla upload guide shown under the upload control. */
  purpose?: UploadPurpose;
  /** The value the live site falls back to when this setting is empty. Shown
   * pre-filled so the admin sees what's actually live (not a blank field). */
  defaultValue?: string;
  /** When set, this English field shows a "→ English" button translating the
   * sibling Bangla setting with this key. */
  translateFrom?: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  fields: SettingField[];
  /** Info line rendered under the section header (e.g. Image Manager pointer). */
  note?: string;
  /** Show the "Image Manager খুলুন" link under the note (image-related sections only). */
  mediaLink?: boolean;
  /** Optional link to a diagnostic/test page for this section (e.g. Steadfast connection test). */
}

const SECTIONS: Section[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // BRAND ASSETS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "brand_core",
    title: "ব্র্যান্ড পরিচয়",
    icon: <Building2 className="w-4 h-4" />,
    // Logo/favicon/PWA icon/OG image moved to the Image Manager — one place
    // for every image, with size guides, preview and auto-optimize.
    mediaLink: true,
    note: "লোগো, ফ্যাভিকন, PWA আইকন ও OG ছবি এখন Image Manager-এ (ছবি ব্যবস্থাপনা) — সব ছবি এক জায়গায়।",
    fields: [
      { key: "site_name", label: "কোম্পানির নাম", placeholder: "ABO Enterprise", defaultValue: "ABO Enterprise" },
      { key: "site_tagline_en", label: "ট্যাগলাইন (ইংরেজি)", placeholder: "Simple Solutions", defaultValue: "Simple Solutions", hint: "Shown beside the logo (More menu header) when the site is in English", translateFrom: "site_tagline_bn" },
      { key: "site_tagline_bn", label: "ট্যাগলাইন (বাংলা)", placeholder: "সহজ সমাধান", defaultValue: "সহজ সমাধান" },
      { key: "site_url", label: "ওয়েবসাইটের ঠিকানা (URL)", type: "url", placeholder: "https://www.aboenterprise.com", hint: "Your live website address. Used for the 'View in Admin' & order-tracking links in emails. No trailing slash." },
    ],
  },
  {
    id: "company_info",
    title: "যোগাযোগ ও ঠিকানা",
    icon: <MapPin className="w-4 h-4" />,
    fields: [
      { key: "contact_phone", label: "ফোন (কল)", type: "tel", placeholder: "01XXXXXXXXX", hint: "Shown for calls across the site, in invoices and customer SMS." },
      { key: "whatsapp_number", label: "হোয়াটসঅ্যাপ নম্বর", type: "tel", placeholder: "01XXXXXXXXX or 8801XXXXXXXXX", hint: "Used for every WhatsApp button and message link on the site (product, service, FAQ, track, footer…). Leave empty to reuse the call number above. You can keep two different numbers: one for calls, one for WhatsApp." },
      { key: "contact_email", label: "ইমেইল", type: "email", placeholder: "info@aboenterprise.com", defaultValue: "info@aboenterprise.com", hint: "Shown on the site (footer, contact, invoices). Editable here — no redeploy." },
      { key: "contact_address", label: "ঠিকানা (বাংলা)", type: "textarea", placeholder: "হাজী বাহার উদ্দিন মার্কেট, আব্দুল্লাপুর, বৈরাগীবাজার-৩১৭০, বিয়ানীবাজার, সিলেট, বাংলাদেশ", hint: "সাইট বাংলায় থাকলে এই ঠিকানা দেখাবে" },
      { key: "contact_address_en", label: "ঠিকানা (ইংরেজি)", type: "textarea", placeholder: "Hazi Bahar Uddin Market, Abdullapur, Bairagibazar-3170, Beanibazar, Sylhet, Bangladesh", hint: "Shown when the site is in English. Leave blank to reuse the Bangla address.", translateFrom: "contact_address" },
      { key: "contact_hours_en", label: "খোলার সময় (ইংরেজি)", placeholder: "Sat–Thu, 9:00 AM – 9:00 PM", defaultValue: "Sat–Thu, 9:00 AM – 9:00 PM", hint: "Enter real opening hours, not the business name. Shown in the footer, homepage and contact page", translateFrom: "contact_hours_bn" },
      { key: "contact_hours_bn", label: "খোলার সময় (বাংলা)", placeholder: "শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা", defaultValue: "শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা" },
      { key: "contact_compliance_officer_name", label: "অভিযোগ ও কমপ্লায়েন্স কর্মকর্তা — নাম", placeholder: "Full name", hint: "Shown on the legal pages (Privacy, Terms, Refund, Cookies) as the person handling complaints and data requests. Leave empty to use your Support / Customer Service team member from the About team list." },
      { key: "contact_compliance_officer_title", label: "অভিযোগ ও কমপ্লায়েন্স কর্মকর্তা — পদবি", placeholder: "Customer Support & Compliance", hint: "Optional job title shown next to the name." },
      { key: "footer_about_en", label: "ফুটারের পরিচিতি (ইংরেজি)", type: "textarea", hint: "Short company description shown in the site footer", placeholder: "We provide solutions for every need in the digital age. Your business, home, and security are in good hands with us.", defaultValue: "We provide solutions for every need in the digital age. Your business, home, and security are in good hands with us.", translateFrom: "footer_about_bn" },
      { key: "footer_about_bn", label: "ফুটারের পরিচিতি (বাংলা)", type: "textarea", placeholder: "ডিজিটাল যুগের সব ধরনের সমাধান আমরা সরবরাহ করি। আপনার ব্যবসা, ঘর এবং নিরাপত্তার সব কিছু আমরা আপনার সাথে।", defaultValue: "ডিজিটাল যুগের সব ধরনের সমাধান আমরা সরবরাহ করি। আপনার ব্যবসা, ঘর এবং নিরাপত্তার সব কিছু আমরা আপনার সাথে।" },
      { key: "footer_app_title_bn", label: "অ্যাপ-ব্লকের শিরোনাম (বাংলা)", placeholder: "আপন অ্যাপ ডাউনলোড করুন", hint: "ফুটারের অ্যাপ-ব্লকের শিরোনাম — ফাঁকা রাখলে ডিফল্ট লেখা দেখাবে" },
      { key: "footer_app_title_en", label: "অ্যাপ-ব্লকের শিরোনাম (ইংরেজি)", placeholder: "Get the Apon app" },
      { key: "footer_app_subtitle_bn", label: "অ্যাপ-ব্লকের স্লোগান (বাংলা)", placeholder: "কাজ, টাকা, ওষুধ — সব এক খাতায়, আপনার ফোনেই।" },
      { key: "footer_app_subtitle_en", label: "অ্যাপ-ব্লকের স্লোগান (ইংরেজি)", placeholder: "Tasks, money, medicines — one notebook, on your phone." },
      { key: "footer_payment_image_url", label: "পেমেন্ট পদ্ধতির ছবি", upload: true, accept: "image", purpose: "payment-strip", hint: "ফুটারের 'পেমেন্ট পদ্ধতি সমূহ' — সব পেমেন্ট লোগো একসাথে একটি চওড়া ছবি আপলোড করুন (যেমন SSLCommerz 'Pay With' স্ট্রিপ)। এটি বিল্ট-ইন আইকনের বদলে বসবে এবং মোবাইল/ট্যাব/ডেস্কটপে fit হবে। খালি রাখলে বিল্ট-ইন আইকন দেখাবে।" },
      { key: "google_maps_embed", label: "Google ম্যাপ (Embed)", type: "textarea", hint: "Share → Embed a map", placeholder: "Paste iframe or URL" },
      { key: "google_maps_api_key", label: "Google ম্যাপ API Key", placeholder: "AIza..." },
    ],
  },
  {
    id: "email_smtp",
    title: "ইমেইল পাঠানো (SMTP)",
    icon: <Mail className="w-4 h-4" />,
    note: "এখানে সেট করলে ইমেইল পাঠানো চালু হয় — env ছাড়াই। Gmail: Host smtp.gmail.com · Port 587 · User আপনার Gmail · Password একটি Gmail App Password (সাধারণ পাসওয়ার্ড নয়)।",
    fields: [
      { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
      { key: "smtp_port", label: "SMTP Port", type: "number", placeholder: "587" },
      { key: "smtp_user", label: "SMTP User", placeholder: "info@aboenterprise.com" },
      { key: "smtp_password", label: "SMTP পাসওয়ার্ড / App Password", type: "password", placeholder: "•••• •••• •••• ••••", hint: "Gmail: 16-char App Password. Stored masked; not shown again." },
      { key: "smtp_from", label: "প্রেরকের ইমেইল", type: "email", placeholder: "info@aboenterprise.com" },
      { key: "smtp_from_name", label: "প্রেরকের নাম", placeholder: "ABO Enterprise" },
      { key: "admin_notify_email", label: "নোটিফিকেশন যাবে যে ইমেইলে", type: "email", placeholder: "info@aboenterprise.com", hint: "New orders/bookings/leads are emailed here." },
      { key: "email_provider", label: "ইমেইল সার্ভিস", placeholder: "smtp", hint: "\"smtp\" (default) or \"resend\". Leave blank to use the server's env setting." },
      { key: "resend_api_key", label: "Resend API Key", type: "password", placeholder: "re_••••••••", hint: "Only used when Email Provider is \"resend\". Stored masked; not shown again." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE BANNERS (All 25 Pages)
  // ═══════════════════════════════════════════════════════════════════════
  // Team members, client/partner logos, business registrations and the
  // legacy trade licence (about_team_json, client_logos_json,
  // site_registrations_json, trade_license) are edited on
  // /sumon/about-trust — same keys, one place.

  // ═══════════════════════════════════════════════════════════════════════
  // COMMERCE SETTINGS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ecommerce_config",
    title: "দোকানের সাধারণ সেটিং",
    icon: <ShoppingBag className="w-4 h-4" />,
    note: "চেকআউট OTP, ডেলিভারি চার্জ, ফ্রি লিমিট ও COD সুরক্ষা → “চেকআউট ও ডেলিভারি” পাতায়। কুরিয়ার → “কুরিয়ার” পাতায়। কুপন, ফ্ল্যাশ সেল ও কম্বো → “অফার” পাতায়।",
    fields: [
      { key: "currency", label: "মুদ্রা", placeholder: "BDT" },
      { key: "min_order_amount", label: "সর্বনিম্ন অর্ডার (৳)", type: "number", placeholder: "200" },
      { key: "tax_percent", label: "ট্যাক্স / ভ্যাট %", type: "number", placeholder: "0", hint: "Shown on invoices for reference — not yet applied to checkout totals (a deliberate, separate decision)." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MARKETING & SOCIAL
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "social_links",
    title: "সোশ্যাল মিডিয়া লিংক",
    icon: <Share2 className="w-4 h-4" />,
    fields: [
      { key: "facebook_url", label: "Facebook", type: "url", placeholder: "https://facebook.com/aboenterprise" },
      { key: "instagram_url", label: "Instagram", type: "url", placeholder: "https://instagram.com/..." },
      { key: "twitter_url", label: "Twitter / X", type: "url", placeholder: "https://x.com/..." },
      { key: "linkedin_url", label: "LinkedIn", type: "url", placeholder: "https://linkedin.com/company/..." },
      { key: "youtube_url", label: "YouTube", type: "url", placeholder: "https://youtube.com/@..." },
      { key: "tiktok_url", label: "TikTok", type: "url", placeholder: "https://tiktok.com/@..." },
    ],
  },
  {
    id: "marketing_config",
    title: "মার্কেটিং ও অ্যানালিটিক্স",
    icon: <Zap className="w-4 h-4" />,
    fields: [
      { key: "facebook_pixel_id", label: "Facebook Pixel ID", placeholder: "1234567890", hint: "Conversion tracking" },
      { key: "seo_gtm_id", label: "Google Tag Manager ID", placeholder: "GTM-XXXXXXX", hint: "Container ID from tagmanager.google.com" },
      { key: "seo_gsc_verification", label: "Google Search Console Verification", placeholder: "abc123...", hint: "The content value from GSC's HTML tag verification method (not the whole <meta> tag)" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FEATURES & TOOLS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "site_features",
    title: "সাইটের ফিচার চালু/বন্ধ",
    icon: <Zap className="w-4 h-4" />,
    fields: [
      { key: "feature_guest_checkout", label: "লগইন ছাড়া অর্ডার (Guest Checkout)", type: "boolean" },
      { key: "feature_newsletter", label: "নিউজলেটার", type: "boolean", hint: "Footer signup" },
      { key: "feature_infinite_scroll", label: "স্ক্রল করলে আরও পণ্য (Infinite Scroll)", type: "boolean", hint: "Product load-more" },
    ],
  },
  {
    id: "search_config",
    title: "সার্চের পরামর্শ",
    icon: <Globe className="w-4 h-4" />,
    note: "সার্চ পেজে (খালি থাকলে) 'সাজেশন' অংশে দেখানো কাস্টম লিংক। খালি রাখলে ক্যাটাগরি থেকে স্বয়ংক্রিয় সাজেশন দেখাবে।",
    fields: [
      { key: "search_suggestions_json", label: "পরামর্শের লিংক", type: "textarea", hint: "Each: a label (EN/বাংলা) and a link shown under Suggestions on search" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SYSTEM
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "system_config",
    title: "সিস্টেম",
    icon: <Shield className="w-4 h-4" />,
    fields: [
      { key: "timezone", label: "সময় অঞ্চল", placeholder: "Asia/Dhaka" },
      { key: "maintenance_mode", label: "রক্ষণাবেক্ষণ মোড (সাইট বন্ধ)", type: "text" as const, placeholder: "false", hint: "true to disable site" },
    ],
  },
];

/** Groups the 14 flat SECTIONS into tabs so an admin doesn't have to scroll
 * past unrelated settings to find one. Purely presentational — which
 * SECTIONS render for the active tab — the load/save logic below is
 * untouched and still operates on the full flat SECTIONS list. */
const SECTION_GROUPS: { id: string; label: string; labelBn: string; sectionIds: string[] }[] = [
  { id: "branding", label: "Branding & Contact", labelBn: "ব্র্যান্ডিং ও যোগাযোগ",
    sectionIds: ["brand_core", "company_info", "social_links"] },
  { id: "store", label: "Store & Checkout", labelBn: "দোকান ও চেকআউট",
    sectionIds: ["ecommerce_config"] },
  { id: "email", label: "Email", labelBn: "ইমেইল",
    sectionIds: ["email_smtp"] },
  { id: "marketing", label: "Marketing & Search", labelBn: "মার্কেটিং ও সার্চ",
    sectionIds: ["marketing_config", "search_config"] },
  { id: "system", label: "System", labelBn: "সিস্টেম",
    sectionIds: ["site_features", "system_config", "demo_config"] },
];

const GROUP_ICONS: Record<string, React.ElementType> = { branding: Building2, store: ShoppingBag, email: Mail, marketing: Globe, system: Shield };

function groupForSection(sectionId: string): string {
  return SECTION_GROUPS.find((g) => g.sectionIds.includes(sectionId))?.id ?? SECTION_GROUPS[0].id;
}

function SectionCard({
  section,
  values,
  onChange,
  onSave,
  saving,
  savedId,
}: {
  section: Section;
  values: SettingValues;
  onChange: (key: string, val: string) => void;
  onSave: (sectionId: string) => void;
  saving: string | null;
  savedId: string | null;
}) {
  const isSaving = saving === section.id;
  const isSaved = savedId === section.id;

  return (
    <div id={section.id} className="admin-settings-section bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow overflow-hidden scroll-mt-24">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-brand-50 to-transparent dark:from-brand-900/20 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="text-brand-600">{section.icon}</span>
          <h2 className="admin-settings-heading text-sm font-semibold text-gray-800 dark:text-gray-100">{section.title}</h2>
        </div>
        <button
          onClick={() => onSave(section.id)}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-4 py-1.5 max-[899px]:min-h-[40px] rounded-lg text-sm font-medium transition-all ${
            isSaved
              ? "bg-green-500 text-white"
              : "bg-brand-600 text-white hover:bg-brand-700"
          } disabled:opacity-60`}
        >
          {isSaving
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : isSaved
              ? <Check className="w-3.5 h-3.5" />
              : <Save className="w-3.5 h-3.5" />
          }
          {isSaving ? "সংরক্ষণ হচ্ছে…" : isSaved ? "সংরক্ষিত!" : "সংরক্ষণ"}
        </button>
      </div>
      {section.note && (
        <div className="admin-settings-note px-6 py-2.5 bg-brand-50/50 border-b border-brand-100/60 text-xs text-brand-800 dark:text-blue-100 flex items-center gap-2 flex-wrap">
          {section.mediaLink ? <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" /> : <Info className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />}
          <span>{section.note}</span>
          {section.mediaLink && <Link href="/sumon/media" className="font-semibold underline hover:no-underline max-[899px]:inline-flex max-[899px]:items-center max-[899px]:min-h-[40px]">
            Image Manager খুলুন →
          </Link>}
        </div>
      )}
      <div className="divide-y divide-gray-50 dark:divide-white/5">
        {section.fields.map((field) => (
          <div key={field.key} className="px-4 sm:px-6 py-4 hover:bg-gray-50/40 dark:hover:bg-white/[0.02] transition-colors">
            <label className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              <span>{field.label}</span>
              {(() => {
                const from = field.translateFrom ?? (field.key.endsWith("_en") && section.fields.some((x) => x.key === field.key.replace(/_en$/, "_bn")) ? field.key.replace(/_en$/, "_bn") : undefined);
                return from ? (
                  <TranslateButton bn={values[from]} onResult={(en) => onChange(field.key, en)} en={values[field.key]} onResultBn={(b) => onChange(from, b)} />
                ) : null;
              })()}
              {/* ✨ AI only on customer-facing text (not links, keys, numbers or technical values). */}
              {!field.upload && (field.type === undefined || field.type === "text" || field.type === "textarea")
                && !/(url|email|phone|whatsapp|smtp|key|_id|pixel|gtm|gsc|verification|provider|currency|timezone|maintenance|maps|json|min_order|tax|_name$|_title$)/.test(field.key) && (
                <span className="normal-case tracking-normal"><AiTextMenu compact text={values[field.key] ?? ""} onApply={(v) => onChange(field.key, v)} context={`website setting: ${field.label}`} /></span>
              )}
            </label>
            {field.upload ? (
              <ImageUpload
                value={values[field.key] ?? ""}
                onChange={(url) => onChange(field.key, url)}
                folder="abo-enterprise/settings"
                accept={field.accept ?? "image"}
                purpose={field.purpose}
              />
            ) : field.type === "boolean" || field.key === "maintenance_mode" ? (
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={values[field.key] === "true"}
                  onClick={() => onChange(field.key, values[field.key] === "true" ? "false" : "true")}
                  className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${values[field.key] === "true" ? "bg-brand-600" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${values[field.key] === "true" ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className={`text-sm font-medium ${values[field.key] === "true" ? "text-brand-700" : "text-gray-500"}`}>
                  {values[field.key] === "true"
                    ? (field.key === "maintenance_mode" ? "Enabled — site is in maintenance" : "Enabled")
                    : (field.key === "maintenance_mode" ? "Disabled — site is live" : "Disabled")}
                </span>
              </label>
            ) : TRUST_EDITORS[field.key] ? (
              <JsonListEditor
                value={values[field.key] ?? ""}
                onChange={(json) => onChange(field.key, json)}
                fields={TRUST_EDITORS[field.key].fields}
                newItem={TRUST_EDITORS[field.key].newItem}
                mapKey={TRUST_EDITORS[field.key].mapKey}
                previewRow={TRUST_EDITORS[field.key].previewRow}
                aiContext={`Website setting list: ${field.label}`}
              />
            ) : field.type === "select" ? (
              <select
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                {(field.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-mono bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-y"
              />
            ) : (
              <input
                type={field.type ?? "text"}
                min={field.type === "number" ? 0 : undefined}
                autoComplete={field.type === "password" ? "new-password" : undefined}
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-white/5 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            )}
            {field.hint && (
              <p className="admin-settings-hint text-xs text-gray-400 dark:text-gray-300 mt-1">{field.hint}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [values, setValues] = useState<SettingValues>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [confirmMaintenance, setConfirmMaintenance] = useState<{ sectionId: string | "__all__" } | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>(SECTION_GROUPS[0].id);
  // Search across every group; a matching section title shows all its fields.
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visibleSections = q
    ? SECTIONS.map((sec) => (sec.title.toLowerCase().includes(q) ? sec : { ...sec, fields: sec.fields.filter((f) => `${f.label} ${f.hint ?? ""} ${f.key}`.toLowerCase().includes(q)) }))
        .filter((sec) => sec.fields.length > 0)
    : SECTIONS.filter((section) => groupForSection(section.id) === activeGroup);
  const filledCount = (ids: string[]): [number, number] => {
    const fs = SECTIONS.filter((sec) => ids.includes(sec.id)).flatMap((sec) => sec.fields).filter((f) => f.type !== "boolean");
    return [fs.filter((f) => String(values[f.key] ?? "").trim()).length, fs.length];
  };
  const toast = useToastStore((s) => s.push);

  // Keep the active tab in sync with the URL hash, so sidebar links like
  // /sumon/settings#company_info (and #marketing_config for "Marketing
  // & SEO") land on the right tab instead of a hidden one.
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) setActiveGroup(groupForSection(hash));
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // Sections only exist in the DOM once loaded (and once their tab is
  // active), so the browser's own "scroll to #hash on page load" can't find
  // the target in time. Do it ourselves once loading finishes.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      const raw = res.data.data as Record<string, unknown>;
      const flat: SettingValues = {};
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === "string") flat[k] = v;
      }
      // Pre-fill blank fields with the value the live site actually falls back
      // to, so the admin sees what's live rather than an empty box. DB values
      // always win; fields with no known default stay empty.
      for (const section of SECTIONS) {
        for (const f of section.fields) {
          if (f.defaultValue && !(flat[f.key] ?? "").trim()) flat[f.key] = f.defaultValue;
        }
      }
      setValues(flat);
    } catch {
      toast("error", "সেটিংস আনা যায়নি");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Keys edited but not yet saved — warns before leaving the page.
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  useUnsavedGuard(dirtyKeys.size > 0);
  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setDirtyKeys((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

  const validateUrls = (section: Section): string | null => {
    for (const f of section.fields) {
      const val = (values[f.key] ?? "").trim();
      if (!val) continue;
      if (f.type === "url" && !f.upload) {
        try { new URL(val); } catch { return `${f.label}: invalid URL`; }
      }
      if (f.key === "google_maps_embed") {
        if (!parseGoogleMapsEmbedInput(val)) {
          return `${f.label}: paste a Google Maps embed URL or full iframe code (Share → Embed a map)`;
        }
      }
      if (JSON_SETTING_KEYS.has(f.key) || f.key.endsWith("_json")) {
        try {
          JSON.parse(val);
        } catch {
          return `${f.label}: invalid JSON — check commas and quotes`;
        }
      }
    }
    return null;
  };

  const handleSaveAll = async () => {
    if (values.maintenance_mode === "true") { setConfirmMaintenance({ sectionId: "__all__" }); return; }
    await proceedSaveAll();
  };

  const proceedSaveAll = async () => {
    setSaving("__all__");
    let anyFailed = false;
    for (const section of SECTIONS) {
      const urlErr = validateUrls(section) ?? validateSettingValues(section.fields, values);
      if (urlErr) { toast("error", urlErr); anyFailed = true; continue; }

      try {
        const items = buildSaveItems(section, values);
        if (items.length === 0) continue;
        await adminApi.upsertSettings(items);
      } catch (e) {
        anyFailed = true;
        toast("error", apiErrorMessage(e, `“${section.title}” সংরক্ষণ করা যায়নি — ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।`));
      }
    }
    if (!anyFailed) {
      setDirtyKeys(new Set());
      setSavedId("__all__");
      setTimeout(() => setSavedId(null), 2500);
      toast("success", "সব সেটিং সংরক্ষিত হয়েছে");
    }
    setSaving(null);
  };

  const handleSave = async (sectionId: string) => {
    if (sectionId === "system_config" && values.maintenance_mode === "true") {
      setConfirmMaintenance({ sectionId });
      return;
    }
    await proceedSave(sectionId);
  };

  const proceedSave = async (sectionId: string) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;
    const urlErr = validateUrls(section) ?? validateSettingValues(section.fields, values);
    if (urlErr) { toast("error", urlErr); return; }

    setSaving(sectionId);
    try {
      const items = buildSaveItems(section, values);
      if (items.length === 0) {
        toast("info", "এই অংশে সংরক্ষণের মতো কিছু নেই");
        return;
      }
      await adminApi.upsertSettings(items);
      setDirtyKeys((prev) => { const next = new Set(prev); section.fields.forEach((f) => next.delete(f.key)); return next; });
      setSavedId(sectionId);
      setTimeout(() => setSavedId(null), 2500);
      toast("success", `${section.title} — সংরক্ষিত হয়েছে`);
    } catch (e) {
      toast("error", apiErrorMessage(e, `“${section.title}” সংরক্ষণ করা যায়নি — ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।`));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Settings"
        titleBn="সাইট সেটিংস"
        description="Brand, contact, email, marketing and system settings"
        descriptionBn="ব্র্যান্ড, যোগাযোগ, ইমেইল, মার্কেটিং ও সিস্টেম — কুরিয়ার, কুপন/ফ্ল্যাশ সেল ও চেকআউট নিজ নিজ পাতায়"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={load} disabled={loading} className="btn btn-outline btn-sm min-h-11 gap-1.5">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden /> আবার আনুন
            </button>
            <button type="button" onClick={handleSaveAll} disabled={saving !== null || loading}
              className={`btn btn-primary btn-sm min-h-11 gap-1.5 ${savedId === "__all__" ? "!bg-green-600 hover:!bg-green-600" : ""}`}>
              {saving === "__all__" ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : savedId === "__all__" ? <Check className="w-4 h-4" aria-hidden /> : <SaveAll className="w-4 h-4" aria-hidden />}
              {saving === "__all__" ? "সংরক্ষণ হচ্ছে…" : savedId === "__all__" ? "সব সংরক্ষিত!" : "সব সংরক্ষণ"}
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6 lg:items-start">
          <nav aria-label="সেটিংসের ভাগ" className="lg:sticky lg:top-24 space-y-3 mb-4 lg:mb-0">
            <label className="relative block">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="সেটিং খুঁজুন…" aria-label="সেটিং খুঁজুন" className="input pl-9 min-h-11 w-full text-base" />
            </label>
            <div role="tablist" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:mx-0 lg:px-0 lg:flex-col lg:overflow-visible">
              {SECTION_GROUPS.map((g) => {
                const Icon = GROUP_ICONS[g.id] ?? SettingsIcon;
                const [done, total] = filledCount(g.sectionIds);
                const active = activeGroup === g.id && !q;
                return (
                  <button key={g.id} type="button" role="tab" aria-selected={active} onClick={() => { setQuery(""); setActiveGroup(g.id); }}
                    className={`flex items-center gap-2 min-h-11 px-3 rounded-xl text-sm font-medium whitespace-nowrap flex-none lg:w-full text-left transition-colors ${active ? "bg-brand-600 text-white shadow-sm" : "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 hover:border-brand-300"}`}>
                    <Icon className="w-4 h-4 flex-none" aria-hidden />
                    <span className="flex-1">{g.labelBn}</span>
                    {total > 0 && <span className={`text-xs ${active ? "text-white/80" : "text-gray-500"}`} title="পূরণ করা ঘর">{done.toLocaleString("bn-BD")}/{total.toLocaleString("bn-BD")}</span>}
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="space-y-6 min-w-0">
            {q && visibleSections.length === 0 && (
              <div className="admin-card p-8 text-center text-gray-500">“{query}” — এমন কোনো সেটিং পাওয়া যায়নি</div>
            )}
            {visibleSections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                values={values}
                onChange={handleChange}
                onSave={handleSave}
                saving={saving}
                savedId={savedId}
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-800 mb-2">হোস্টিং-এ রাখা সেটিং</h3>
        <p className="text-sm text-amber-700">
          কয়েকটি মূল নিরাপত্তা-চাবি এখানে নয়, সরাসরি হোস্টিং-এ রাখা হয় — সেগুলো ডেভেলপার দেখেন। ইমেইল (SMTP) এখানেই দেওয়া যায়;
          এখানে দিলে হোস্টিং-এর মান বাদ দিয়ে এটিই চলে, আর পাসওয়ার্ড লুকানো অবস্থায় সংরক্ষিত থাকে।
        </p>
      </div>

      <ConfirmDialog
        open={!!confirmMaintenance}
        title="রক্ষণাবেক্ষণ মোড চালু করবেন?"
        message="বন্ধ না করা পর্যন্ত লাইভ ওয়েবসাইট সব ভিজিটরের জন্য বন্ধ থাকবে। এখনই দরকার হলে তবেই চালু করুন।"
        confirmLabel="সংরক্ষণ ও চালু"
        variant="warning"
        onConfirm={() => {
          const target = confirmMaintenance;
          setConfirmMaintenance(null);
          if (!target) return;
          if (target.sectionId === "__all__") void proceedSaveAll();
          else void proceedSave(target.sectionId);
        }}
        onCancel={() => setConfirmMaintenance(null)}
      />
    </div>
  );
}
