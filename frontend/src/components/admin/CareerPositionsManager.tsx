"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { useLanguageStore } from "@/store/language";
import { SITE_CAREER_POSITIONS_KEY, getCareerPositions, type CmsCareerPosition } from "@/lib/cmsContent";

function blank(): CmsCareerPosition {
  return {
    id: `pos_${Date.now()}`,
    title: { en: "", bn: "" },
    type: { en: "Full-time", bn: "ফুল-টাইম" },
    location: { en: "Sylhet", bn: "সিলেট" },
    active: true,
  };
}

/**
 * Manages the "Open Positions" list shown on /career. This was previously
 * unwired entirely — the public page's dropdown was always empty and no
 * application could ever be submitted. Uses the same generic settings-JSON
 * CMS pattern as Announcements/Promo Slides, so no backend change is needed:
 * upsertSettings creates the key on first save, updateSetting-style PUT
 * would have 404'd since this key never existed before.
 */
export default function CareerPositionsManager() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const toast = useToastStore((s) => s.push);
  const [items, setItems] = useState<CmsCareerPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((r) => setItems(getCareerPositions(r.data.data ?? {}, [])))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const update = (i: number, patch: Partial<CmsCareerPosition>) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => setItems((list) => list.filter((_, idx) => idx !== i));

  const save = async () => {
    const cleaned = items.filter((it) => it.title.en.trim() || it.title.bn.trim());
    setSaving(true);
    try {
      await adminApi.upsertSettings([
        { key: SITE_CAREER_POSITIONS_KEY, value: JSON.stringify(cleaned), data_type: "json", description: "Open job positions shown on /career" },
      ]);
      setItems(cleaned);
      toast("success", bn ? "পদ সংরক্ষিত হয়েছে" : "Positions saved");
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-heading">{bn ? "খোলা পদ" : "Open Positions"}</h2>
          <p className="text-xs text-muted mt-0.5">
            {bn ? "ক্যারিয়ার পেজের 'পদ নির্বাচন' তালিকা এখান থেকে নিয়ন্ত্রিত" : "Controls the position dropdown on the public Careers page"}
          </p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="btn btn-brand btn-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {bn ? "সংরক্ষণ" : "Save"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={it.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={it.title.en} onChange={(e) => update(i, { title: { ...it.title, en: e.target.value } })} placeholder="Position title (EN)" className="input text-sm" />
                <input value={it.title.bn} onChange={(e) => update(i, { title: { ...it.title, bn: e.target.value } })} placeholder="পদের নাম (বাংলা)" className="input text-sm" />
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <input value={it.type.en} onChange={(e) => update(i, { type: { ...it.type, en: e.target.value } })} placeholder="Full-time / Part-time" className="input text-sm" />
                <input value={it.location.en} onChange={(e) => update(i, { location: { ...it.location, en: e.target.value } })} placeholder="Location" className="input text-sm" />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm text-muted">
                    <input type="checkbox" checked={it.active !== false} onChange={(e) => update(i, { active: e.target.checked })} className="rounded" />
                    {bn ? "চালু" : "Active"}
                  </label>
                  <button type="button" onClick={() => remove(i)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0" aria-label={bn ? "মুছুন" : "Delete"}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setItems((l) => [...l, blank()])} className="btn btn-outline btn-sm w-full">
            <Plus className="w-4 h-4" />
            {bn ? "নতুন পদ যোগ করুন" : "Add position"}
          </button>
        </div>
      )}
    </div>
  );
}
