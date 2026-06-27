import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "@/components/home/Hero";
import { SITE_URL, SOCIAL_PROFILES, DEFAULT_OG_IMAGE, BRAND_TAGLINE } from "@/lib/tokens";

const Stats = dynamic(() => import("@/components/home/Stats"), { loading: () => <SectionSkeleton /> });
const ServicesOverview = dynamic(() => import("@/components/home/ServicesOverview"), { loading: () => <SectionSkeleton /> });
const FeaturedProducts = dynamic(() => import("@/components/home/FeaturedProducts"), { loading: () => <SectionSkeleton /> });
const CustomerReviews = dynamic(() => import("@/components/home/CustomerReviews"), { loading: () => <SectionSkeleton /> });
const LeadCapture = dynamic(() => import("@/components/home/LeadCapture"), { loading: () => <SectionSkeleton /> });

export const metadata: Metadata = {
  title: "ABO Enterprise — বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম",
  description: BRAND_TAGLINE.bn,
  alternates: { canonical: SITE_URL },
  openGraph: {
    images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: "ABO Enterprise" }],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ABO Enterprise",
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  description: BRAND_TAGLINE.en,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Sylhet",
    addressCountry: "BD",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+8801825007977",
    contactType: "customer service",
    availableLanguage: ["Bengali", "English"],
  },
  sameAs: [...SOCIAL_PROFILES],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ABO Enterprise",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

function SectionSkeleton() {
  return <div className="py-16 animate-pulse bg-gray-50/50" aria-hidden />;
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Hero />
      <Stats />
      <ServicesOverview />
      <FeaturedProducts />
      <CustomerReviews />
      <LeadCapture />
    </>
  );
}
