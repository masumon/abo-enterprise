"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";
import { adminApi, aiCatalogApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { downscaleImage } from "@/lib/useAiAvailable";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useToastStore } from "@/store/toast";
import { useBnEn } from "./useBnEn";

export interface AiStartDraft {
  image_url: string;
  name_bn: string;
  name_en: string;
  description_bn: string;
  description_en: string;
}

/**
 * "📸 ছবি দিয়ে (AI)" for services and software/projects: one photo → the
 * photo is uploaded and the AI writes a name + description draft → the normal
 * form opens pre-filled, so the admin checks it before anything is saved.
 * Reuses the existing photo-AI endpoint with a hint about what the photo shows.
 */
export default function AiPhotoStartModal({ open, onClose, onDraft, kind, folder }: {
  open: boolean;
  onClose: () => void;
  onDraft: (d: AiStartDraft) => void;
  kind: "service" | "project";
  folder: string;
}) {
  const t = useBnEn();
  const toast = useToastStore((s) => s.push);
  const panelRef = useFocusTrap(open, onClose);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  useEffect(() => { if (!open) { setFile(null); setHint(""); } }, [open]);

  if (!open) return null;

  const run = async () => {
    if (!file) { toast("error", t("আগে একটি ছবি দিন", "Pick a photo first")); return; }
    setBusy(true);
    try {
      const small = await downscaleImage(file);
      const what = kind === "service"
        ? "This photo shows a SERVICE the shop offers (not a product for sale). Name the service and describe what the customer gets."
        : "This photo/screenshot shows a SOFTWARE project or app the company built. Name the project and describe the problem it solves and the result.";
      const [up, ai] = await Promise.all([
        adminApi.uploadMedia(small, folder),
        aiCatalogApi.productsFromPhotos([small], null, `${what} ${hint}`.trim()),
      ]);
      const d = ai.data.data.drafts?.[0];
      onDraft({
        image_url: up.data.data.url,
        name_bn: d?.name_bn ?? "",
        name_en: d?.name_en ?? "",
        description_bn: d?.description_bn ?? "",
        description_en: d?.description_en ?? "",
      });
      toast("success", t("AI খসড়া তৈরি — ফর্মে দেখে নিয়ে সেভ করুন", "AI draft ready — check the form, then save"));
    } catch (e) {
      toast("error", apiErrorMessage(e, t("AI কাজ করেনি — ফর্মে নিজে লিখুন", "AI failed — please use the form")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={ADMIN_MODAL_BACKDROP_STYLE}>
      <div ref={panelRef} role="dialog" aria-modal="true" className="rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto" style={ADMIN_MODAL_PANEL_STYLE}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-600" /> {t("ছবি দিয়ে (AI)", "From a photo (AI)")}</h2>
          <button type="button" onClick={onClose} aria-label={t("বন্ধ করুন", "Close")} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--line)] hover:border-brand-400 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/5">
          {preview
            // eslint-disable-next-line @next/next/no-img-element -- local preview
            ? <img src={preview} alt="" className="w-full h-full object-contain" />
            : <span className="text-sm text-muted flex flex-col items-center gap-2"><Camera className="w-8 h-8 text-brand-400" />{t("ছবি বাছুন বা তুলুন", "Choose or take a photo")}</span>}
        </button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("ছোট নোট (ঐচ্ছিক)", "Short note (optional)")}</label>
          <input value={hint} onChange={(e) => setHint(e.target.value)} className="input" placeholder={t("যেমন: ভিসা আবেদন, ১ দিনে", "e.g. visa application, same day")} />
        </div>
        <p className="text-xs text-muted">{t("AI শুধু খসড়া লেখে — দাম AI দেয় না। সেভের আগে সব দেখে নিন।", "AI only drafts text — never prices. Check before saving.")}</p>
        <div className="flex justify-end gap-2 flex-wrap">
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm">{t("বাতিল", "Cancel")}</button>
          <button type="button" onClick={run} disabled={busy || !file} className="btn btn-brand btn-sm gap-1.5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {t("AI দিয়ে খসড়া লিখুন", "Write a draft")}
          </button>
        </div>
      </div>
    </div>
  );
}
