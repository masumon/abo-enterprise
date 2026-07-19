"use client";

import { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { useLanguageStore } from "@/store/language";
import {
  SITE_ANNOUNCEMENTS_KEY,
  getAnnouncements,
  type CmsAnnouncement,
  type CmsAnnouncementVariant,
} from "@/lib/cmsContent";

const VARIANTS: { value: CmsAnnouncementVariant; label: string; swatch: string }[] = [
  { value: "promo", label: "Promo", swatch: "from-brand-700 via-brand-600 to-accent-600" },
  { value: "offer", label: "Offer", swatch: "from-accent-600 via-pink-600 to-rose-600" },
  { value: "info", label: "Info", swatch: "from-sky-700 to-blue-600" },
  { value: "success", label: "Success", swatch: "from-emerald-700 to-green-600" },
  { value: "notice", label: "Notice", swatch: "from-amber-500 to-orange-500" },
  { value: "urgent", label: "Urgent", swatch: "from-red-700 to-rose-600" },
];
const VARIANT_BG: Record<string, string> = Object.fromEntries(
  VARIANTS.map((v) => [v.value, `bg-gradient-to-r ${v.swatch}`])
);
const QUICK_ICONS = ["🎉", "📦", "🏷️", "🔔", "⚡", "🚚", "💼", "🎁", "🔥", "✅"];

// Same defaults the live AnnouncementBar shows until the admin saves — so an
// as-yet-unedited bar still appears here, ready to edit.
const FALLBACK: CmsAnnouncement[] = [
  { en: "🎉 New AI Solutions available! Get 20% off on first consultation →", bn: "🎉 নতুন AI সমাধান এসেছে! প্রথম পরামর্শে ২০% ছাড় পান →", href: "/services" },
  { en: "📦 Free delivery on orders over ৳2000 in Sylhet", bn: "📦 সিলেটে ৳২০০০+ অর্ডারে ফ্রি ডেলিভারি", href: "/products" },
  { en: "💼 Custom POS & ERP Software for your business — Book a free demo", bn: "💼 আপনার ব্যবসার জন্য কাস্টম POS ও ERP — ফ্রি ডেমো বুক করুন", href: "/projects" },
];

function blank(): CmsAnnouncement {
  return { en: "", bn: "", href: "/", variant: "promo", icon: "", dismissible: true, active: true };
}

export default function AdminAnnouncementsPage() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const toast = useToastStore((s) => s.push);
  const [items, setItems] = useState<CmsAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((r) => setItems(getAnnouncements(r.data.data ?? {}, FALLBACK)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const update = (i: number, patch: Partial<CmsAnnouncement>) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => setItems((list) => list.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setItems((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    const cleaned = items.filter((it) => it.en.trim() || it.bn.trim());
    setSaving(true);
    try {
      await adminApi.updateSetting(SITE_ANNOUNCEMENTS_KEY, { value: JSON.stringify(cleaned) });
      toast("success", bn ? "ঘোষণা সংরক্ষিত হয়েছে" : "Announcements saved");
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-heading">{bn ? "ঘোষণা বার" : "Announcements"}</h1>
            <p className="text-xs text-muted">{bn ? "অফার, নোটিশ ও তথ্য — স্টাইলসহ" : "Offers, notices & info — with styles"}</p>
          </div>
        </div>
        <button type="button" onClick={save} disabled={saving} className="btn btn-brand btn-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {bn ? "সংরক্ষণ" : "Save"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-4">
          {items.map((it, i) => (
            <div key={i} className="enterprise-card p-4 space-y-3">
              {/* Live preview */}
              <div className={`${VARIANT_BG[it.variant ?? "promo"]} text-white rounded-lg px-3 py-1.5 text-xs sm:text-sm flex items-center justify-center gap-2`}>
                {it.icon ? <span aria-hidden>{it.icon}</span> : null}
                <span className="truncate">{(bn ? it.bn : it.en) || (bn ? "প্রিভিউ" : "Preview")}</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                <input value={it.en} onChange={(e) => update(i, { en: e.target.value })} placeholder="English text" className="input" />
                <input value={it.bn} onChange={(e) => update(i, { bn: e.target.value })} placeholder="বাংলা টেক্সট" className="input" />
              </div>
              <input value={it.href} onChange={(e) => update(i, { href: e.target.value })} placeholder="/products or https://…" className="input" />

              <div className="flex flex-wrap items-center gap-2">
                <select value={it.variant ?? "promo"} onChange={(e) => update(i, { variant: e.target.value as CmsAnnouncementVariant })} className="input w-auto text-sm">
                  {VARIANTS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
                <input value={it.icon ?? ""} onChange={(e) => update(i, { icon: e.target.value })} placeholder="🎉" className="input w-16 text-center" maxLength={2} />
                <div className="flex gap-1">
                  {QUICK_ICONS.map((emo) => (
                    <button key={emo} type="button" onClick={() => update(i, { icon: emo })} className="w-7 h-7 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10 text-sm" aria-label={`icon ${emo}`}>{emo}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={it.active !== false} onChange={(e) => update(i, { active: e.target.checked })} className="rounded" />
                    {bn ? "চালু" : "Active"}
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={it.dismissible !== false} onChange={(e) => update(i, { dismissible: e.target.checked })} className="rounded" />
                    {bn ? "বন্ধযোগ্য (X)" : "Dismissible"}
                  </label>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="w-8 h-8 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-4 h-4" /></button>
                  <button type="button" onClick={() => remove(i)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={() => setItems((l) => [...l, blank()])} className="btn btn-outline btn-md w-full">
            <Plus className="w-4 h-4" />
            {bn ? "নতুন ঘোষণা" : "Add announcement"}
          </button>
        </div>
      )}
    </div>
  );
}
