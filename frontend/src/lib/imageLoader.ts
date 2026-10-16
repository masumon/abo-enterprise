/**
 * Global next/image loader. Cloudinary images are resized/compressed by Cloudinary itself
 * (f_auto, q_auto, width) instead of Vercel's image optimizer, which saves the free-plan
 * image-optimization quota. Everything else (local files, other hosts) keeps going through
 * the built-in /_next/image optimizer exactly as before.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  const marker = "/image/upload/";
  if (/^https:\/\/res\.cloudinary\.com\//.test(src) && src.includes(marker)) {
    const [head, tail] = src.split(marker, 2);
    // Already carries its own transformation (e.g. from responsiveMediaUrl) → leave it alone.
    const first = tail.split("/")[0];
    if (tail.includes("/") && !/^v\d+$/.test(first)) return src;
    return `${head}${marker}f_auto,q_${quality ? quality : "auto"},w_${width},c_limit/${tail}`;
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
}
