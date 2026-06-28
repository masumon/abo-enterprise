"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/api";
import ImageUpload from "@/components/admin/ImageUpload";
import { Save, RefreshCw, Loader2, Building2, Share2, ImageIcon, ShoppingBag, MapPin, Check } from "lucide-react";
import { useToastStore } from "@/store/toast";

type SettingValues = Record<string, string>;

interface SettingField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "url" | "email" | "tel" | "number" | "textarea";
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
  {
    id: "company",
    title: "Company Info",
    icon: <Building2 className="w-4 h-4" />,
    fields: [
      { key: "site_name", label: "Site Name", placeholder: "ABO Enterprise" },
      { key: "site_tagline", label: "Site Tagline", placeholder: "Your one-stop shop in Sylhet" },
      { key: "logo_url", label: "Logo", type: "url", upload: true, placeholder: "https://..." },
      { key: "favicon_url", label: "Favicon", type: "url", upload: true, placeholder: "https://.../favicon.ico" },
      { key: "contact_phone", label: "Contact Phone", type: "tel", placeholder: "01825007977" },
      { key: "contact_email", label: "Contact Email", type: "email", placeholder: "info@aboenterprise.com" },
      { key: "contact_address", label: "Business Address", type: "textarea", placeholder: "Sylhet, Bangladesh" },
    ],
  },
  {
    id: "hero",
    title: "Hero / Banner",
    icon: <ImageIcon className="w-4 h-4" />,
    fields: [
      { key: "hero_title_en", label: "Hero Title (English)", placeholder: "Welcome to ABO Enterprise" },
      { key: "hero_subtitle_en", label: "Hero Subtitle (English)", type: "textarea", placeholder: "Your trusted tech & printing partner in Sylhet" },
      { key: "hero_title_bn", label: "Hero Title (বাংলা)", placeholder: "ABO Enterprise এ স্বাগতম" },
      { key: "hero_subtitle_bn", label: "Hero Subtitle (বাংলা)", type: "textarea", placeholder: "সিলেটের বিশ্বস্ত টেক ও প্রিন্টিং পার্টনার" },
      { key: "hero_cta_text", label: "CTA Button Text", placeholder: "Shop Now" },
      { key: "hero_cta_url", label: "CTA Button URL", type: "url", placeholder: "/products" },
      { key: "hero_image_url", label: "Hero Background Image", type: "url", upload: true, placeholder: "https://..." },
    ],
  },
  {
    id: "social",
    title: "Social Links",
    icon: <Share2 className="w-4 h-4" />,
    fields: [
      { key: "facebook_url", label: "Facebook Page URL", type: "url", placeholder: "https://facebook.com/aboenterprise" },
      { key: "instagram_url", label: "Instagram URL", type: "url", placeholder: "https://instagram.com/..." },
      { key: "twitter_url", label: "Twitter / X URL", type: "url", placeholder: "https://x.com/..." },
      { key: "linkedin_url", label: "LinkedIn URL", type: "url", placeholder: "https://linkedin.com/company/..." },
      { key: "youtube_url", label: "YouTube Channel URL", type: "url", placeholder: "https://youtube.com/@..." },
      { key: "tiktok_url", label: "TikTok URL", type: "url", placeholder: "https://tiktok.com/@..." },
    ],
  },
  {
    id: "ecommerce",
    title: "Business Settings",
    icon: <ShoppingBag className="w-4 h-4" />,
    fields: [
      { key: "currency", label: "Currency Code", placeholder: "BDT" },
      { key: "timezone", label: "Timezone", placeholder: "Asia/Dhaka" },
      { key: "delivery_charge_dhaka", label: "Delivery Charge — Dhaka (৳)", type: "number", placeholder: "60" },
      { key: "delivery_charge_outside", label: "Delivery Charge — Outside Dhaka (৳)", type: "number", placeholder: "120" },
      { key: "min_order_amount", label: "Minimum Order Amount (৳)", type: "number", placeholder: "200" },
      { key: "maintenance_mode", label: "Maintenance Mode", placeholder: "false", hint: "Set to 'true' to enable maintenance mode" },
    ],
  },
  {
    id: "location",
    title: "Map & Location",
    icon: <MapPin className="w-4 h-4" />,
    fields: [
      { key: "google_maps_embed", label: "Google Maps Embed URL", type: "textarea", placeholder: "https://www.google.com/maps/embed?pb=...", hint: "Paste the embed URL from Google Maps → Share → Embed a map" },
      { key: "google_maps_api_key", label: "Google Maps API Key (optional)", placeholder: "AIza...", hint: "Only needed if using the JS Maps API" },
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
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

  const handleSave = async (sectionId: string) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    setSaving(sectionId);
    try {
      const items = section.fields.map((f) => ({
        key: f.key,
        value: values[f.key] ?? "",
        data_type: f.type === "number" ? "number" : "string",
      }));
      await adminApi.upsertSettings(items);
      setSavedId(sectionId);
      setTimeout(() => setSavedId(null), 2500);
      toast("success", `${section.title} saved`);
    } catch {
      toast("error", `Failed to save ${section.title}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure business, branding and site settings</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
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
