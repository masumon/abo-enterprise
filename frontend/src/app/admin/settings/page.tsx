"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/api";
import ImageUpload from "@/components/admin/ImageUpload";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Save, RefreshCw, Loader2, Building2, Share2, ImageIcon, ShoppingBag, MapPin, Check, SaveAll, Shield, Globe, Users, Trophy, Zap, Code } from "lucide-react";
import { useToastStore } from "@/store/toast";
import { parseGoogleMapsEmbedInput } from "@/lib/maps";
import { PAGE_BANNER_CONFIG, bannerSettingKey } from "@/lib/pageBanners";
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
  type?: "text" | "url" | "email" | "tel" | "number" | "textarea" | "boolean" | "datetime-local";
  hint?: string;
  upload?: boolean;
  accept?: "image" | "video" | "both";
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  fields: SettingField[];
}

const SECTIONS: Section[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // BRAND ASSETS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "brand_core",
    title: "Brand Identity",
    icon: <Building2 className="w-4 h-4" />,
    fields: [
      { key: "site_name", label: "Company Name", placeholder: "ABO Enterprise" },
      { key: "site_tagline", label: "Tagline", placeholder: "সহজ সমাধান" },
      { key: "logo_url", label: "Logo (PNG/SVG)", type: "url", upload: true, placeholder: "https://..." },
      { key: "favicon_url", label: "Favicon (ICO/PNG)", type: "url", upload: true, placeholder: "https://.../favicon.ico" },
      { key: "app_icon_url", label: "PWA Icon (192×192 or 512×512)", type: "url", upload: true, placeholder: "https://..." },
      { key: "default_og_image_url", label: "Default OG Image (1200×630)", type: "url", upload: true, placeholder: "https://...", hint: "Fallback for social shares" },
    ],
  },
  {
    id: "company_info",
    title: "Contact & Location",
    icon: <MapPin className="w-4 h-4" />,
    fields: [
      { key: "contact_phone", label: "Phone", type: "tel", placeholder: "01825007977" },
      { key: "contact_email", label: "Email", type: "email", placeholder: "info@aboenterprise.com" },
      { key: "contact_address", label: "Address", type: "textarea", placeholder: "Hazi Bahar Uddin Market, Abdullapur, Bairagibazar-3170, Beanibazar, Sylhet, Bangladesh" },
      { key: "google_maps_embed", label: "Google Maps Embed", type: "textarea", hint: "Share → Embed a map", placeholder: "Paste iframe or URL" },
      { key: "google_maps_api_key", label: "Google Maps API Key", placeholder: "AIza..." },
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
      { key: "hero_image_url", label: "Hero Image (1920×1080)", type: "url", upload: true, placeholder: "https://..." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE BANNERS (All 25 Pages)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "page_banners",
    title: "Page Banners (All Pages)",
    icon: <ImageIcon className="w-4 h-4" />,
    fields: PAGE_BANNER_CONFIG.map(({ key, label, hint }) => ({
      key: bannerSettingKey(key),
      label: `${label}`,
      type: "url" as const,
      upload: true,
      placeholder: "https://...",
      hint: hint ?? "1920×1080 recommended",
    })),
  },

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
    fields: [
      { key: "gallery_office_image_url", label: "Office Photo (1920×1080)", type: "url", upload: true, placeholder: "https://..." },
      { key: "about_story_image_url", label: "About Story Image (1920×1080)", type: "url", upload: true, placeholder: "https://..." },
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 gap-3 flex-wrap">
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
      <div className="divide-y divide-gray-50">
        {section.fields.map((field) => (
          <div key={field.key} className="px-6 py-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none"
              />
            ) : (
              <input
                type={field.type ?? "text"}
                min={field.type === "number" ? 0 : undefined}
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
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-800 mb-2">Environment Variables</h3>
        <p className="text-sm text-amber-700">
          Secrets like <code className="bg-amber-100 px-1 rounded">JWT_SECRET_KEY</code>,{" "}
          <code className="bg-amber-100 px-1 rounded">SMTP_PASSWORD</code>, and{" "}
          <code className="bg-amber-100 px-1 rounded">DATABASE_URL</code> are managed via
          Render environment variables — not stored here.
        </p>
      </div>
    </div>
  );
}
