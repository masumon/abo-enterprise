"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** Fires a page_view on App Router route changes. The gtag config below uses
 * send_page_view:false, so this is the ONLY source of page_views — exactly
 * one per navigation, no duplicates. */
function RouteTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!GA_ID || !pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}

export default function GoogleAnalytics() {
  if (!GA_ID) {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.warn("GA disabled: NEXT_PUBLIC_GA_MEASUREMENT_ID is not set");
    }
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
      <RouteTracker />
    </>
  );
}

export function trackEvent(name: string, params?: Record<string, string | number>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}
