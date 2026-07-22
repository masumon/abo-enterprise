/**
 * Client-side image downscale + re-encode, run BEFORE upload. On slow mobile
 * connections a 4–5 MB photo can take minutes to upload and time out; shrinking
 * it to ~1920px WebP in the browser drops it to a few hundred KB so the upload
 * is fast and reliable. Cloudinary still optimizes further server-side.
 *
 * Never throws — any failure returns the original file so upload still proceeds.
 * Skips GIF (animation) and SVG (vector); videos are passed through untouched.
 */

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(
  file: File,
  opts?: { maxDim?: number; quality?: number }
): Promise<File> {
  const maxDim = opts?.maxDim ?? 1920;
  const quality = opts?.quality ?? 0.82;

  // Only raster images benefit; leave animation/vector/non-image alone.
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  try {
    const bitmap = await loadBitmap(file);
    const width = (bitmap as ImageBitmap).width || (bitmap as HTMLImageElement).naturalWidth;
    const height = (bitmap as ImageBitmap).height || (bitmap as HTMLImageElement).naturalHeight;
    if (!width || !height) return file;

    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, targetW, targetH);
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

    // Prefer WebP; fall back to JPEG where toBlob doesn't support it.
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    if (!blob) return file;

    // Only adopt the compressed version if it's actually smaller than the source.
    if (blob.size >= file.size) return file;

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}
