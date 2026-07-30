import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "@/components/home/Hero";
import TrustBadges from "@/components/home/TrustBadges";
import QuickCategories from "@/components/home/QuickCategories";
import HomeLanes from "@/components/home/HomeLanes";
import Reveal from "@/components/ui/Reveal";
import { SITE_URL, SOCIAL_PROFILES, DEFAULT_OG_IMAGE, getBrandFullTitle } from "@/lib/tokens";
import { jsonLdString } from "@/lib/metadata";

const EntryPoints = dynamic(() => import("@/components/home/EntryPoints"), { loading: () => <SectionSkeleton /> });
const Stats = dynamic(() => import("@/components/home/Stats"), { loading: () => <StatsRowSkeleton /> });
const ServicesOverview = dynamic(() => import("@/components/home/ServicesOverview"), { loading: () => <CardsSkeleton label="Services" /> });
const FeaturedProducts = dynamic(() => import("@/components/home/FeaturedProducts"), { loading: () => <CardsSkeleton label="Products" /> });
const WhyChooseUs = dynamic(() => import("@/components/home/WhyChooseUs"), { loading: () => <SectionSkeleton /> });
const CustomerReviews = dynamic(() => import("@/components/home/CustomerReviews"), { loading: () => <SectionSkeleton /> });
const FAQ = dynamic(() => import("@/components/home/FAQ"), { loading: () => <SectionSkeleton /> });
const LeadCapture = dynamic(() => import("@/components/home/LeadCapture"), { loading: () => <SectionSkeleton /> });
const ContactSection = dynamic(() => import("@/components/home/ContactSection"), { loading: () => <SectionSkeleton /> });
const Portfolio = dynamic(() => import("@/components/home/Portfolio"), { loading: () => <CardsSkeleton label="Projects" /> });
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

/*
 * Screen 04 — every lazy block used the same grey pulse, so the page told the
 * visitor that something was coming but never what, and each block jumped when
 * it landed. These hold the shape of what replaces them (GAP-18).
 */
function SectionSkeleton() {
  return <div className="py-16 motion-safe:animate-pulse bg-gray-50/50 dark:bg-[var(--surface-secondary)]/60" aria-hidden />;
}

function CardsSkeleton({ label }: { label: string }) {
  return (
    <section className="container mx-auto px-4 py-12" aria-busy="true" aria-label={label}>
      <div className="h-6 w-48 mb-6 rounded-lg bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden">
            <div className="h-40 bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsRowSkeleton() {
  return (
    <section className="container mx-auto px-4 py-12" aria-busy="true">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 dark:border-white/10 p-5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
            <div className="h-7 w-20 rounded bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
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
      <Reveal><QuickCategories /></Reveal>
      <Reveal><TrustBadges /></Reveal>
      <Reveal><EntryPoints /></Reveal>
      <Reveal><Stats /></Reveal>
      {/* GAP-23 — the three arms of the business used to stack, so whichever
          one a visitor came for sat below the other two. Shop is the default
          lane; the others are one tap away and stay in the document. */}
      {/* No Reveal inside the panels: a Reveal starts at opacity-0 and waits for
          an IntersectionObserver, and an element that mounts inside a hidden
          panel has nothing to intersect. Switching lanes must never land on a
          section that is still waiting to fade in. */}
      <HomeLanes
        shop={<FeaturedProducts />}
        services={<ServicesOverview />}
        software={<Portfolio />}
      />
      <Reveal><ClientLogos /></Reveal>
      <Reveal><WhyChooseUs /></Reveal>
      <Reveal><CustomerReviews /></Reveal>
      <Reveal><FAQ /></Reveal>
      <Reveal><LeadCapture /></Reveal>
      <Reveal><ContactSection /></Reveal>
    </>
  );
}
