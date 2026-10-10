"use client";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, Images, ExternalLink, Languages } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import HomepageSectionNav from "@/components/admin/HomepageSectionNav";
import ImageUpload from "@/components/admin/ImageUpload";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { promoSlidesApi, adminBlogApi } from "@/lib/api";
import TranslateButton from "@/components/admin/TranslateButton";
import { translateBnToEn } from "@/lib/translate";
import { apiErrorMessage } from "@/lib/apiError";
import type { PromoSlide } from "@/types";
import { useToastStore } from "@/store/toast";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { slideLiveState, SLIDE_STATE_LABEL_BN, SLIDE_STATE_CLASS, slideIsoToDhakaInput, dhakaInputToIso } from "@/lib/promoSlideStatus";
import { formatDhakaBn } from "@/lib/flashSale";
import { cn } from "@/lib/utils";

const PLACEMENTS: { value: PromoSlide["placement"]; label: string; help: string }[] = [
  { value: "hero", label: "হিরো স্লাইড (হোমপেজের উপরে)", help: "মোবাইল/ট্যাবলেটে হোমপেজের একদম উপরে ঘোরে; ডেস্কটপে শিরোনামের ডান পাশের কার্ডে।" },
  { value: "flash_sale", label: "ফ্ল্যাশ সেল ব্যানার", help: "ফ্ল্যাশ সেলের কাউন্টডাউনের নিচে — শুধু ফ্ল্যাশ সেল চলার সময় দেখায়।" },
];

/** Rendered size per surface, so uploads match the box they land in. */
const SPECS: Record<PromoSlide["placement"], { size: string; ratio: string; note: string }> = {
  hero: {
    size: "১২৮০ × ৭২০ px",
    ratio: "১৬:৯",
    note: "হোমপেজের একদম উপরে দেখায় — মোবাইলে উপরের বারের নিচে, ডেস্কটপে শিরোনামের পাশে।",
  },
  flash_sale: {
    size: "১৫০০ × ৫০০ px",
    ratio: "৩:১",
    note: "ফ্ল্যাশ সেলের কাউন্টডাউনের নিচে দেখায় — শুধু ফ্ল্যাশ সেল চলাকালীন।",
  },
};

const EMPTY: Partial<PromoSlide> = {
  placement: "hero", image_url: "", video_url: "", link_url: "",
  title_en: "", title_bn: "", alt_text: "", sort_order: 0, is_active: true,
};

/** Show/hide times are always Bangladesh time (UTC+6) — the old
 * slice-the-ISO approach showed UTC and shifted the time on every save. */
const toLocalInput = slideIsoToDhakaInput;
const toIso = dhakaInputToIso;

