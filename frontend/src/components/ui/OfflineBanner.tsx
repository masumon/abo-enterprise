"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { offlineSync } from "@/lib/offlineSync";
import { cn } from "@/lib/utils";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { lang } = useLanguageStore();

  useEffect(() => {
    offlineSync.init().catch(() => {});
    setOnline(navigator.onLine);
    const onOnline = () => { setOnline(true); sync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const sync = async () => {
    setSyncing(true);
    try { await offlineSync.syncPendingActions(); } finally { setSyncing(false); }
  };

  if (online) return null;

  return (
    <div className="fixed top-[var(--navbar-offset)] left-0 right-0 z-[60] bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
      <WifiOff className="w-4 h-4" />
      {lang === "bn" ? "আপনি অফলাইনে আছেন — কিছু ফিচার সীমিত" : "You are offline — some features are limited"}
      <button type="button" onClick={sync} disabled={syncing} className="ml-2 underline flex items-center gap-1">
        <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
        {lang === "bn" ? "সিঙ্ক" : "Sync"}
      </button>
    </div>
  );
}
