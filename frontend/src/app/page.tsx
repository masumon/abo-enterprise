import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "@/components/home/Hero";
import TrustBadges from "@/components/home/TrustBadges";
import QuickCategories from "@/components/home/QuickCategories";
import { SITE_URL, SOCIAL_PROFILES, DEFAULT_OG_IMAGE, getBrandFullTitle } from "@/lib/tokens";
import { jsonLdString } from "@/lib/metadata";

const EntryPoints = dynamic(() => import("@/components/home/EntryPoints"), { loading: () => <SectionSkeleton /> });
const Stats = dynamic(() => import("@/components/home/Stats"), { loading: () => <SectionSkeleton /> });
const ServicesOverview = dynamic(() => import("@/components/home/ServicesOverview"), { loading: () => <SectionSkeleton /> });
const FeaturedProducts = dynamic(() => import("@/components/home/FeaturedProducts"), { loading: () => <SectionSkeleton /> });
const WhyChooseUs = dynamic(() => import("@/components/home/WhyChooseUs"), { loading: () => <SectionSkeleton /> });
const CustomerReviews = dynamic(() => import("@/components/home/CustomerReviews"), { loading: () => <SectionSkeleton /> });
const FAQ = dynamic(() => import("@/components/home/FAQ"), { loading: () => <SectionSkeleton /> });
const LeadCapture = dynamic(() => import("@/components/home/LeadCapture"), { loading: () => <SectionSkeleton /> });
const ContactSection = dynamic(() => import("@/components/home/ContactSection"), { loading: () => <SectionSkeleton /> });
const Portfolio = dynamic(() => import("@/components/home/Portfolio"), { loading: () => <SectionSkeleton /> });
const ClientLogos = dynamic(() => import("@/components/home/ClientLogos"), { loading: () => <SectionSkeleton /> });

export const metadata: Metadata = {
  title: getBrandFullTitle("bn"),
  description:
    "ABO Enterprise — premium tech products, digital services & AI business solutions. Mobile accessories, digital services (Passport, NID, bKash), mobile & computer software, POS, ERP, AI and web development in Bangladesh.",
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
  description: getBrandFullTitle("en"),
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

// Local-pack / Maps visibility for the Sylhet storefront
const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#localbusiness`,
  name: "ABO Enterprise",
  image: DEFAULT_OG_IMAGE,
  url: SITE_URL,
  telephone: "+8801825007977",
  priceRange: "৳৳",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Hazi Bahar Uddin Market, Abdullapur, Bairagibazar-3170",
    addressLocality: "Beanibazar",
    addressRegion: "Sylhet",
    postalCode: "3170",
    addressCountry: "BD",
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    opens: "09:00",
    closes: "21:00",
  },
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
  return <div className="py-16 animate-pulse bg-gray-50/50 dark:bg-[var(--surface-secondary)]/60" aria-hidden />;
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(localBusinessJsonLd) }}
      />
      <Hero />
      <QuickCategories />
      <TrustBadges />
      <EntryPoints />
      <Stats />
      <ServicesOverview />
      <FeaturedProducts />
      <Portfolio />
      <ClientLogos />
      <WhyChooseUs />
      <CustomerReviews />
      <FAQ />
      <LeadCapture />
      <ContactSection />
    </>
  );
}
