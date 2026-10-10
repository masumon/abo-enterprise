"use client";

import { useEffect, useState } from "react";
import { aiCatalogApi } from "@/lib/api";

// One status request per page load, shared by every AI button on the page.
let cached: Promise<boolean> | null = null;

/** True only when a working Google AI key is saved and switched on. AI buttons
 * stay hidden until this resolves true (and on any error). */
export function useAiAvailable(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!cached) {
      cached = aiCatalogApi.status().then((r) => !!r.data.data?.available).catch(() => {
        cached = null; // retry on the next mount
        return false;
      });
    }
    cached.then((v) => { if (alive) setOk(v); });
    return () => { alive = false; };
  }, []);
  return ok;
}

/** Shrink a photo before sending it to the AI (faster on mobile data, stays
 * under the server's 4 MB per-photo limit). Falls back to the original file. */
export async function downscaleImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
