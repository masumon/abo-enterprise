import type { Metadata, Viewport } from "next";
import "./globals.css";
import StoreHydration from "@/components/providers/StoreHydration";
import PublicShell from "@/components/layout/PublicShell";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import UtmTracker from "@/lib/utm";
import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/tokens";
import { getApiBaseUrl } from "@/lib/apiBase";

const API_ORIGIN = getApiBaseUrl();

export const metadata: Metadata = {
  title: {
    default: "ABO Enterprise — মোবাইল এক্সেসরিজ, সফটওয়্যার, AI সমাধান | সিলেট",
    template: "%s | ABO Enterprise",
  },
  description:
    "বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম। মোবাইল এক্সেসরিজ, গ্যাজেট, প্রিন্টিং, আইনি সেবা, ওয়েবসাইট, AI সমাধান এবং কাস্টম সফটওয়্যার — একটি প্ল্যাটফর্মে।",
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
  openGraph: {
    type: "website",
    locale: "bn_BD",
    alternateLocale: "en_US",
    siteName: "ABO Enterprise",
    title: "ABO Enterprise — বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম",
    description: "মোবাইল এক্সেসরিজ থেকে AI সমাধান — সব একজায়গায়।",
    images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: "ABO Enterprise" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ABO Enterprise",
    description: "Bangladesh's Complete Technology Ecosystem",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ABO Enterprise",
  },
};

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
        <GoogleAnalytics />
        <StoreHydration />
        <UtmTracker />
        <PublicShell>{children}</PublicShell>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
