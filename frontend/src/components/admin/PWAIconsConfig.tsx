"use client";

import { useState } from "react";
import { Smartphone, Monitor, Share2, Loader2, AlertCircle, Check } from "lucide-react";
import ImageUpload from "./ImageUpload";
import { useToastStore } from "@/store/toast";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface IconSize {
  size: number;
  type: "app" | "og";
  label: string;
  recommended: string;
}

const ICON_SIZES: IconSize[] = [
  { size: 192, type: "app", label: "Android App Icon", recommended: "192×192" },
  { size: 512, type: "app", label: "Large App Icon", recommended: "512×512" },
  { size: 1200, type: "og", label: "OG Image (Landscape)", recommended: "1200×630" },
  { size: 800, type: "og", label: "OG Image (Square)", recommended: "800×800" },
];

interface IconConfig {
  size: number;
  url: string;
  status: "pending" | "saved" | "error";
}

export default function PWAIconsConfig() {
  const [icons, setIcons] = useState<IconConfig[]>(
    ICON_SIZES.map((s) => ({ size: s.size, url: "", status: "pending" }))
  );
  const [saving, setSaving] = useState(false);
  const toast = useToastStore((s) => s.push);

  const handleIconChange = (index: number, url: string) => {
    const updated = [...icons];
    updated[index].url = url;
    updated[index].status = "pending";
    setIcons(updated);
  };

  const handleSaveAll = async () => {
    if (icons.every((i) => !i.url)) {
      toast("error", "Please configure at least one icon");
      return;
    }

    setSaving(true);
    try {
      const iconData = icons
        .filter((i) => i.url)
        .map((i) => ({
          size: i.size,
          url: i.url,
          type: ICON_SIZES.find((s) => s.size === i.size)?.type || "app",
        }));

      const items: Array<{ key: string; value: string; data_type?: string }> = [
        {
          key: "pwa_icons_config",
          value: JSON.stringify(iconData),
          data_type: "json",
        },
      ];
      await adminApi.saveSettings(items);

      const updated: IconConfig[] = icons.map((i) => ({
        size: i.size,
        url: i.url,
        status: i.url ? ("saved" as const) : ("pending" as const),
      }));
      setIcons(updated);
      toast("success", "PWA icons updated successfully");
    } catch (err) {
      const updated: IconConfig[] = icons.map((i) => ({
        size: i.size,
        url: i.url,
        status: i.url ? ("error" as const) : ("pending" as const),
      }));
      setIcons(updated);
      toast("error", "Failed to save icons");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">PWA & Social Icons</p>
            <p className="opacity-90">
              Configure app icons for Android, iOS, and social media previews. Recommended dimensions are shown for each size.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* App Icons */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Smartphone className="w-5 h-5 text-brand-600" />
            App Icons
          </div>

          {ICON_SIZES.filter((s) => s.type === "app").map((spec, idx) => {
            const iconIdx = icons.findIndex((i) => i.size === spec.size);
            const icon = icons[iconIdx];

            return (
              <div key={spec.size} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">
                    {spec.label}
                  </label>
                  <span className="text-xs text-gray-500">{spec.recommended}</span>
                </div>
                <ImageUpload
                  value={icon.url}
                  onChange={(url) => handleIconChange(iconIdx, url)}
                  folder="abo-enterprise/pwa-icons"
                  accept="image"
                  previewSize="sm"
                  showUrlInput={false}
                  hint={`${spec.size}×${spec.size} PNG or WebP recommended`}
                />
                {icon.status === "saved" && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3 h-3" />
                    Saved
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Social Media Icons */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Share2 className="w-5 h-5 text-brand-600" />
            Social Media Preview
          </div>

          {ICON_SIZES.filter((s) => s.type === "og").map((spec, idx) => {
            const iconIdx = icons.findIndex((i) => i.size === spec.size);
            const icon = icons[iconIdx];

            return (
              <div key={spec.size} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">
                    {spec.label}
                  </label>
                  <span className="text-xs text-gray-500">{spec.recommended}</span>
                </div>
                <ImageUpload
                  value={icon.url}
                  onChange={(url) => handleIconChange(iconIdx, url)}
                  folder="abo-enterprise/og-images"
                  accept="image"
                  previewSize="sm"
                  showUrlInput={false}
                  hint="Used when shared on social media"
                />
                {icon.status === "saved" && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3 h-3" />
                    Saved
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || icons.every((i) => !i.url)}
          className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? "Saving..." : "Save All Icons"}
        </button>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Icons are cached for 7 days</p>
        <p>• Use high-quality images (min 500×500px)</p>
        <p>• PNG or WebP format recommended</p>
      </div>
    </div>
  );
}
