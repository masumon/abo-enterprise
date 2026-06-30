"use client";

import { SITE_URL } from "@/lib/tokens";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Download, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | "desktop" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

const DISMISSED_KEY = "pwa_prompt_dismissed";
const NEVER_KEY = "pwa_prompt_never";
const VISIT_KEY = "pwa_visit_count";
const DISMISS_DAYS = 90;
const MIN_VISITS = 4;
const SITE_HOST = new URL(SITE_URL).hostname;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(NEVER_KEY) === "1") return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - parseInt(dismissed, 10) < DISMISS_DAYS * 86400000) return;

    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    if (visits < MIN_VISITS) return;

    const p = detectPlatform();
    setPlatform(p);
    if (p === "ios") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => {
      if (localStorage.getItem(NEVER_KEY) !== "1") setShow(true);
    }, 12000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(NEVER_KEY, "1");
      setShow(false);
    } else {
      setInstalling(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  const handleNever = () => {
    setShow(false);
    localStorage.setItem(NEVER_KEY, "1");
  };

  if (!show || platform === "ios") return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={handleDismiss} aria-hidden="true" />

      <div className="fixed bottom-0 left-0 right-0 z-[70] animate-slide-up pb-mobile-nav lg:pb-4">
        <div className="surface-card rounded-t-3xl shadow-2xl px-6 pt-5 pb-8 max-w-lg mx-auto mx-4 sm:mx-auto border-b-0">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
              <Image src="/icons/icon-192.png" alt="ABO" width={56} height={56} />
            </div>
            <div>
              <p className="font-bold text-heading">ABO Enterprise App</p>
              <p className="text-sm text-muted">{SITE_HOST}</p>
            </div>
          </div>

          {deferredPrompt ? (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 mb-2"
            >
              <Download className="w-5 h-5" />
              {installing ? "Installing…" : "Install App"}
            </button>
          ) : (
            <p className="text-sm text-muted mb-3 text-center">
              Browser menu → &quot;Install app&quot; or &quot;Add to Home Screen&quot;
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={handleDismiss} className="flex-1 text-center text-sm text-muted py-2">
              Later
            </button>
            <button onClick={handleNever} className="flex-1 text-center text-sm text-gray-400 py-2">
              Don&apos;t ask again
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
