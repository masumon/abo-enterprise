"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useCustomerProfileStore } from "@/store/customerProfile";

/** Shrink a photo to a small square JPEG (keeps the browser storage tiny). */
async function toSquareDataUrl(file: File, size = 192): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The customer's own profile photo (saved on this device, like the other profile settings). */
export default function CustomerAvatar({ bn }: { bn: boolean }) {
  const avatar = useCustomerProfileStore((s) => s.avatar);
  const setAvatar = useCustomerProfileStore((s) => s.setAvatar);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void useCustomerProfileStore.persist.rehydrate(); }, []);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError(bn ? "শুধু ছবি দিন" : "Please choose an image"); return; }
    setBusy(true); setError("");
    try {
      setAvatar(await toSquareDataUrl(file));
    } catch {
      setError(bn ? "ছবিটি পড়া যায়নি — অন্য ছবি দিন" : "Could not read that image");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        className="relative w-16 h-16 rounded-full overflow-hidden bg-brand-50 dark:bg-brand-900/30 ring-2 ring-white dark:ring-white/10 shadow flex items-center justify-center text-2xl group"
        aria-label={avatar ? (bn ? "ছবি বদলান" : "Change photo") : (bn ? "ছবি যোগ করুন" : "Add photo")}>
        {avatar
          ? <img src={avatar} alt="" className="w-full h-full object-cover" />
          : <span aria-hidden>👤</span>}
        <span className="absolute bottom-0 inset-x-0 h-6 bg-black/45 flex items-center justify-center">
          {busy ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" aria-hidden /> : <Camera className="w-3.5 h-3.5 text-white" aria-hidden />}
        </span>
      </button>
      {avatar && (
        <button type="button" onClick={() => setAvatar("")} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-600 min-h-6">
          <Trash2 className="w-3 h-3" aria-hidden />{bn ? "সরান" : "Remove"}
        </button>
      )}
      {error && <p role="alert" className="text-[11px] text-red-600 max-w-[8rem] text-center">{error}</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}
