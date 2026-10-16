"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useCookieConsent } from "@/lib/cookieConsent";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";

const ENV_GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** Fires a page_view on App Router route changes. The gtag config below uses
 * send_page_view:false, so this is the ONLY source of page_views — exactly
 * one per navigation, no duplicates. */
function RouteTracker({ GA_ID }: { GA_ID: string }) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs on mount / when the listed value changes only
  }, [pathname]);

  return null;
}

export default function GoogleAnalytics() {
  // Opt-in: no analytics script or cookie until the visitor accepts analytics cookies.
  const { analytics } = useCookieConsent();
  // Admin → Settings → Marketing (seo_ga4_id) wins; the old Vercel env variable still works as a fallback.
  const { settings } = usePublicSettings(["seo_ga4_id"]);
  const GA_ID = (getSettingValue(settings, "seo_ga4_id") || ENV_GA_ID || "").trim();
  if (!/^G-[A-Z0-9]{6,}$/i.test(GA_ID)) return null;
  if (!analytics) return null;

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
      <RouteTracker GA_ID={GA_ID} />
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
