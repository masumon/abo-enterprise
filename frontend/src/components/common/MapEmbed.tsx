"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { mapsDirectionsUrl, resolveGoogleMapsLink } from "@/lib/maps";
import { cn } from "@/lib/utils";

interface MapEmbedProps {
  embedSrc: string;
  address: string;
  title?: string;
  className?: string;
  minHeight?: string;
}

export default function MapEmbed({
  embedSrc,
  address,
  title = "ABO Enterprise Location",
  className,
  minHeight = "16rem",
}: MapEmbedProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  const placeUrl = resolveGoogleMapsLink(embedSrc, address);
  const directionsUrl = mapsDirectionsUrl(address);

  useEffect(() => {
    if (!embedSrc) {
      setStatus("failed");
      return;
    }
    setStatus("loading");
    const timer = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "failed" : s));
    }, 12000);
    return () => clearTimeout(timer);
  }, [embedSrc]);

  return (
    <div className={cn("relative w-full overflow-hidden bg-gray-100", className)} style={{ minHeight }}>
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <MapPin className="w-8 h-8 animate-pulse" />
            <span className="text-xs">Loading map…</span>
          </div>
        </div>
      )}

      {status === "failed" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-gradient-to-br from-brand-50 to-accent-50">
          <MapPin className="w-10 h-10 text-brand-600" />
          <p className="text-sm font-medium text-gray-800 max-w-xs">{address}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <a
              href={placeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-brand btn-sm inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Google Maps
            </a>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm inline-flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              Directions
            </a>
          </div>
        </div>
      )}

      {embedSrc && status !== "failed" && (
        <iframe
          title={title}
          src={embedSrc}
          className={cn("w-full h-full border-0", status === "loading" && "opacity-0 absolute inset-0")}
          style={{ minHeight }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          onLoad={() => setStatus("loaded")}
        />
      )}
    </div>
  );
}
