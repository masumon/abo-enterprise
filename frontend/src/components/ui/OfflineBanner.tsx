"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, SignalLow } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { offlineSync } from "@/lib/offlineSync";
import { getNetworkQuality, type NetworkQuality } from "@/lib/networkStatus";
import { cn } from "@/lib/utils";

export default function OfflineBanner() {
  const [quality, setQuality] = useState<NetworkQuality>("online");
  const [syncing, setSyncing] = useState(false);
  const { lang } = useLanguageStore();

  useEffect(() => {
    offlineSync.init().catch(() => {});
    setQuality(getNetworkQuality());

    const refresh = () => setQuality(getNetworkQuality());
    const onOnline = () => { refresh(); sync(); };
    const onOffline = () => refresh();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
    conn?.addEventListener?.("change", refresh);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      conn?.removeEventListener?.("change", refresh);
    };
  }, []);

  const sync = async () => {
    setSyncing(true);
    try { await offlineSync.syncPendingActions(); } finally { setSyncing(false); }
  };

  if (quality === "online") return null;

  const isOffline = quality === "offline";

  return (
    <div
      className={cn(
        "fixed top-[var(--navbar-offset)] left-0 right-0 z-[60] text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium",
        isOffline ? "bg-amber-500" : "bg-blue-600"
      )}
    >
      {isOffline ? <WifiOff className="w-4 h-4" /> : <SignalLow className="w-4 h-4" />}
      {isOffline
        ? (lang === "bn" ? "আপনি অফলাইনে আছেন — সংরক্ষিত কন্টেন্ট দেখানো হচ্ছে" : "You are offline — showing saved content")
        : (lang === "bn" ? "মোবাইল নেটওয়ার্ক — সংরক্ষিত কন্টেন্ট দেখানো হচ্ছে" : "Mobile network — showing saved content")}
      {isOffline && (
        <button type="button" onClick={sync} disabled={syncing} className="ml-2 underline flex items-center gap-1">
          <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
          {lang === "bn" ? "সিঙ্ক" : "Sync"}
        </button>
      )}
    </div>
  );
}
