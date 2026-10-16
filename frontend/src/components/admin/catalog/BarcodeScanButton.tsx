"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts?: { formats?: string[] }) => Detector;

/**
 * Scan a product barcode with the phone camera (Chrome / Android, Safari 17+).
 * Renders nothing where the browser has no built-in barcode reader, so the
 * typed field always remains the fallback.
 */
export default function BarcodeScanButton({ onResult }: { onResult: (code: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const detector = new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] });
        timer = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const hits = await detector.detect(videoRef.current);
            const code = hits[0]?.rawValue?.trim();
            if (code) { onResult(code); setOpen(false); }
          } catch { /* keep trying */ }
        }, 350);
      } catch {
        setError("ক্যামেরা চালু করা যায়নি — ব্রাউজারে ক্যামেরার অনুমতি দিন, অথবা নম্বরটি হাতে লিখুন।");
      }
    })();
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onResult]);

  if (!supported) return null;
  return (
    <>
      <button type="button" onClick={() => { setError(""); setOpen(true); }} className="btn btn-outline btn-sm gap-1.5 min-h-10" title="ক্যামেরা দিয়ে বারকোড স্ক্যান">
        <ScanLine className="w-4 h-4" /> স্ক্যান
      </button>
      {open && (
        <div className="admin-overlay admin-overlay--dialog fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="বারকোড স্ক্যান">
          <div className="admin-sheet admin-sheet--s w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm font-semibold text-heading">বারকোড ক্যামেরার সামনে ধরুন</p>
              <button type="button" onClick={() => setOpen(false)} className="p-2 text-gray-400" aria-label="বন্ধ"><X className="w-5 h-5" /></button>
            </div>
            {error ? (
              <p className="px-4 pb-4 text-sm text-red-600">{error}</p>
            ) : (
              <div className="relative bg-black aspect-[3/4]">
                <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute left-6 right-6 top-1/2 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,.9)]" aria-hidden />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
