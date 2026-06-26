"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Save, Plus, Trash2 } from "lucide-react";
import type { AdminSetting, PaymentMethod } from "@/types";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "email" | "payments">("general");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [settingsRes, paymentsRes] = await Promise.all([
        api.get("/admin/settings"),
        api.get("/admin/payment-methods"),
      ]);
      setSettings(settingsRes.data.data || []);
      setPaymentMethods(paymentsRes.data.data || []);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateSetting(settingId: string, value: string) {
    try {
      setSaving(true);
      await api.put(`/admin/settings/${settingId}`, { value });
      setSettings(
        settings.map((s) => (s.id === settingId ? { ...s, value } : s))
      );
    } catch (error) {
      console.error("Failed to update setting:", error);
      alert("Failed to save setting");
    } finally {
      setSaving(false);
    }
  }

  async function togglePaymentMethod(methodId: string, isActive: boolean) {
    try {
      setSaving(true);
      await api.put(`/admin/payment-methods/${methodId}`, {
        is_active: !isActive,
      });
      setPaymentMethods(
        paymentMethods.map((m) =>
          m.id === methodId ? { ...m, is_active: !isActive } : m
        )
      );
    } catch (error) {
      console.error("Failed to update payment method:", error);
    } finally {
      setSaving(false);
    }
  }

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, AdminSetting[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure business settings, email, and payment methods.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {[
          { id: "general", label: "General Settings" },
          { id: "email", label: "Email Configuration" },
          { id: "payments", label: "Payment Methods" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {Object.entries(groupedSettings).map(([category, categorySettings]) =>
            category !== "email" && category !== "payments" ? (
              <div key={category} className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 capitalize">
                  {category}
                </h2>
                <div className="space-y-4">
                  {categorySettings.map((setting) => (
                    <div key={setting.id} className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">
                        {setting.description_en || setting.key}
                      </label>
                      {setting.data_type === "boolean" ? (
                        <button
                          onClick={() =>
                            updateSetting(
                              setting.id,
                              setting.value === "true" ? "false" : "true"
                            )
                          }
                          disabled={saving}
                          className={`px-4 py-2 rounded-lg font-semibold transition ${
                            setting.value === "true"
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {setting.value === "true" ? "Enabled" : "Disabled"}
                        </button>
                      ) : (
                        <input
                          type={setting.data_type === "integer" ? "number" : "text"}
                          value={setting.value}
                          onChange={(e) => updateSetting(setting.id, e.target.value)}
                          disabled={saving || !setting.is_editable}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Email Configuration */}
      {activeTab === "email" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            {groupedSettings.email && groupedSettings.email.map((setting) => (
              <div key={setting.id} className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  {setting.description_en || setting.key}
                </label>
                <input
                  type="text"
                  value={setting.value}
                  onChange={(e) => updateSetting(setting.id, e.target.value)}
                  disabled={saving || !setting.is_editable}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Methods */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900 capitalize">
                  {method.payment_gateway.replace("_", " ")}
                </p>
                <p className="text-sm text-gray-600">
                  Commission: {method.commission_percentage}%
                </p>
                {method.min_amount && (
                  <p className="text-xs text-gray-500">
                    Min: ৳{method.min_amount} | Max: ৳{method.max_amount}
                  </p>
                )}
              </div>
              <button
                onClick={() =>
                  togglePaymentMethod(method.id, method.is_active)
                }
                disabled={saving}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  method.is_active
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {method.is_active ? "Active" : "Inactive"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