export default function AdminPromoSlidesPage() {
  const [slides, setSlides] = useState<PromoSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PromoSlide> | null>(null);
  const [translating, setTranslating] = useState(false);

  // Fill the empty Bengali caption from the English one (never overwrites).
  const autoTranslate = async () => {
    if (!editing || translating) return;
    const en = (editing.title_en ?? "").trim();
    if (!en || (editing.title_bn ?? "").trim()) { toast("info", "অনুবাদের মতো কিছু নেই"); return; }
    setTranslating(true);
    try {
      const r = await adminBlogApi.translate(en, "en", "bn");
      const bnText = r.data?.data?.translated?.trim();
      if (bnText) { setEditing((prev) => prev ? { ...prev, title_bn: bnText } : prev); toast("success", "বাংলা অনুবাদ পূরণ হয়েছে"); }
      else toast("error", "অনুবাদ পাওয়া যায়নি");
    } catch {
      toast("error", "অনুবাদ ব্যর্থ — আবার চেষ্টা করুন");
    } finally {
      setTranslating(false);
    }
  };
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ id: string } | null>(null);
  const toast = useToastStore((s) => s.push);
  const editorRef = useFocusTrap(editing !== null, () => setEditing(null));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await promoSlidesApi.adminList();
      setSlides(r.data.data ?? []);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to load slides"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.image_url && !editing.video_url) {
      toast("error", "একটি ছবি বা ভিডিও দিন"); return;
    }
    setSaving(true);
    // Bangla-first: fill an empty English caption from the Bangla one.
    let e2 = editing;
    if (!(e2.title_en ?? "").trim() && (e2.title_bn ?? "").trim()) {
      try { e2 = { ...e2, title_en: await translateBnToEn(e2.title_bn!) }; setEditing(e2); }
      catch { setSaving(false); toast("error", "অটো-অনুবাদ ব্যর্থ — English নিজে লিখুন"); return; }
    }
    try {
      const payload = {
        ...e2,
        starts_at: e2.starts_at ? toIso(e2.starts_at) : null,
        ends_at: e2.ends_at ? toIso(e2.ends_at) : null,
      };
      if (editing.id) await promoSlidesApi.update(editing.id, payload);
      else await promoSlidesApi.create(payload);
      toast("success", editing.id ? "স্লাইড আপডেট হয়েছে" : "নতুন স্লাইড যোগ হয়েছে");
      setEditing(null);
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "স্লাইড সংরক্ষণ হয়নি"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmState(null);
    setDeletingId(id);
    try {
      await promoSlidesApi.delete(id);
      setSlides((prev) => prev.filter((s) => s.id !== id));
      toast("success", "স্লাইড মুছে ফেলা হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (slide: PromoSlide) => {
    try {
      await promoSlidesApi.update(slide.id, { is_active: !slide.is_active });
      setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, is_active: !s.is_active } : s)));
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to update"));
    }
  };

  const set = <K extends keyof PromoSlide>(key: K, value: PromoSlide[K]) =>
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div className="admin-page">
      <HomepageSectionNav />
      <AdminPageHeader
        title="Promo Slides"
        titleBn="প্রোমো স্লাইড"
        description="Image/video slides with a link — the homepage hero slider and the flash-sale banner."
        descriptionBn="লিংকসহ ছবি/ভিডিও স্লাইড — হোমপেজের উপরের স্লাইডার ও ফ্ল্যাশ সেল ব্যানার।"
        actions={
          <button onClick={() => setEditing({ ...EMPTY })} className="btn btn-primary btn-sm gap-1.5">
            <Plus className="w-4 h-4" /> নতুন স্লাইড
          </button>
        }
      />

      <div className="rounded-xl border border-brand-100 dark:border-white/10 bg-brand-50/50 dark:bg-white/5 px-4 py-3 text-xs text-muted leading-relaxed">
        <p className="font-semibold text-heading mb-1">কীভাবে কাজ করে</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>একই জায়গায় একাধিক স্লাইড থাকলে সেগুলো নিজে থেকেই ঘুরতে থাকে — ক্রম নম্বর ছোট হলে আগে দেখায়।</li>
          <li><strong>চালু/বন্ধ</strong> বাটনে চাপলে সাথে সাথে স্লাইড দেখানো বা লুকানো হয় — মুছতে হবে না।</li>
          <li>&quot;কখন থেকে / কখন পর্যন্ত&quot; দিলে সেই সময়েই নিজে থেকে দেখাবে ও সরে যাবে (বাংলাদেশ সময়)।</li>
          <li>কোনো হিরো স্লাইড চালু না থাকলে মোবাইলে <a href="/sumon/homepage#hero" className="text-brand-600 dark:text-brand-300 underline">হোমপেজ সাজান → হিরো ব্যানার</a>-এর মোবাইল ছবি দেখায়।</li>
        </ul>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : slides.length === 0 ? (
          <div className="p-12 text-center">
            <Images className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">এখনো কোনো স্লাইড নেই</p>
            <p className="text-gray-400 text-sm mt-1">
              স্লাইড না থাকা পর্যন্ত হোমপেজে হিরো ব্যানারের ছবিগুলোই দেখাবে।
            </p>
            <button onClick={() => setEditing({ ...EMPTY })} className="btn btn-primary btn-sm mt-4 gap-1.5">
              <Plus className="w-4 h-4" /> প্রথম স্লাইড যোগ করুন
            </button>
          </div>
        ) : (
          /* Grouped by surface, with a count and its own add button — a
             carousel needs several slides, and a flat list made it look like
             one per placement was the limit. */
          <div>
            {PLACEMENTS.map(({ value, label, help }) => {
              const group = slides.filter((s) => s.placement === value);
              return (
                <div key={value} className="border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 dark:bg-white/5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        {label}
                        <span className="ml-2 text-xs font-medium text-gray-400">
                          {group.length}টি স্লাইড{group.length > 1 && " · ঘুরে ঘুরে দেখায়"}
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{help}</p>
                    </div>
                    <button
                      onClick={() => setEditing({ ...EMPTY, placement: value })}
                      className="text-xs font-semibold text-brand-600 hover:underline whitespace-nowrap flex-none"
                    >
                      + যোগ করুন
                    </button>
                  </div>
                  {group.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">এই জায়গায় এখনো কোনো স্লাইড নেই।</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {group.map((slide) => {
                        const st = slideLiveState(slide);
                        return (
              <div key={slide.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 p-4">
                <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
                  {slide.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                    <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[10px] text-gray-400">VIDEO</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {slide.title_bn || slide.title_en || slide.alt_text || "নাম ছাড়া স্লাইড"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ক্রম #{slide.sort_order}
                    {slide.link_url && (
                      <span className="inline-flex items-center gap-1 ml-2 text-brand-600 dark:text-brand-300">
                        <ExternalLink className="w-3 h-3" /> লিংক আছে
                      </span>
                    )}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded border font-medium", SLIDE_STATE_CLASS[st])}>{SLIDE_STATE_LABEL_BN[st]}</span>
                    {(slide.starts_at || slide.ends_at) && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {slide.starts_at ? `${formatDhakaBn(new Date(slide.starts_at))} থেকে` : "এখন থেকে"}
                        {slide.ends_at ? ` · ${formatDhakaBn(new Date(slide.ends_at))} পর্যন্ত` : ""}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(slide)}
                  role="switch"
                  aria-checked={slide.is_active}
                  title={slide.is_active ? "চাপলে লুকাবে" : "চাপলে দেখাবে"}
                  className="flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold"
                >
                  <span className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${slide.is_active ? "bg-brand-600" : "bg-gray-200 dark:bg-white/15"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${slide.is_active ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                  <span className={slide.is_active ? "text-green-700 dark:text-green-400" : "text-gray-500"}>{slide.is_active ? "চালু" : "বন্ধ"}</span>
                </button>
                <button
                  onClick={() => setEditing({ ...slide, starts_at: toLocalInput(slide.starts_at), ends_at: toLocalInput(slide.ends_at) })}
                  aria-label="স্লাইড বদলান" title="বদলান"
                  className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmState({ id: slide.id })}
                  disabled={deletingId === slide.id}
                  aria-label="স্লাইড মুছুন" title="মুছুন"
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                >
                  {deletingId === slide.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex" style={ADMIN_MODAL_BACKDROP_STYLE} role="dialog" aria-modal="true" aria-label="স্লাইড সম্পাদনা">
          <div ref={editorRef} className="ml-auto w-full max-w-lg h-full flex flex-col bg-white dark:bg-[#111a2e] shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editing.id ? "স্লাইড বদলান" : "নতুন স্লাইড"}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="form-label">কোথায় দেখাবে?</label>
                <select
                  value={editing.placement ?? "hero"}
                  onChange={(e) => set("placement", e.target.value as PromoSlide["placement"])}
                  className="input w-full text-sm"
                >
                  {PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {(() => {
                const spec = SPECS[editing.placement ?? "hero"];
                return (
                  <>
                    <div className="rounded-xl bg-brand-50 dark:bg-white/5 border border-brand-100 dark:border-white/10 px-3 py-2.5 text-[12px] text-brand-800 dark:text-brand-200 space-y-1">
                      <p><span className="font-semibold">প্রস্তাবিত মাপ:</span> {spec.size} ({spec.ratio})</p>
                      <p><span className="font-semibold">ফরম্যাট:</span> JPG, PNG বা WebP · ১MB-এর কম হলে দ্রুত লোড হয়</p>
                      <p className="text-brand-700/80">{spec.note}</p>
                      <p className="text-brand-700/80">
                        ছবি বক্স ভরাট করতে কিনারা কেটে নেওয়া হয় — তাই লেখা, দাম ও লোগো মাঝখানে রাখুন, কিনারা থেকে দূরে।
                      </p>
                    </div>

                    {/* How it will look — same box shape as on the website. */}
                    {(editing.image_url || editing.video_url) && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">ওয়েবসাইটে যেমন দেখাবে</p>
                        <div className={cn("relative rounded-xl overflow-hidden bg-gray-100 dark:bg-white/10", editing.placement === "flash_sale" ? "aspect-[3/1]" : "aspect-video")}>
                          {editing.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin preview
                            <img src={editing.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 grid place-items-center text-xs text-gray-500">ভিডিও স্লাইড</div>
                          )}
                          {(editing.title_bn || editing.title_en) && (
                            <span className="absolute left-2 bottom-2 max-w-[85%] truncate rounded-md bg-black/55 text-white text-xs font-semibold px-2 py-1">
                              {editing.title_bn || editing.title_en}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <ImageUpload
                      label="ছবি"
                      value={editing.image_url ?? ""}
                      onChange={(url) => set("image_url", url)}
                      folder="abo-enterprise/promo"
                      purpose={editing.placement === "flash_sale" ? "promo-flash" : "promo-hero"}
                    />
                  </>
                );
              })()}

              <div>
                <label className="form-label">ভিডিও লিংক <span className="text-gray-400 font-normal text-xs">(ঐচ্ছিক — দিলে ছবির বদলে ভিডিও চলবে)</span></label>
                <input value={editing.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} className="input w-full text-sm" placeholder="https://…" />
                <p className="text-[11px] text-gray-400 mt-1">
                  MP4 (H.264), ছবির মতো একই অনুপাত, ১০MB-এর কম। শব্দ ছাড়া নিজে চলবে — ছোট ভিডিও দিন, শব্দ ছাড়াও যেন বোঝা যায়।
                </p>
              </div>

              <div>
                <label className="form-label">লিংক <span className="text-gray-400 font-normal text-xs">(স্লাইডে চাপলে কোথায় যাবে)</span></label>
                <input value={editing.link_url ?? ""} onChange={(e) => set("link_url", e.target.value)} className="input w-full text-sm" placeholder="/products or https://…" />
                <p className="text-[11px] text-gray-400 mt-1">এই সাইটের পাতা হলে / দিয়ে শুরু করুন (যেমন /products); অন্য সাইটের পুরো লিংক নতুন ট্যাবে খুলবে।</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label flex items-center justify-between gap-2">
                    লেখা (English)
                    <TranslateButton bn={editing.title_bn} onResult={(en) => set("title_en", en)} en={editing.title_en} onResultBn={(b) => set("title_bn", b)} label="→ English" />
                  </label>
                  <input value={editing.title_en ?? ""} onChange={(e) => set("title_en", e.target.value)} className="input w-full text-sm" />
                </div>
                <div>
                  <label className="form-label flex items-center justify-between gap-2">
                    লেখা (বাংলা)
                    <button type="button" onClick={autoTranslate} disabled={translating} className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 text-[11px] font-semibold disabled:opacity-50" title="English থেকে অটো-অনুবাদ">
                      {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                      অনুবাদ
                    </button>
                  </label>
                  <input value={editing.title_bn ?? ""} onChange={(e) => set("title_bn", e.target.value)} className="input w-full text-sm" dir="auto" />
                </div>
              </div>

              <div>
                <label className="form-label">ছবির বর্ণনা <span className="text-gray-400 font-normal text-xs">(যারা ছবি দেখতে পান না তাদের জন্য, ঐচ্ছিক)</span></label>
                <input value={editing.alt_text ?? ""} onChange={(e) => set("alt_text", e.target.value)} className="input w-full text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">কখন থেকে <span className="text-gray-400 font-normal text-xs">(ঐচ্ছিক)</span></label>
                  <input type="datetime-local" value={editing.starts_at ?? ""} onChange={(e) => set("starts_at", e.target.value)} className="input w-full text-sm" />
                </div>
                <div>
                  <label className="form-label">কখন পর্যন্ত <span className="text-gray-400 font-normal text-xs">(ঐচ্ছিক)</span></label>
                  <input type="datetime-local" value={editing.ends_at ?? ""} onChange={(e) => set("ends_at", e.target.value)} className="input w-full text-sm" />
                </div>
              </div>

              <p className="text-[11px] text-gray-400 -mt-2">বাংলাদেশ সময়। খালি রাখলে সবসময় দেখাবে (চালু থাকলে)।</p>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="form-label">ক্রম <span className="text-gray-400 font-normal text-xs">(ছোট = আগে)</span></label>
                  <input type="number" value={editing.sort_order ?? 0} onChange={(e) => set("sort_order", Number(e.target.value))} className="input w-full text-sm" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={editing.is_active !== false} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">চালু (ওয়েবসাইটে দেখাবে)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
              <button onClick={() => setEditing(null)} className="btn btn-outline btn-sm">বাতিল</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editing.id ? "সংরক্ষণ" : "স্লাইড যোগ করুন"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title="এই স্লাইড মুছবেন?"
        message="সাথে সাথে ওয়েবসাইট থেকে সরে যাবে। শুধু লুকাতে চাইলে 'চালু' বন্ধ করুন।"
        confirmLabel="মুছুন"
        variant="danger"
        onConfirm={() => confirmState && handleDelete(confirmState.id)}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
