"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { getApiBaseUrl } from "@/lib/apiBase";

const API_BASE = getApiBaseUrl();

let warmed = false;

/** Pings backend /health to reduce Render cold-start latency on first user action. */
export default function ApiWarmup() {
  const { lang } = useLanguageStore();
  const [warming, setWarming] = useState(!warmed);

  useEffect(() => {
    if (warmed) return;
    const controller = new AbortController();
    const timeoutMs = typeof navigator !== "undefined" &&
      (navigator as Navigator & { connection?: { type?: string } }).connection?.type === "cellular"
      ? 25000
      : 55000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    fetch(`${API_BASE}/health`, { signal: controller.signal })
      .then((r) => { if (r.ok) warmed = true; })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        setWarming(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (!warming) return null;

  return (
    <div
      className="fixed bottom-mobile-float lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-xs z-30 surface-card backdrop-blur-md rounded-xl px-4 py-3 shadow-lg flex items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-4 h-4 text-brand-500 animate-spin flex-shrink-0" aria-hidden />
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {lang === "bn" ? "সার্ভার প্রস্তুত হচ্ছে..." : "Warming up server..."}
        </p>
        <p className="text-xs text-muted">
          {lang === "bn" ? "প্রথম লোডে ৩০–৬০ সেকেন্ড লাগতে পারে" : "First load may take 30–60 seconds"}
        </p>
      </div>
    </div>
  );
}
