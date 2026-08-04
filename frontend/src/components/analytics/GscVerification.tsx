"use client";

import { useEffect } from "react";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";

/**
 * Google Search Console "HTML tag" verification method. GSC's verifier
 * fetches and renders the page with JS enabled, so a client-injected meta
 * tag is sufficient — no server-side change needed to add/rotate this.
 */
export default function GscVerification() {
  const { settings } = usePublicSettings(["seo_gsc_verification"]);
  const content = getSettingValue(settings, "seo_gsc_verification");

  useEffect(() => {
    if (!content) return;
    const existing = document.querySelector('meta[name="google-site-verification"]');
    if (existing) return;
    const meta = document.createElement("meta");
    meta.name = "google-site-verification";
    meta.content = content;
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, [content]);

  return null;
}
