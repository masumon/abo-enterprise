import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/features/CartDrawer";
import WhatsAppButton from "@/components/ui/WhatsAppButton";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://aboenterprise.com"),
  openGraph: {
    type: "website",
    locale: "bn_BD",
    alternateLocale: "en_US",
    siteName: "ABO Enterprise",
    title: "ABO Enterprise — বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম",
    description: "মোবাইল এক্সেসরিজ থেকে AI সমাধান — সব একজায়গায়।",
  },
  twitter: {
    card: "summary_large_image",
    title: "ABO Enterprise",
    description: "Bangladesh's Complete Technology Ecosystem",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1e5ba8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
        <CartDrawer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
