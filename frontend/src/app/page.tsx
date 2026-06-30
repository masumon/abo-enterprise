import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "@/components/home/Hero";
import TrustBadges from "@/components/home/TrustBadges";
import { SITE_URL, SOCIAL_PROFILES, DEFAULT_OG_IMAGE, BRAND_TAGLINE } from "@/lib/tokens";

const EntryPoints = dynamic(() => import("@/components/home/EntryPoints"), { loading: () => <SectionSkeleton /> });
const Stats = dynamic(() => import("@/components/home/Stats"), { loading: () => <SectionSkeleton /> });
const Industries = dynamic(() => import("@/components/home/Industries"), { loading: () => <SectionSkeleton /> });
const SoftwareSolutions = dynamic(() => import("@/components/home/SoftwareSolutions"), { loading: () => <SectionSkeleton /> });
const ServicesOverview = dynamic(() => import("@/components/home/ServicesOverview"), { loading: () => <SectionSkeleton /> });
const FeaturedProducts = dynamic(() => import("@/components/home/FeaturedProducts"), { loading: () => <SectionSkeleton /> });
const WhyChooseUs = dynamic(() => import("@/components/home/WhyChooseUs"), { loading: () => <SectionSkeleton /> });
const ProcessTimeline = dynamic(() => import("@/components/home/ProcessTimeline"), { loading: () => <SectionSkeleton /> });
const Portfolio = dynamic(() => import("@/components/home/Portfolio"), { loading: () => <SectionSkeleton /> });
const CustomerReviews = dynamic(() => import("@/components/home/CustomerReviews"), { loading: () => <SectionSkeleton /> });
const ClientLogos = dynamic(() => import("@/components/home/ClientLogos"), { loading: () => <SectionSkeleton /> });
const FAQ = dynamic(() => import("@/components/home/FAQ"), { loading: () => <SectionSkeleton /> });
const LeadCapture = dynamic(() => import("@/components/home/LeadCapture"), { loading: () => <SectionSkeleton /> });
const ContactSection = dynamic(() => import("@/components/home/ContactSection"), { loading: () => <SectionSkeleton /> });

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
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

function SectionSkeleton() {
  return <div className="py-16 animate-pulse bg-gray-50/50 dark:bg-white/[0.02]" aria-hidden />;
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
      <TrustBadges />
      <EntryPoints />
      <Stats />
      <Industries />
      <SoftwareSolutions />
      <ServicesOverview />
      <FeaturedProducts />
      <WhyChooseUs />
      <ProcessTimeline />
      <Portfolio />
      <CustomerReviews />
      <ClientLogos />
      <FAQ />
      <LeadCapture />
      <ContactSection />
    </>
  );
}
