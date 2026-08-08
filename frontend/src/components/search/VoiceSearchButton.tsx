"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";

interface Props {
  lang: "en" | "bn";
  onResult: (text: string) => void;
  className?: string;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

function getSR(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Voice-to-text search using the browser Web Speech API. Renders nothing when
 * the browser doesn't support it, so it never shows a dead button. */
export default function VoiceSearchButton({ lang, onResult, className }: Props) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const SR = getSR();
  if (!SR) return null;

  const start = () => {
    try {
      const rec = new SR();
      rec.lang = lang === "bn" ? "bn-BD" : "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const t = e.results?.[0]?.[0]?.transcript?.trim();
        if (t) onResult(t);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  };
  const stop = () => { try { recRef.current?.stop(); } catch { /* ignore */ } setListening(false); };

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      aria-label={lang === "bn" ? "ভয়েস সার্চ" : "Voice search"}
      title={lang === "bn" ? "কথা বলে খুঁজুন" : "Search by voice"}
      className={className ?? "text-[var(--ink-muted)] hover:text-brand-600"}
    >
      <Mic className={`w-4 h-4 ${listening ? "text-red-500 animate-pulse" : ""}`} />
    </button>
  );
}
