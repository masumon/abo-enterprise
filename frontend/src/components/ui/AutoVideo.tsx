"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { toPlayableVideoUrl, videoPosterUrl } from "@/lib/media";

interface AutoVideoProps {
  src: string;
  className?: string;
  poster?: string;
  /** Show a tap-to-play ▶ overlay if the browser blocks muted autoplay
   * (data-saver / low-power mode). Use for foreground promo/hero cards. */
  tapToPlay?: boolean;
  "aria-hidden"?: boolean;
}

/**
 * A muted, looping, autoplaying video that actually plays on mobile. React's
 * `muted` attribute is unreliable — it doesn't always set the DOM `.muted`
 * property before playback, so browsers treat the clip as unmuted and block
 * autoplay (you see only the poster). We force the property via a ref and call
 * play() on mount and whenever data is ready. If autoplay is still blocked
 * (data-saver / low-power), an optional tap-to-play button guarantees the user
 * can start it. Cloudinary URLs are normalised to a web-friendly mp4 + poster.
 */
export default function AutoVideo({ src, className, poster, tapToPlay, "aria-hidden": ariaHidden }: AutoVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.then(() => setBlocked(false)).catch(() => setBlocked(true));
      }
    };
    tryPlay();
    v.addEventListener("loadeddata", tryPlay);
    v.addEventListener("canplay", tryPlay);
    return () => {
      v.removeEventListener("loadeddata", tryPlay);
      v.removeEventListener("canplay", tryPlay);
    };
  }, [src]);

  const onTap = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().then(() => setBlocked(false)).catch(() => {});
  };

  return (
    <>
      <video
        ref={ref}
        src={toPlayableVideoUrl(src)}
        poster={poster ?? videoPosterUrl(src)}
        className={className}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-hidden={ariaHidden}
      />
      {tapToPlay && blocked && (
        <button
          type="button"
          onClick={onTap}
          aria-label="Play video"
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/25"
        >
          <span className="w-14 h-14 rounded-full bg-white/90 text-brand-700 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 translate-x-0.5" fill="currentColor" />
          </span>
        </button>
      )}
    </>
  );
}
