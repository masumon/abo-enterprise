"use client";

import { useEffect, useRef } from "react";
import { toPlayableVideoUrl, videoPosterUrl } from "@/lib/media";

interface AutoVideoProps {
  src: string;
  className?: string;
  poster?: string;
  /** Object-fit behaviour is left to className; defaults suit a hero/banner. */
  "aria-hidden"?: boolean;
}

/**
 * A muted, looping, autoplaying video that actually plays on mobile. React's
 * `muted` attribute is unreliable — it doesn't always set the DOM `.muted`
 * property before playback, so browsers treat the clip as unmuted and block
 * autoplay (you see only the poster). We force the property via a ref and call
 * play() on mount and whenever data is ready. Cloudinary URLs are normalised to
 * a web-friendly mp4 with a first-frame poster.
 */
export default function AutoVideo({ src, className, poster, "aria-hidden": ariaHidden }: AutoVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    tryPlay();
    v.addEventListener("loadeddata", tryPlay);
    v.addEventListener("canplay", tryPlay);
    return () => {
      v.removeEventListener("loadeddata", tryPlay);
      v.removeEventListener("canplay", tryPlay);
    };
  }, [src]);

  return (
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
  );
}
