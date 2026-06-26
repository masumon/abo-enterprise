'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { adminApi } from '@/lib/api';
import { Save, AlertCircle, Check } from 'lucide-react';

interface Setting {
  key: string;
  value: string;
  description?: string;
  is_secret?: boolean;
}

const IMPORTANT_SETTINGS = [
  { key: 'whatsapp_number', label: 'WhatsApp Number', type: 'tel', required: true },
  { key: 'business_email', label: 'Business Email', type: 'email', required: true },
  { key: 'business_phone', label: 'Business Phone', type: 'tel' },
  { key: 'business_name', label: 'Business Name', type: 'text' },
  { key: 'business_address', label: 'Business Address', type: 'textarea' },
];

export default function SettingsPage() {
  useAdmin();

  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editedKeys, setEditedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await adminApi.getSettings();
      if (response.success && response.data) {
        const settingsMap: Record<string, Setting> = {};
        Object.entries(response.data).forEach(([key, value]) => {
          settingsMap[key] = { key, value: String(value) };
        });
        setSettings(settingsMap);
      }
    } catch (error) {
      setMessage('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSetting(key: string) {
    setSaving(true);
    try {
      const setting = settings[key];
      const response = await adminApi.updateSetting(key, {
        value: setting.value,
        is_editable: true,
      });

      if (response.success) {
        setEditedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
        setMessage(`✓ ${key} updated successfully`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(`Failed to update ${key}`);
    } finally {
      setSaving(false);
    }
  }

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
    setEditedKeys((prev) => new Set([...prev, key]));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              message.includes('✓')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.includes('✓') ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Business Information</h2>
            <p className="text-sm text-gray-600">Update your business details and contact information</p>
          </div>

          {IMPORTANT_SETTINGS.map(({ key, label, type, required }) => {
            const setting = settings[key];
            const isEdited = editedKeys.has(key);

            return (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label}
                  {required && <span className="text-red-500">*</span>}
                </label>

                {type === 'textarea' ? (
                  <textarea
                    value={setting?.value || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="input w-full h-24 resize-none"
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                ) : (
                  <input
                    type={type}
                    value={setting?.value || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="input w-full"
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                )}

                {isEdited && (
                  <button
                    onClick={() => saveSetting(key)}
                    disabled={saving}
                    className="mt-2 btn btn-sm btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Tip:</strong> Your WhatsApp number and email will be used for order confirmations and customer notifications. Update these to match your current contact information.
          </p>
        </div>
      </div>
    </div>
  );
}
