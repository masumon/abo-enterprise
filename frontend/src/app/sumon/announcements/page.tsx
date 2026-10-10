"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2, Languages, Check, Zap, X } from "lucide-react";
import { ANNOUNCEMENT_VARIANT_BG } from "@/components/layout/AnnouncementBar";
import { cn } from "@/lib/utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import HomepageSectionNav from "@/components/admin/HomepageSectionNav";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { adminApi, adminBlogApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { useLanguageStore } from "@/store/language";
import {
  SITE_ANNOUNCEMENTS_KEY,
  getAnnouncements,
  type CmsAnnouncement,
  type CmsAnnouncementVariant,
} from "@/lib/cmsContent";

const VARIANTS: { value: CmsAnnouncementVariant; label: string; labelBn: string }[] = [
  { value: "promo", label: "Promo", labelBn: "প্রোমো" },
  { value: "offer", label: "Offer", labelBn: "অফার" },
  { value: "info", label: "Info", labelBn: "তথ্য" },
  { value: "success", label: "Good news", labelBn: "সুখবর" },
  { value: "notice", label: "Notice", labelBn: "নোটিশ" },
  { value: "urgent", label: "Urgent", labelBn: "জরুরি" },
];
// Same colours the live bar uses, so the preview here is exactly what visitors see.
const variantBg = (v?: string) => ANNOUNCEMENT_VARIANT_BG[v ?? "promo"] ?? ANNOUNCEMENT_VARIANT_BG.promo;
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
  const [translating, setTranslating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const touch = () => { setDirty(true); setJustSaved(false); };

  // Fill every announcement's empty Bengali text from its English text
  // (never overwrites text already written).
  const autoTranslateAll = async () => {
    if (translating) return;
    setTranslating(true);
    try {
      const next = await Promise.all(
        items.map(async (it) => {
          const en = (it.en ?? "").trim();
          if (!en || (it.bn ?? "").trim()) return it;
          try {
            const r = await adminBlogApi.translate(en, "en", "bn");
            const bnText = r.data?.data?.translated?.trim();
            return bnText ? { ...it, bn: bnText } : it;
          } catch {
            return it;
          }
        })
      );
      setItems(next);
      touch();
      toast("success", bn ? "বাংলা অনুবাদ পূরণ হয়েছে — সেভ করুন" : "Bangla filled — review & save");
    } catch {
      toast("error", bn ? "অনুবাদ ব্যর্থ" : "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  useEffect(() => {
    adminApi
      .getSettings()
      .then((r) => setItems(getAnnouncements(r.data.data ?? {}, FALLBACK)))
      .catch((err) => { setItems([]); toast("error", apiErrorMessage(err, "Failed to load announcements")); })
      .finally(() => setLoading(false));
  }, []);

  const update = (i: number, patch: Partial<CmsAnnouncement>) => {
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    touch();
  };
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const remove = (i: number) => { setItems((list) => list.filter((_, idx) => idx !== i)); touch(); };
  const performRemove = () => {
    if (deleteIndex === null) return;
    remove(deleteIndex);
    setDeleteIndex(null);
  };
  const move = (i: number, dir: -1 | 1) => {
    touch();
    setItems((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const save = async () => {
    const cleaned = items.filter((it) => (it.en ?? "").trim() || (it.bn ?? "").trim());
    setSaving(true);
    try {
      await adminApi.updateSetting(SITE_ANNOUNCEMENTS_KEY, { value: JSON.stringify(cleaned) });
      toast("success", bn ? "ঘোষণা সংরক্ষিত হয়েছে — ওয়েবসাইটে ১ মিনিটের মধ্যে দেখাবে" : "Announcements saved — live within a minute");
      setDirty(false);
      setJustSaved(true);
    } catch (err) {
      toast("error", apiErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const activeCount = items.filter((it) => it.active !== false && ((it.en ?? "").trim() || (it.bn ?? "").trim())).length;
  const saveStatus = dirty ? (
    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{bn ? "● অসংরক্ষিত পরিবর্তন" : "● Unsaved changes"}</span>
  ) : justSaved ? (
    <span className="text-xs font-medium text-green-600 dark:text-green-400 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" />{bn ? "সংরক্ষিত" : "Saved"}</span>
  ) : null;

  return (
    <div className="admin-page admin-page-narrow pb-24">
      <HomepageSectionNav />
      <AdminPageHeader
        title="Announcement Bar"
        titleBn="ঘোষণা বার"
        description="The scrolling strip at the very top of the website — offers, notices & info."
        descriptionBn="ওয়েবসাইটের একদম উপরে চলমান ছোট লেখা — অফার, নোটিশ ও তথ্য।"
        className="mb-4"
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {saveStatus}
            <button type="button" onClick={autoTranslateAll} disabled={translating || saving} className="btn btn-outline btn-sm gap-1.5 disabled:opacity-60" title="প্রতিটি ঘোষণার খালি বাংলা ঘর English থেকে অটো-পূরণ করবে">
              {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
              {bn ? "বাংলা অনুবাদ" : "Translate"}
            </button>
            <button type="button" onClick={save} disabled={saving} className="btn btn-brand btn-sm disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {bn ? "সংরক্ষণ" : "Save"}
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-brand-100 dark:border-white/10 bg-brand-50/50 dark:bg-white/5 px-4 py-3 text-xs text-muted leading-relaxed mb-4">
        <p className="font-semibold text-heading mb-1">{bn ? "কীভাবে কাজ করে" : "How it works"}</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>{bn ? "চালু থাকা সব ঘোষণা একটার পর একটা ডান থেকে বামে চলতে থাকে।" : "All active announcements scroll one after another."}</li>
          <li>{bn ? "রঙ বেছে নিন — প্রথম ঘোষণার রঙই পুরো বারের রঙ হয়।" : "The first announcement's colour is used for the whole bar."}</li>
          <li>{bn ? "সাময়িকভাবে লুকাতে 'চালু' বন্ধ করুন — মুছতে হবে না।" : "Turn 'On' off to hide one without deleting it."}</li>
          <li>{bn ? "অ্যাডমিন, কার্ট ও চেকআউট পাতায় বার দেখায় না।" : "The bar is hidden on admin, cart and checkout pages."}</li>
        </ul>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-4">
          {/* Whole-bar preview — exactly as visitors see it (first colour, all active items). */}
          <div className="enterprise-card p-3">
            <p className="text-xs font-semibold text-heading mb-2">
              {bn ? `ওয়েবসাইটে যেমন দেখাবে — ${activeCount}টি চালু` : `As on the website — ${activeCount} active`}
            </p>
            {activeCount === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">{bn ? "কোনো ঘোষণা চালু নেই — ওয়েবসাইটে বার লুকানো থাকবে।" : "Nothing active — the bar will be hidden."}</p>
            ) : (
              <div className={cn(variantBg(items.find((it) => it.active !== false)?.variant), "rounded-lg h-9 flex items-center gap-3 pl-3 overflow-hidden text-xs sm:text-sm")}>
                <Zap className="w-3.5 h-3.5 flex-none text-yellow-300" />
                <div className="flex-1 min-w-0 flex gap-8 overflow-hidden whitespace-nowrap font-semibold">
                  {items.filter((it) => it.active !== false && ((it.en ?? "").trim() || (it.bn ?? "").trim())).map((it, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5">{it.icon && <span aria-hidden>{it.icon}</span>}{(bn ? it.bn : it.en) || it.bn || it.en}</span>
                  ))}
                </div>
                <X className="w-3.5 h-3.5 flex-none mr-3 opacity-80" />
              </div>
            )}
          </div>

          {items.map((it, i) => {
            const on = it.active !== false;
            return (
            <div key={i} className={cn("enterprise-card p-4 space-y-3", !on && "opacity-70")}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-heading">{bn ? `ঘোষণা ${i + 1}` : `Announcement ${i + 1}`}</p>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => update(i, { active: !on })}
                    className={`relative inline-flex flex-none w-11 h-6 rounded-full transition-colors ${on ? "bg-brand-600" : "bg-gray-200 dark:bg-white/15"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                  <span className={on ? "text-green-700 dark:text-green-400 font-semibold" : "text-muted"}>{on ? (bn ? "চালু" : "On") : (bn ? "বন্ধ" : "Off")}</span>
                </label>
              </div>

              {/* Live preview of this one item */}
              <div className={cn(variantBg(it.variant), "rounded-lg px-3 py-1.5 text-xs sm:text-sm flex items-center justify-center gap-2 font-semibold")}>
                {it.icon ? <span aria-hidden>{it.icon}</span> : null}
                <span className="truncate">{(bn ? it.bn : it.en) || it.bn || it.en || (bn ? "প্রিভিউ — নিচে লেখা দিন" : "Preview — type below")}</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-muted mb-1">{bn ? "লেখা (বাংলা)" : "Text (Bangla)"}</span>
                  <input value={it.bn} onChange={(e) => update(i, { bn: e.target.value })} placeholder="যেমন: ৳২০০০+ অর্ডারে ফ্রি ডেলিভারি" className="input" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-muted mb-1">{bn ? "লেখা (ইংরেজি)" : "Text (English)"}</span>
                  <input value={it.en} onChange={(e) => update(i, { en: e.target.value })} placeholder="e.g. Free delivery on orders over ৳2000" className="input" />
                </label>
              </div>
              <label className="block">
                <span className="block text-xs font-medium text-muted mb-1">{bn ? "চাপলে কোথায় যাবে (লিংক)" : "Link (where a tap goes)"}</span>
                <input value={it.href} onChange={(e) => update(i, { href: e.target.value })} placeholder="/products" className="input" />
                <span className="block text-[11px] text-muted mt-1">{bn ? "এই সাইটের পাতা হলে / দিয়ে শুরু করুন, যেমন /products বা /services" : "Start with / for a page on this site, e.g. /products"}</span>
              </label>

              <div>
                <span className="block text-xs font-medium text-muted mb-1">{bn ? "রঙ" : "Colour"}</span>
                <div className="flex flex-wrap gap-1.5">
                  {VARIANTS.map((v) => {
                    const sel = (it.variant ?? "promo") === v.value;
                    return (
                      <button key={v.value} type="button" onClick={() => update(i, { variant: v.value })} aria-pressed={sel}
                        className={cn(variantBg(v.value), "text-[11px] font-semibold px-2.5 py-1 rounded-lg border-2", sel ? "border-gray-900 dark:border-white ring-2 ring-brand-300" : "border-transparent opacity-80")}>
                        {sel && <Check className="w-3 h-3 inline -mt-0.5 mr-0.5" />}{bn ? v.labelBn : v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-muted mb-1">{bn ? "ইমোজি (ঐচ্ছিক)" : "Emoji (optional)"}</span>
                <div className="flex flex-wrap items-center gap-1">
                  <input value={it.icon ?? ""} onChange={(e) => update(i, { icon: e.target.value })} placeholder="🎉" className="input w-16 text-center" maxLength={2} aria-label={bn ? "ইমোজি" : "Emoji"} />
                  {QUICK_ICONS.map((emo) => (
                    <button key={emo} type="button" onClick={() => update(i, { icon: emo })} className="w-8 h-8 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10 text-sm" aria-label={`icon ${emo}`}>{emo}</button>
                  ))}
                  {it.icon && (
                    <button type="button" onClick={() => update(i, { icon: "" })} className="text-[11px] text-muted underline ml-1">{bn ? "সরান" : "Clear"}</button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100 dark:border-white/10">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm pt-2">
                  <input type="checkbox" checked={it.dismissible !== false} onChange={(e) => update(i, { dismissible: e.target.checked })} className="rounded" />
                  {bn ? "ভিজিটর ✕ চেপে বন্ধ করতে পারবে" : "Visitors can close it (✕)"}
                </label>
                <div className="flex items-center gap-1 pt-2">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-9 h-9 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30" aria-label={bn ? "উপরে নিন" : "Move up"} title={bn ? "উপরে নিন" : "Move up"}><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="w-9 h-9 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30" aria-label={bn ? "নিচে নিন" : "Move down"} title={bn ? "নিচে নিন" : "Move down"}><ArrowDown className="w-4 h-4" /></button>
                  <button type="button" onClick={() => setDeleteIndex(i)} className="w-9 h-9 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 flex items-center justify-center" aria-label={bn ? "মুছুন" : "Delete"} title={bn ? "মুছুন" : "Delete"}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            );
          })}

          <button type="button" onClick={() => { setItems((l) => [...l, blank()]); touch(); }} className="btn btn-outline btn-md w-full">
            <Plus className="w-4 h-4" />
            {bn ? "নতুন ঘোষণা যোগ করুন" : "Add announcement"}
          </button>
        </div>
      )}

      {dirty && !loading && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 z-40 flex items-center justify-between sm:justify-end gap-3 rounded-2xl bg-white dark:bg-[#111a2e] border border-gray-200 dark:border-white/10 shadow-xl px-4 py-2.5">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{bn ? "অসংরক্ষিত পরিবর্তন আছে" : "You have unsaved changes"}</span>
          <button type="button" onClick={save} disabled={saving} className="btn btn-brand btn-sm disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {bn ? "সংরক্ষণ" : "Save"}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={deleteIndex !== null}
        title={bn ? "এই ঘোষণা মুছবেন?" : "Delete this announcement?"}
        message={bn ? "'সংরক্ষণ' চাপার পর ওয়েবসাইট থেকে সরে যাবে। শুধু লুকাতে চাইলে 'চালু' বন্ধ করুন।" : "It will stop showing on the site after you save."}
        confirmLabel={bn ? "মুছুন" : "Delete"}
        variant="danger"
        onConfirm={performRemove}
        onCancel={() => setDeleteIndex(null)}
      />
    </div>
  );
}
