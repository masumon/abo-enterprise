import type { Metadata } from "next";
import AponPageClient from "@/components/apon/AponPageClient";
import { jsonLdString, pageMeta } from "@/lib/metadata";
import { SITE_URL } from "@/lib/tokens";

const TITLE = "আপন (Apon) অ্যাপ ডাউনলোড — ফ্রি Android অ্যাপ";
const DESCRIPTION =
  "আপন — আপনার নিজের জীবনের একটি খাতা। কাজ, স্মৃতি, টাকা ও স্বাস্থ্যের হিসাব এক অ্যাপে; সব তথ্য আপনার ফোনেই, অফলাইনে চলে। ফ্রি Android ডাউনলোড।";

export const metadata: Metadata = {
  ...pageMeta(TITLE, DESCRIPTION, "/apon"),
  openGraph: {
    title: `${TITLE} | ABO Enterprise`,
    description: DESCRIPTION,
    url: `${SITE_URL}/apon`,
    images: [{ url: `${SITE_URL}/apon/og.jpg`, width: 1200, height: 630, alt: "আপন (Apon) অ্যাপ" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [`${SITE_URL}/apon/og.jpg`] },
};

export default function AponPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "আপন (Apon)",
    alternateName: "Apon",
    operatingSystem: "Android 7.0+",
    applicationCategory: "LifestyleApplication",
    description: DESCRIPTION,
    image: `${SITE_URL}/apon/icon-512.png`,
    url: `${SITE_URL}/apon`,
    inLanguage: ["bn", "en"],
    offers: { "@type": "Offer", price: "0", priceCurrency: "BDT" },
    publisher: { "@type": "Organization", name: "ABO Enterprise", url: SITE_URL },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <AponPageClient />
    </>
  );
}
