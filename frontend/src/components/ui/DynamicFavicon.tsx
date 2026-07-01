"use client";

import { useEffect } from "react";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";

/** Applies admin `favicon_url` setting to the document when set. */
export default function DynamicFavicon() {
  const { settings } = usePublicSettings(["favicon_url"]);
  const faviconUrl = getSettingValue(settings, "favicon_url");

  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-dynamic="true"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.setAttribute("data-dynamic", "true");
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [faviconUrl]);

  return null;
}
