"use client";

import Script from "next/script";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { useCookieConsent } from "@/lib/cookieConsent";

export default function GoogleTagManager() {
  const { settings } = usePublicSettings(["seo_gtm_id"]);
  const gtmId = getSettingValue(settings, "seo_gtm_id");
  // A tag container can carry analytics and ad tags, so it loads only after the
  // visitor accepted analytics or marketing cookies (opt-in).
  const { analytics, marketing } = useCookieConsent();

  if (!gtmId || !(analytics || marketing)) return null;

  return (
    <>
      <Script id="gtm-loader" strategy="lazyOnload">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
