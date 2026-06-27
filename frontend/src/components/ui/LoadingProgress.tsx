"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  loading: boolean;
  message?: string;
  className?: string;
}

export default function LoadingProgress({ loading, message, className }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading) {
      setProgress(100);
      return;
    }
    setProgress(8);
    const id = setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + Math.random() * 12));
    }, 400);
    return () => clearInterval(id);
  }, [loading]);

  if (!loading && progress >= 100) return null;

  return (
    <div className={cn("w-full", className)} role="status" aria-live="polite" aria-busy={loading}>
      <div className="h-1 w-full bg-brand-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {message && (
        <p className="text-xs text-gray-500 mt-2 text-center">{message}</p>
      )}
    </div>
  );
}
