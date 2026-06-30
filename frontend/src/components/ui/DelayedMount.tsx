"use client";

import { useEffect, useState } from "react";

/** Delays mounting children to reduce mobile floating UI clutter on first paint. */
export default function DelayedMount({
  children,
  delayMs = 5000,
}: {
  children: React.ReactNode;
  delayMs?: number;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  if (!show) return null;
  return <>{children}</>;
}
