import type { Metadata, Viewport } from "next";
import "./globals.css";
import StoreHydration from "@/components/providers/StoreHydration";
import PublicShell from "@/components/layout/PublicShell";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import PWASplashScreen from "@/components/pwa/PWASplashScreen";
import NetworkStatusBar from "@/components/network/NetworkStatusBar";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import UtmTracker from "@/lib/utm";
import { DEFAULT_OG_IMAGE, SITE_URL, getBrandFullTitle } from "@/lib/tokens";
import { getApiBaseUrl } from "@/lib/apiBase";
import { fetchPublicSettings, settingValue } from "@/lib/serverSettings";

const API_ORIGIN = getApiBaseUrl();

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchPublicSettings();
  const ogImage =
    settingValue(settings, "default_og_image_url") ||
    settingValue(settings, "logo_url") ||
    DEFAULT_OG_IMAGE;
  const favicon = settingValue(settings, "favicon_url");
  const appIcon = settingValue(settings, "app_icon_url") || settingValue(settings, "logo_url");

  return {
    title: {
      default: "ABO Enterprise — মোবাইল এক্সেসরিজ, সফটওয়্যার, AI সমাধান | সিলেট",
      template: "%s | ABO Enterprise",
    },
    description:
      "এবিও এন্টারপ্রাইজ : সহজ সমাধান — মোবাইল এক্সেসরিজ, গ্যাজেট, প্রিন্টিং, আইনি সেবা, ওয়েবসাইট, AI সমাধান এবং কাস্টম সফটওয়্যার — একটি প্ল্যাটফর্মে।",
    keywords: [
      "ABO Enterprise",
      "মোবাইল এক্সেসরিজ সিলেট",
      "AI সমাধান বাংলাদেশ",
      "সফটওয়্যার ডেভেলপমেন্ট",
      "ওয়েবসাইট ডিজাইন সিলেট",
      "প্রিন্টিং সেবা",
      "আইনি সেবা",
      "ERP সফটওয়্যার",
      "mobile accessories Sylhet",
      "software development Bangladesh",
    ],
    authors: [{ name: "Mumain Ahmed (Sumon)", url: "https://mumain.dev" }],
    creator: "Mumain Ahmed (Sumon) | Mumain.dev",
    publisher: "ABO Enterprise",
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: SITE_URL,
      // Site content is bilingual on the same URL — declare both plus
      // x-default so search engines don't index one language as canonical.
      languages: {
        bn: SITE_URL,
        en: SITE_URL,
        "x-default": SITE_URL,
      },
    },
    openGraph: {
      type: "website",
      locale: "bn_BD",
      alternateLocale: "en_US",
      siteName: "ABO Enterprise",
      title: getBrandFullTitle("bn"),
      description: "মোবাইল এক্সেসরিজ থেকে AI সমাধান — সহজ সমাধান, সব এক জায়গায়।",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "ABO Enterprise" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "ABO Enterprise",
      description: getBrandFullTitle("en"),
      images: [ogImage],
    },
    robots: { index: true, follow: true },
    // Google Search Console HTML-tag verification (optional; DNS also works)
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
      : {}),
    icons: {
      icon: favicon
        ? [{ url: favicon, sizes: "any" }]
        : [
            { url: "/favicon.ico", sizes: "any" },
            { url: appIcon || "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: appIcon || "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
      apple: [{ url: appIcon || "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: favicon || appIcon || "/icons/icon-192.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "ABO Enterprise",
      // iOS PWA launch screens — brand background + optimized round logo,
      // generated per device size (iOS shows white otherwise).
      startupImage: [
        { url: "/splash/apple-splash-640x1136.png", media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
        { url: "/splash/apple-splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
        { url: "/splash/apple-splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
        { url: "/splash/apple-splash-1080x2340.png", media: "(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
        { url: "/splash/apple-splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
        { url: "/splash/apple-splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
        { url: "/splash/apple-splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
        { url: "/splash/apple-splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
        { url: "/splash/apple-splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
        { url: "/splash/apple-splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
        { url: "/splash/apple-splash-1536x2048.png", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
        { url: "/splash/apple-splash-1668x2388.png", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
        { url: "/splash/apple-splash-2048x2732.png", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      ],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#1e5ba8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="dns-prefetch" href="https://maps.google.com" />
        <link rel="preconnect" href={API_ORIGIN} />
        <link rel="dns-prefetch" href={API_ORIGIN} />
      </head>
      <body className="min-h-screen flex flex-col">
        <PWASplashScreen />
        <NetworkStatusBar />
        <GoogleAnalytics />
        <StoreHydration />
        <UtmTracker />
        <PublicShell>{children}</PublicShell>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
