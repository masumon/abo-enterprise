/** Shared media-URL helpers so upload, admin preview and public display all
 *  agree on what counts as a video. A CSS `background-image` can never play a
 *  video, so any banner/hero that may hold a video URL must branch on this. */

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|avi|m4v|ogv)(\?|#|$)/i.test(url) || url.includes("/video/upload/");
}
