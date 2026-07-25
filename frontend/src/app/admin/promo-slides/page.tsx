"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, Images, ExternalLink } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImageUpload from "@/components/admin/ImageUpload";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { promoSlidesApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import type { PromoSlide } from "@/types";
import { useToastStore } from "@/store/toast";
import { useFocusTrap } from "@/lib/useFocusTrap";

const PLACEMENTS: { value: PromoSlide["placement"]; label: string }[] = [
  { value: "hero", label: "Hero card" },
  { value: "flash_sale", label: "Flash sale" },
];

/** Rendered size per surface, so uploads match the box they land in. */
const SPECS: Record<PromoSlide["placement"], { size: string; ratio: string; note: string }> = {
  hero: {
    size: "1280 × 720 px",
    ratio: "16:9",
    note: "Shown at the top of the homepage — below the top bar on mobile, beside the headline on desktop.",
  },
  flash_sale: {
    size: "1500 × 500 px",
    ratio: "3:1",
    note: "Shown under the flash-sale countdown. Only visible while a flash sale is running.",
  },
};

const EMPTY: Partial<PromoSlide> = {
  placement: "hero", image_url: "", video_url: "", link_url: "",
  title_en: "", title_bn: "", alt_text: "", sort_order: 0, is_active: true,
};

/** `datetime-local` needs `YYYY-MM-DDTHH:mm`; the API returns full ISO. */
const toLocalInput = (iso?: string | null) => (iso ? iso.slice(0, 16) : "");
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

export default function AdminPromoSlidesPage() {
  const [slides, setSlides] = useState<PromoSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PromoSlide> | null>(null);
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
      toast("error", "Add an image or a video"); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...editing,
        starts_at: editing.starts_at ? toIso(editing.starts_at) : null,
        ends_at: editing.ends_at ? toIso(editing.ends_at) : null,
      };
      if (editing.id) await promoSlidesApi.update(editing.id, payload);
      else await promoSlidesApi.create(payload);
      toast("success", editing.id ? "Slide updated" : "Slide created");
      setEditing(null);
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "Failed to save slide"));
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
      toast("success", "Slide deleted");
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
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Promo Slides"
        titleBn="প্রোমো স্লাইড"
        description="Image/video banners with a link, shown in the hero card and the flash-sale strip"
        descriptionBn="হিরো কার্ড ও ফ্ল্যাশ সেলে দেখানো ছবি/ভিডিও ব্যানার — লিংক সহ"
        actions={
          <button onClick={() => setEditing({ ...EMPTY })} className="btn btn-primary btn-sm gap-1.5">
            <Plus className="w-4 h-4" /> New Slide
          </button>
        }
      />

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : slides.length === 0 ? (
          <div className="p-12 text-center">
            <Images className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No slides yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Until you add one, the hero keeps showing the single promo media from Settings.
            </p>
            <button onClick={() => setEditing({ ...EMPTY })} className="btn btn-primary btn-sm mt-4 gap-1.5">
              <Plus className="w-4 h-4" /> Create first slide
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {slides.map((slide) => (
              <div key={slide.id} className="flex items-center gap-4 p-4">
                <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {slide.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                    <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[10px] text-gray-400">VIDEO</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {slide.title_en || slide.alt_text || "Untitled slide"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {PLACEMENTS.find((p) => p.value === slide.placement)?.label} · #{slide.sort_order}
                    {slide.link_url && (
                      <span className="inline-flex items-center gap-1 ml-2 text-brand-600">
                        <ExternalLink className="w-3 h-3" /> linked
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(slide)}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium flex-shrink-0 ${
                    slide.is_active
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}
                >
                  {slide.is_active ? "Active" : "Hidden"}
                </button>
                <button
                  onClick={() => setEditing({ ...slide, starts_at: toLocalInput(slide.starts_at), ends_at: toLocalInput(slide.ends_at) })}
                  aria-label="Edit slide"
                  className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmState({ id: slide.id })}
                  disabled={deletingId === slide.id}
                  aria-label="Delete slide"
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                >
                  {deletingId === slide.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} role="dialog" aria-modal="true" aria-label="Edit slide">
          <div ref={editorRef} className="ml-auto w-full max-w-lg h-full flex flex-col bg-white shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? "Edit Slide" : "New Slide"}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="form-label">Where does it show?</label>
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
                    <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2.5 text-[12px] text-brand-800 space-y-1">
                      <p><span className="font-semibold">Recommended size:</span> {spec.size} ({spec.ratio})</p>
                      <p><span className="font-semibold">Format:</span> JPG, PNG or WEBP · max 5MB</p>
                      <p className="text-brand-700/80">{spec.note}</p>
                      <p className="text-brand-700/80">
                        Images are cropped to fill the box, so keep text and logos away from the edges.
                      </p>
                    </div>

                    <ImageUpload
                      label="Image"
                      value={editing.image_url ?? ""}
                      onChange={(url) => set("image_url", url)}
                      folder="abo-enterprise/promo"
                      hint={`${spec.size} (${spec.ratio}) · JPG/PNG/WEBP · max 5MB`}
                    />
                  </>
                );
              })()}

              <div>
                <label className="form-label">Video URL <span className="text-gray-400 font-normal text-xs">(optional — used instead of the image)</span></label>
                <input value={editing.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} className="input w-full text-sm" placeholder="https://…" />
                <p className="text-[11px] text-gray-400 mt-1">
                  MP4 (H.264), same ratio as the image, under 10MB. Autoplays muted — keep it short and silent-friendly.
                </p>
              </div>

              <div>
                <label className="form-label">Link <span className="text-gray-400 font-normal text-xs">(where tapping the slide goes)</span></label>
                <input value={editing.link_url ?? ""} onChange={(e) => set("link_url", e.target.value)} className="input w-full text-sm" placeholder="/products or https://…" />
                <p className="text-[11px] text-gray-400 mt-1">Start with / for a page on this site; a full URL opens in a new tab.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Caption (EN)</label>
                  <input value={editing.title_en ?? ""} onChange={(e) => set("title_en", e.target.value)} className="input w-full text-sm" />
                </div>
                <div>
                  <label className="form-label">Caption (বাংলা)</label>
                  <input value={editing.title_bn ?? ""} onChange={(e) => set("title_bn", e.target.value)} className="input w-full text-sm" dir="auto" />
                </div>
              </div>

              <div>
                <label className="form-label">Alt text <span className="text-gray-400 font-normal text-xs">(for screen readers)</span></label>
                <input value={editing.alt_text ?? ""} onChange={(e) => set("alt_text", e.target.value)} className="input w-full text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Show from <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
                  <input type="datetime-local" value={editing.starts_at ?? ""} onChange={(e) => set("starts_at", e.target.value)} className="input w-full text-sm" />
                </div>
                <div>
                  <label className="form-label">Show until <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
                  <input type="datetime-local" value={editing.ends_at ?? ""} onChange={(e) => set("ends_at", e.target.value)} className="input w-full text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="form-label">Sort order</label>
                  <input type="number" value={editing.sort_order ?? 0} onChange={(e) => set("sort_order", Number(e.target.value))} className="input w-full text-sm" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={editing.is_active !== false} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setEditing(null)} className="btn btn-outline btn-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editing.id ? "Save Changes" : "Create Slide"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title="Delete this slide?"
        message="It will stop showing on the site immediately."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => confirmState && handleDelete(confirmState.id)}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
