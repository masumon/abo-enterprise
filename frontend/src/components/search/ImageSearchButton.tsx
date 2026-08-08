"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useToastStore } from "@/store/toast";

interface Props {
  lang: "en" | "bn";
  onResult: (text: string) => void;
  className?: string;
}

/**
 * "Search by photo": the user picks/takes a picture, the text on it is read
 * with on-device OCR (tesseract.js, lazy-loaded only on tap so it never slows
 * the initial page), and that text runs a normal search. Bengali + English.
 * Everything degrades gracefully — a failure just shows a toast.
 */
export default function ImageSearchButton({ lang, onResult, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToastStore((s) => s.push);
  const bn = lang === "bn";

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(file, "eng+ben");
      const text = (data?.text || "").replace(/\s+/g, " ").trim().slice(0, 60);
      if (text.length >= 2) {
        onResult(text);
      } else {
        toast("info", bn ? "ছবিতে পড়ার মতো লেখা পাওয়া যায়নি" : "No readable text found in the image");
      }
    } catch {
      toast("error", bn ? "ছবি পড়া যায়নি — আবার চেষ্টা করুন" : "Couldn't read the image — try again");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={bn ? "ছবি দিয়ে সার্চ" : "Search by image"}
        title={bn ? "ছবি দিয়ে খুঁজুন" : "Search by photo"}
        className={className ?? "text-[var(--ink-muted)] hover:text-brand-600 disabled:opacity-50"}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin text-brand-500" /> : <Camera className="w-4 h-4" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </>
  );
}
