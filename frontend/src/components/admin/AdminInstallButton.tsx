"use client";

import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { triggerInstall, canInstall, isStandalone } from "@/lib/pwaInstall";
import { useToastStore } from "@/store/toast";

/**
 * Installs the ADMIN panel as its own PWA (separate from the customer app — see
 * public/admin.webmanifest, linked only on /sumon pages). Lives in the admin
 * top bar, so only a signed-in admin ever sees it. Android/desktop Chromium get
 * the one-tap native prompt; iOS Safari has no prompt API, so we show the
 * Share → "Add to Home Screen" instruction instead.
 */
export default function AdminInstallButton() {
  const toast = useToastStore((s) => s.push);
  const [installed, setInstalled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setAvailable(canInstall());
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream);
    const onPrompt = () => setAvailable(true);
    const onInstalled = () => { setInstalled(true); setAvailable(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already running as the installed app — nothing to offer.
  if (installed) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold" title="Admin app installed">
        <Check className="w-4 h-4" /> App
      </span>
    );
  }

  const handleClick = async () => {
    if (isIos) {
      toast("info", "Safari-তে: Share (⬆️) → “Add to Home Screen” চাপুন — অ্যাডমিন অ্যাপ ইনস্টল হবে।");
      return;
    }
    const outcome = await triggerInstall();
    if (outcome === "accepted") toast("success", "অ্যাডমিন অ্যাপ ইনস্টল হচ্ছে…");
    else if (outcome === "unavailable")
      toast("info", "ব্রাউজার মেনু → “Install app / Add to Home screen” থেকে ইনস্টল করুন।");
  };

  // On iOS always show (manual flow); elsewhere only when a prompt is available.
  if (!available && !isIos) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 active:scale-95 transition-all"
      title="Install the admin panel as an app"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
}
