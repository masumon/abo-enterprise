import { NextResponse } from "next/server";
import { fetchPublicSettings, settingValue } from "@/lib/serverSettings";

// Dynamic customer PWA manifest — name/short_name/description come from
// Settings (site_name) so changing the company name in the admin panel
// actually reaches the installed app, not just the website chrome. Icons and
// theme stay static: an admin-uploaded image isn't guaranteed to be a valid
// square PNG at the required sizes, and a bad icon set breaks installability.
export const revalidate = 60;

export async function GET() {
  const settings = await fetchPublicSettings();
  const siteName = settingValue(settings, "site_name", "এবিও এন্টারপ্রাইজ");
  const tagline = settingValue(
    settings,
    "site_tagline_bn",
    "সহজ সমাধান — মোবাইল এক্সেসরিজ, প্রিন্টিং, আইনি সেবা, সফটওয়্যার"
  );

  const manifest = {
    id: "/",
    name: siteName,
    // Not truncated: slicing a Bengali string by UTF-16 code units risks
    // cutting a conjunct mid-glyph. Reuse the full name if no shorter one fits.
    short_name: siteName,
    description: `${siteName} : ${tagline}`,
    scope: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#1e2b6b",
    theme_color: "#1e2b6b",
    categories: ["shopping", "productivity", "business"],
    lang: "bn",
    dir: "ltr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      {
        name: "শপিং",
        short_name: "কেনাকাটা",
        description: "পণ্য ব্রাউজ করুন এবং কিনুন",
        url: "/products?utm_source=pwa_shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "আমার অর্ডার",
        short_name: "অর্ডার",
        description: "অর্ডার ট্র্যাক করুন এবং বুকিং দেখুন",
        url: "/orders?utm_source=pwa_shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "সেবা বুক করুন",
        short_name: "বুকিং",
        description: "আমাদের সেবা বুক করুন",
        url: "/services?utm_source=pwa_shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    prefer_related_applications: false,
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
