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
    setAvailable(canInstall("admin"));
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream);
    const onPrompt = () => setAvailable(canInstall("admin"));
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
    const outcome = await triggerInstall("admin");
    if (outcome === "accepted") toast("success", "অ্যাডমিন অ্যাপ ইনস্টল হচ্ছে…");
    else if (outcome === "dismissed") toast("info", "ইনস্টল বাতিল হয়েছে।");
    else
      // No admin prompt pending — either Chrome hasn't fired it yet, or the
      // pending prompt belongs to the customer app (arrived here via in-app
      // navigation). Reloading /sumon re-evaluates the admin manifest.
      toast("info", "এই পেজটি রিলোড করুন, তারপর “Install App” চাপুন — অথবা ব্রাউজার মেনু (⋮) → “Install app”।");
  };

  // Always show (except once installed) so the admin can install even before
  // Chrome fires its deferred prompt — the click handler covers every case. A
  // ready native prompt gets a subtle ring to invite the tap.
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 active:scale-95 transition-all ${available ? "ring-2 ring-brand-300 ring-offset-1" : ""}`}
      title="Install the admin panel as an app"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
}
