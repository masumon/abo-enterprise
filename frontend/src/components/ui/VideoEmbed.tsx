"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { isVideoUrl, toPlayableVideoUrl, videoPosterUrl } from "@/lib/media";

/** YouTube id from watch / youtu.be / shorts / embed / live links. */
export function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : null;
}

function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m ? m[1] : null;
}

const FACEBOOK = /(?:facebook\.com\/.+\/videos?\/|facebook\.com\/(?:watch|reel)|fb\.watch\/)/i;

/** Whether a link is one this player can show. */
export function isSupportedVideo(url?: string | null): boolean {
  if (!url) return false;
  return !!(youTubeId(url) || vimeoId(url) || FACEBOOK.test(url) || isVideoUrl(url));
}

/**
 * Light video player: a still with a play button; the heavy player loads
 * only after a tap, so product/service pages stay fast.
 */
export default function VideoEmbed({ url, title }: { url?: string | null; title: string }) {
  const [playing, setPlaying] = useState(false);
  if (!url || !isSupportedVideo(url)) return null;
  const yt = youTubeId(url);
  const vm = vimeoId(url);
  const fb = !yt && !vm && FACEBOOK.test(url);
  const file = !yt && !vm && !fb;
  const poster = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : file ? videoPosterUrl(url) : undefined;
  const src = yt
    ? `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`
    : vm
      ? `https://player.vimeo.com/video/${vm}?autoplay=1`
      : fb
        ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`
        : toPlayableVideoUrl(url);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-black aspect-video">
      {playing ? (
        file ? (
          <video src={src} poster={poster} controls autoPlay playsInline className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <iframe src={src} title={title} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
        )
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="absolute inset-0 w-full h-full group" aria-label={`ভিডিও চালান: ${title}`}>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- third-party thumbnail
            <img src={poster} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100" />
          ) : (
            <span className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 text-brand-600 shadow-lg group-hover:scale-105 transition-transform">
              <Play className="w-7 h-7 ml-1" fill="currentColor" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
