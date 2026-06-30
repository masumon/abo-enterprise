"use client";

import Script from "next/script";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";

export default function FacebookPixel() {
  const { settings } = usePublicSettings(["facebook_pixel_id"]);
  const pixelId = getSettingValue(settings, "facebook_pixel_id");

  if (!pixelId) return null;

  return (
    <>
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

export function trackPurchase(value: number, orderNumber?: string) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "Purchase", {
      value,
      currency: "BDT",
      content_ids: orderNumber ? [orderNumber] : undefined,
    });
  }
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}
