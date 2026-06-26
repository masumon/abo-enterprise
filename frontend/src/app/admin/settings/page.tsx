"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Save, RefreshCw, Settings2 } from "lucide-react";

const EDITABLE_KEYS = [
  "site_name",
  "contact_phone",
  "contact_email",
  "delivery_charge_dhaka",
  "delivery_charge_outside",
  "min_order_amount",
  "maintenance_mode",
];

const LABEL_MAP: Record<string, string> = {
  site_name: "Site Name",
  contact_phone: "Contact Phone",
  contact_email: "Contact Email",
  delivery_charge_dhaka: "Delivery Charge — Dhaka (৳)",
  delivery_charge_outside: "Delivery Charge — Outside Dhaka (৳)",
  min_order_amount: "Minimum Order Amount (৳)",
  maintenance_mode: "Maintenance Mode",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      const data = res.data.data as Record<string, string>;
      setSettings(data);
      setEdited(data);
    } catch {
      // settings table may be empty on fresh deploy
    } finally {
      setLoading(false);
    }
  }

  async function save(key: string) {
    setSaving(key);
    setActionError(null);
    try {
      await adminApi.updateSetting(key, { value: edited[key] ?? "" });
      setSettings((prev) => ({ ...prev, [key]: edited[key] ?? "" }));
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      setActionError("Failed to save. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  const displayKeys = loading ? [] : EDITABLE_KEYS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure business and site settings</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {displayKeys.map((key) => {
            const value = edited[key] ?? settings[key] ?? "";
            const isDirty = (edited[key] ?? "") !== (settings[key] ?? "");
            const isSaving = saving === key;
            const isSaved = saved === key;

            return (
              <div key={key} className="p-5 flex items-center gap-4">
                <Settings2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {LABEL_MAP[key] ?? key}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                      setEdited((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <button
                  onClick={() => save(key)}
                  disabled={!isDirty || isSaving}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                    isSaved
                      ? "bg-green-500 text-white"
                      : isDirty
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Saving…" : isSaved ? "Saved!" : "Save"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* JWT / Env info card */}
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
