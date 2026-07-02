"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import { offlineSync, type OfflineSubmissionStatus } from "@/lib/offlineSync";

const SYNCED_VISIBILITY_MS = 5000;

export default function OfflineSubmissionBadge() {
  const [status, setStatus] = useState<OfflineSubmissionStatus | null>(null);
  const [showSyncedUntil, setShowSyncedUntil] = useState<number | null>(null);

  useEffect(() => {
    return offlineSync.subscribe((nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus.queuedCount === 0 && nextStatus.lastEvent === "synced") {
        setShowSyncedUntil((nextStatus.lastUpdatedAt ?? Date.now()) + SYNCED_VISIBILITY_MS);
      }
    });
  }, []);

  useEffect(() => {
    if (!showSyncedUntil) return;

    const remaining = showSyncedUntil - Date.now();
    if (remaining <= 0) {
      setShowSyncedUntil(null);
      return;
    }

    const timer = window.setTimeout(() => setShowSyncedUntil(null), remaining);
    return () => window.clearTimeout(timer);
  }, [showSyncedUntil]);

  if (!status) return null;

  const hasQueued = status.queuedCount > 0;
  const showSynced = Boolean(showSyncedUntil && showSyncedUntil > Date.now());

  if (!hasQueued && !showSynced) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-xs rounded-2xl border bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:bottom-6 dark:bg-gray-950/95">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${
            hasQueued ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
          }`}
        >
          {hasQueued ? <Clock3 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <span
            className={`badge ${
              hasQueued ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
            }`}
          >
            {hasQueued ? `Queued ${status.queuedCount}` : "Synced"}
          </span>
          <p className="mt-2 text-sm font-medium text-heading">
            {hasQueued ? "Offline submission saved" : "Queued submissions synced"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {hasQueued ? "It will sync automatically when your connection returns." : "Your pending submissions have been delivered."}
          </p>
        </div>
      </div>
    </div>
  );
}
