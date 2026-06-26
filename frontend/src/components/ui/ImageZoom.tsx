"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  alt: string;
  className?: string;
}

export default function ImageZoom({ src, alt, className }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("relative group w-full h-full", className)}
        aria-label="Zoom image"
      >
        <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <button type="button" className="absolute top-4 right-4 text-white p-2" onClick={() => setOpen(false)} aria-label="Close">
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full max-w-4xl aspect-square" onClick={(e) => e.stopPropagation()}>
            <Image src={src} alt={alt} fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      )}
    </>
  );
}
