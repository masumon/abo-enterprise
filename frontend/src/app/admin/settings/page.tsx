"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/api";
import ImageUpload from "@/components/admin/ImageUpload";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Save, RefreshCw, Loader2, Building2, Share2, ImageIcon, ShoppingBag, MapPin, Check, SaveAll, Shield, Globe, Users, Trophy, Zap, Code, Mail } from "lucide-react";
import { useToastStore } from "@/store/toast";
import { parseGoogleMapsEmbedInput } from "@/lib/maps";
import { apiErrorMessage } from "@/lib/apiError";

type SettingValues = Record<string, string>;

const HIDDEN_PLACEHOLDER = "***HIDDEN***";

const JSON_SETTING_KEYS = new Set([
  "about_team_json",
  "client_logos_json",
  "demo_reviews_json",
  "demo_products_json",
  "demo_services_json",
  "coupons_json",
]);

const BOOL_SETTING_KEYS = new Set([
  "maintenance_mode",
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
  type?: "text" | "url" | "email" | "tel" | "number" | "textarea" | "boolean" | "datetime-local" | "password";
  hint?: string;
  upload?: boolean;
  accept?: "image" | "video" | "both";
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  fields: SettingField[];
  /** Info line rendered under the section header (e.g. Image Manager pointer). */
  note?: string;
}

const SECTIONS: Section[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // BRAND ASSETS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "brand_core",
    title: "Brand Identity",
    icon: <Building2 className="w-4 h-4" />,
    // Logo/favicon/PWA icon/OG image moved to the Image Manager — one place
    // for every image, with size guides, preview and auto-optimize.
    note: "লোগো, ফ্যাভিকন, PWA আইকন ও OG ছবি এখন Image Manager-এ (ছবি ব্যবস্থাপনা) — সব ছবি এক জায়গায়।",
    fields: [
      { key: "site_name", label: "Company Name", placeholder: "ABO Enterprise" },
      { key: "site_tagline", label: "Tagline", placeholder: "সহজ সমাধান" },
      { key: "site_url", label: "Site URL", type: "url", placeholder: "https://www.aboenterprise.com", hint: "Your live website address. Used for the 'View in Admin' & order-tracking links in emails. No trailing slash." },
    ],
  },
  {
    id: "company_info",
    title: "Contact & Location",
    icon: <MapPin className="w-4 h-4" />,
    fields: [
      { key: "contact_phone", label: "Phone", type: "tel", placeholder: "01825007977" },
      { key: "contact_email", label: "Email", type: "email", placeholder: "info@aboenterprise.com", hint: "Shown on the site (footer, contact, invoices). Editable here — no redeploy." },
      { key: "contact_address", label: "Address", type: "textarea", placeholder: "Hazi Bahar Uddin Market, Abdullapur, Bairagibazar-3170, Beanibazar, Sylhet, Bangladesh" },
      { key: "contact_hours_en", label: "Business Hours (EN)", placeholder: "Sat–Thu, 9:00 AM – 9:00 PM", hint: "Shown in the footer, homepage and contact page" },
      { key: "contact_hours_bn", label: "Business Hours (বাংলা)", placeholder: "শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা" },
      { key: "google_maps_embed", label: "Google Maps Embed", type: "textarea", hint: "Share → Embed a map", placeholder: "Paste iframe or URL" },
      { key: "google_maps_api_key", label: "Google Maps API Key", placeholder: "AIza..." },
    ],
  },
  {
    id: "email_smtp",
    title: "Email & SMTP",
    icon: <Mail className="w-4 h-4" />,
    note: "এখানে সেট করলে ইমেইল পাঠানো চালু হয় — env ছাড়াই। Gmail: Host smtp.gmail.com · Port 587 · User আপনার Gmail · Password একটি Gmail App Password (সাধারণ পাসওয়ার্ড নয়)।",
    fields: [
      { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
      { key: "smtp_port", label: "SMTP Port", type: "number", placeholder: "587" },
      { key: "smtp_user", label: "SMTP User", placeholder: "info@aboenterprise.com" },
      { key: "smtp_password", label: "SMTP Password / App Password", type: "password", placeholder: "•••• •••• •••• ••••", hint: "Gmail: 16-char App Password. Stored masked; not shown again." },
      { key: "smtp_from", label: "From Address", type: "email", placeholder: "info@aboenterprise.com" },
      { key: "smtp_from_name", label: "From Name", placeholder: "ABO Enterprise" },
      { key: "admin_notify_email", label: "Notifications To", type: "email", placeholder: "info@aboenterprise.com", hint: "New orders/bookings/leads are emailed here." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // HERO ASSETS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "hero_homepage",
    title: "Homepage Hero",
    icon: <ImageIcon className="w-4 h-4" />,
    fields: [
      { key: "hero_title_en", label: "Title (EN)", placeholder: "ABO ENTERPRISE : Simple Solution" },
      { key: "hero_title_bn", label: "Title (বাংলা)", placeholder: "এবিও এন্টারপ্রাইজ : সহজ সমাধান" },
      { key: "hero_subtitle_en", label: "Subtitle (EN)", type: "textarea", placeholder: "Simple Solution — products, services, software & AI in one place." },
      { key: "hero_subtitle_bn", label: "Subtitle (বাংলা)", type: "textarea", placeholder: "সহজ সমাধান — পণ্য, সেবা, সফটওয়্যার ও AI এক প্ল্যাটফর্মে।" },
      { key: "hero_cta_text", label: "CTA Button Text", placeholder: "Shop Now" },
      { key: "hero_cta_url", label: "CTA Button Link", type: "url", placeholder: "/products" },
    ],
    note: "হোমপেজ ব্যানার ছবি এখন Image Manager → Brand & Site ট্যাবে।",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // HOMEPAGE SECTIONS (JSON)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "homepage_sections",
    title: "Homepage Sections (JSON)",
    icon: <ImageIcon className="w-4 h-4" />,
    note: "খালি রাখলে ডিফল্ট কনটেন্ট দেখাবে। JSON সেট করলে সেই সেকশন Admin থেকে চলবে।",
    fields: [
      {
        key: "site_announcements_json",
        label: "Announcement Bar Messages",
        type: "textarea",
        placeholder: '[{"en":"Free delivery over ৳2000","bn":"৳২০০০+ ফ্রি ডেলিভারি","href":"/products"}]',
        hint: "Array with en, bn, href",
      },
      {
        key: "site_trust_badges_json",
        label: "Trust Badges",
        type: "textarea",
        placeholder: '[{"icon":"award","en":"8+ Years Experience","bn":"৮+ বছরের অভিজ্ঞতা"}]',
        hint: "Icons: award, users, globe, headphones, shield, credit-card, truck, store, clock",
      },
      {
        key: "site_why_choose_json",
        label: "Why Choose Us Cards",
        type: "textarea",
        placeholder: '[{"icon":"award","title_en":"...","title_bn":"...","desc_en":"...","desc_bn":"..."}]',
        hint: "Icons: award, store, globe, wrench, bot, truck, shield, users, headphones",
      },
      {
        key: "site_faq_json",
        label: "FAQ Items (Home + FAQ page)",
        type: "textarea",
        placeholder: '[{"q_en":"...","q_bn":"...","a_en":"...","a_bn":"...","category":"general"}]',
        hint: "Categories: general, products, services, software, payment, shipping",
      },
      {
        key: "site_quick_categories_json",
        label: "Quick Category Tiles",
        type: "textarea",
        placeholder: '[{"icon":"smartphone","label_en":"...","label_bn":"...","desc_en":"...","desc_bn":"...","href":"/products"}]',
        hint: "Icons: smartphone, file-text, wrench, briefcase, bot, globe, headphones, shopping-bag, printer, calendar",
      },
      {
        key: "site_entry_points_json",
        label: "Entry Point Cards",
        type: "textarea",
        placeholder: '[{"icon":"shopping-bag","title_en":"...","title_bn":"...","desc_en":"...","desc_bn":"...","cta_en":"...","cta_bn":"...","href":"/products","tags_en":["..."],"tags_bn":["..."]}]',
        hint: "Icons: shopping-bag, calendar, briefcase, bot, wrench, globe",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE BANNERS (All 25 Pages)
  // ═══════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════
  // TRUST ASSETS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "trust_media",
    title: "Trust Assets (JSON)",
    icon: <Trophy className="w-4 h-4" />,
    fields: [
      { key: "about_team_json", label: "Team Members", type: "textarea", hint: "Array with name, role, photo_url, bio" },
      { key: "client_logos_json", label: "Client Logos", type: "textarea", hint: "Array with name, logo_url" },
      { key: "demo_reviews_json", label: "Testimonials", type: "textarea", hint: "Array with name, review, photo_url, rating" },
    ],
  },
  {
    id: "additional_assets",
    title: "Additional Assets",
    icon: <ImageIcon className="w-4 h-4" />,
    note: "অফিস ফটো ও About Story ছবি এখন Image Manager → Brand & Site ট্যাবে।",
    fields: [
      { key: "trade_license", label: "Trade License / TIN", placeholder: "TL-XXXXX", hint: "Footer trust badge" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // COMMERCE SETTINGS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ecommerce_config",
    title: "E-Commerce Settings",
    icon: <ShoppingBag className="w-4 h-4" />,
    fields: [
      { key: "currency", label: "Currency", placeholder: "BDT" },
      { key: "min_order_amount", label: "Min Order (৳)", type: "number", placeholder: "200" },
      { key: "free_delivery_min_amount", label: "Free Delivery Min (৳)", type: "number", placeholder: "2000" },
    ],
  },
  {
    id: "delivery_config",
    title: "Delivery Settings",
    icon: <ShoppingBag className="w-4 h-4" />,
    fields: [
      { key: "delivery_charge_sylhet", label: "Sylhet (৳)", type: "number", placeholder: "0" },
      { key: "delivery_charge_dhaka", label: "Dhaka (৳)", type: "number", placeholder: "60" },
      { key: "delivery_charge_outside", label: "Outside (৳)", type: "number", placeholder: "120" },
      { key: "courier_pathao_url", label: "Pathao Tracking URL", placeholder: "https://merchant.pathao.com/tracking?consignment_id={tracking_id}" },
      { key: "courier_steadfast_url", label: "Steadfast Tracking URL", placeholder: "https://steadfast.com.bd/t/{tracking_id}" },
    ],
  },
  {
    id: "checkout_config",
    title: "Checkout Options",
    icon: <ShoppingBag className="w-4 h-4" />,
    fields: [
      { key: "checkout_confirm_channel", label: "Order Confirm Channel", placeholder: "none" },
      { key: "checkout_otp_required", label: "Require Phone OTP", placeholder: "false", hint: "true/false" },
      { key: "whatsapp_number", label: "WhatsApp Order Number", placeholder: "8801825007977" },
      {
        key: "coupons_json",
        label: "Coupon Codes (JSON)",
        type: "textarea",
        placeholder: '{"ABO10":{"discount_percent":10,"min_subtotal":0,"active":true}}',
        hint: "Admin-editable coupons",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MARKETING & SOCIAL
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "social_links",
    title: "Social Media Links",
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
    title: "Marketing & Analytics",
    icon: <Zap className="w-4 h-4" />,
    fields: [
      { key: "facebook_pixel_id", label: "Facebook Pixel ID", placeholder: "1234567890", hint: "Conversion tracking" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FLASH SALE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "flash_sale",
    title: "Flash Sale",
    icon: <Zap className="w-4 h-4" />,
    fields: [
      { key: "feature_flash_sale", label: "Enable Flash Sale", type: "boolean", hint: "Shows the homepage countdown banner" },
      { key: "flash_sale_title_en", label: "Title (EN)", placeholder: "Flash Sale" },
      { key: "flash_sale_title_bn", label: "Title (বাংলা)", placeholder: "ফ্ল্যাশ সেল" },
      { key: "flash_sale_start", label: "Start (optional)", type: "datetime-local", hint: "Leave blank to start immediately" },
      { key: "flash_sale_end", label: "End", type: "datetime-local", hint: "Countdown target. Blank = end of this week (Sun 23:59)." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FEATURES & TOOLS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "site_features",
    title: "Site Features",
    icon: <Zap className="w-4 h-4" />,
    fields: [
      { key: "feature_coupons", label: "Coupons", type: "boolean", hint: "Checkout coupon field" },
      { key: "feature_guest_checkout", label: "Guest Checkout", type: "boolean" },
      { key: "feature_newsletter", label: "Newsletter", type: "boolean", hint: "Footer signup" },
      { key: "feature_infinite_scroll", label: "Infinite Scroll", type: "boolean", hint: "Product load-more" },
      { key: "feature_assistant_chat", label: "AI Chat Widget", type: "boolean" },
      { key: "feature_assistant_whatsapp", label: "Assistant WhatsApp", type: "boolean" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SYSTEM
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "system_config",
    title: "System Settings",
    icon: <Shield className="w-4 h-4" />,
    fields: [
      { key: "timezone", label: "Timezone", placeholder: "Asia/Dhaka" },
      { key: "maintenance_mode", label: "Maintenance Mode", type: "text" as const, placeholder: "false", hint: "true to disable site" },
    ],
  },
  {
    id: "demo_config",
    title: "Demo & Offline Fallback",
    icon: <RefreshCw className="w-4 h-4" />,
    fields: [
      { key: "demo_fallback_enabled", label: "Enable Demo Mode", placeholder: "true", hint: "Show demo when API slow" },
      { key: "demo_notice_en", label: "Demo Notice (EN)", type: "textarea", placeholder: "Slow connection — showing demo content..." },
      { key: "demo_notice_bn", label: "Demo Notice (বাংলা)", type: "textarea", placeholder: "ধীর নেটওয়ার্ক — ডেমো কন্টেন্ট দেখানো হচ্ছে..." },
      { key: "demo_products_json", label: "Demo Products (JSON)", type: "textarea", placeholder: '[{"slug":"...","name_en":"..."}]', hint: "Optional; leave blank for defaults" },
      { key: "demo_services_json", label: "Demo Services (JSON)", type: "textarea", placeholder: '[{"slug":"...","name_en":"..."}]', hint: "Optional; leave blank for defaults" },
    ],
  },
];

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
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-brand-50 to-transparent dark:from-brand-900/20 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="text-brand-600">{section.icon}</span>
          <h2 className="text-sm font-semibold text-gray-800">{section.title}</h2>
        </div>
        <button
          onClick={() => onSave(section.id)}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
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
          {isSaving ? "Saving…" : isSaved ? "Saved!" : "Save"}
        </button>
      </div>
      {section.note && (
        <div className="px-6 py-2.5 bg-brand-50/50 border-b border-brand-100/60 text-xs text-brand-800 flex items-center gap-2 flex-wrap">
          <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{section.note}</span>
          <Link href="/admin/media" className="font-semibold underline hover:no-underline">
            Image Manager খুলুন →
          </Link>
        </div>
      )}
      <div className="divide-y divide-gray-50 dark:divide-white/5">
        {section.fields.map((field) => (
          <div key={field.key} className="px-4 sm:px-6 py-4 hover:bg-gray-50/40 dark:hover:bg-white/[0.02] transition-colors">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              {field.label}
            </label>
            {field.upload ? (
              <ImageUpload
                value={values[field.key] ?? ""}
                onChange={(url) => onChange(field.key, url)}
                folder="abo-enterprise/settings"
                accept={field.accept ?? "image"}
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            )}
            {field.hint && (
              <p className="text-xs text-gray-400 mt-1">{field.hint}</p>
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
  const toast = useToastStore((s) => s.push);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      const raw = res.data.data as Record<string, unknown>;
      const flat: SettingValues = {};
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === "string") flat[k] = v;
      }
      setValues(flat);
    } catch {
      toast("error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
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
    setSaving("__all__");
    let anyFailed = false;
    for (const section of SECTIONS) {
      const urlErr = validateUrls(section);
      if (urlErr) { toast("error", urlErr); anyFailed = true; continue; }

      try {
        const items = buildSaveItems(section, values);
        if (items.length === 0) continue;
        await adminApi.upsertSettings(items);
      } catch (e) {
        anyFailed = true;
        toast("error", apiErrorMessage(e, `Could not save “${section.title}”. Check your connection and try again.`));
      }
    }
    if (!anyFailed) {
      setSavedId("__all__");
      setTimeout(() => setSavedId(null), 2500);
      toast("success", "All settings saved");
    }
    setSaving(null);
  };

  const handleSave = async (sectionId: string) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;
    const urlErr = validateUrls(section);
    if (urlErr) { toast("error", urlErr); return; }

    setSaving(sectionId);
    try {
      const items = buildSaveItems(section, values);
      if (items.length === 0) {
        toast("info", "No editable fields to save in this section");
        return;
      }
      await adminApi.upsertSettings(items);
      setSavedId(sectionId);
      setTimeout(() => setSavedId(null), 2500);
      toast("success", `${section.title} saved`);
    } catch (e) {
      toast("error", apiErrorMessage(e, `Could not save “${section.title}”. Check your connection and try again.`));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        titleBn="সাইট সেটিংস"
        description="ব্র্যান্ডিং, যোগাযোগ, ডেলিভারি, পেমেন্ট ও মার্কেটিং কনফিগার করুন"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={load}
              disabled={loading}
              className="admin-btn-secondary !py-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving !== null || loading}
              className={`admin-btn-primary !py-2 ${savedId === "__all__" ? "!bg-green-600 hover:!bg-green-600" : ""}`}
            >
              {saving === "__all__"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : savedId === "__all__"
                  ? <Check className="w-4 h-4" />
                  : <SaveAll className="w-4 h-4" />
              }
              {saving === "__all__" ? "Saving…" : savedId === "__all__" ? "All Saved!" : "Save All"}
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
        <div className="space-y-6 max-w-3xl">
          {SECTIONS.map((section) => (
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
          <div className="admin-card p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-brand-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">পেজ ব্যানার ও সব ছবি</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  সব পেজের ব্যানার, ব্র্যান্ড ছবি ও গ্যালারি এক জায়গা থেকে ম্যানেজ করুন — Media Library-তে।
                </p>
              </div>
            </div>
            <Link href="/admin/media" className="btn btn-outline btn-sm flex-shrink-0">
              Media Library →
            </Link>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-800 mb-2">Environment Variables</h3>
        <p className="text-sm text-amber-700">
          Core secrets like <code className="bg-amber-100 px-1 rounded">SECRET_KEY</code> and{" "}
          <code className="bg-amber-100 px-1 rounded">DATABASE_URL</code> are managed via Render
          environment variables. Email/SMTP can now be set here (Email &amp; SMTP section) — those
          values override the env defaults, and the SMTP password is stored masked.
        </p>
      </div>
    </div>
  );
}
