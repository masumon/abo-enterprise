/** Shared media-URL helpers so upload, admin preview and public display all
 *  agree on what counts as a video. A CSS `background-image` can never play a
 *  video, so any banner/hero that may hold a video URL must branch on this. */

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|avi|m4v|ogv)(\?|#|$)/i.test(url) || url.includes("/video/upload/");
}

/**
 * Make a Cloudinary video URL reliably playable in the browser. Phone uploads
 * are often `.mov`/HEVC which Chrome/Android can't decode, so we force a
 * web-friendly mp4 container and add `q_auto` for an optimized stream. Non
 * Cloudinary URLs are returned unchanged.
 */
export function toPlayableVideoUrl(url: string | null | undefined): string {
  if (!url) return "";
  let out = url;
  if (out.includes("/video/upload/")) {
    const firstSeg = (out.split("/video/upload/")[1] ?? "").split("/")[0];
    // Only inject a transform when the first path segment isn't already one.
    if (!firstSeg.includes(",") && !firstSeg.includes("=") && !firstSeg.startsWith("q_") && !firstSeg.startsWith("f_")) {
      out = out.replace("/video/upload/", "/video/upload/q_auto/");
    }
    out = out.replace(/\.(mov|avi|m4v|mkv|hevc|3gp)(\?|#|$)/i, ".mp4$1");
  }
  return out;
}
