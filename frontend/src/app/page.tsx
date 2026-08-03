import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Hero from "@/components/home/Hero";
import FlashSaleSection from "@/components/home/FlashSaleSection";
import CategoryCards from "@/components/home/CategoryCards";
import FeatureIconsRow from "@/components/home/FeatureIconsRow";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import WhyChooseUsCards from "@/components/home/WhyChooseUsCards";
import ReviewStatsCard from "@/components/home/ReviewStatsCard";
import Reveal from "@/components/ui/Reveal";
import { SITE_URL, SOCIAL_PROFILES, DEFAULT_OG_IMAGE, getBrandFullTitle } from "@/lib/tokens";
import { jsonLdString } from "@/lib/metadata";

const ServicesOverview = dynamic(() => import("@/components/home/ServicesOverview"), { loading: () => <SectionSkeleton /> });
const CustomerReviews = dynamic(() => import("@/components/home/CustomerReviews"), { loading: () => <SectionSkeleton /> });
const FAQ = dynamic(() => import("@/components/home/FAQ"), { loading: () => <SectionSkeleton /> });
const LeadCapture = dynamic(() => import("@/components/home/LeadCapture"), { loading: () => <SectionSkeleton /> });
const ContactSection = dynamic(() => import("@/components/home/ContactSection"), { loading: () => <SectionSkeleton /> });
const Portfolio = dynamic(() => import("@/components/home/Portfolio"), { loading: () => <SectionSkeleton /> });
const ClientLogos = dynamic(() => import("@/components/home/ClientLogos"), { loading: () => <SectionSkeleton /> });
const ContactCTABar = dynamic(() => import("@/components/home/ContactCTABar"), { loading: () => <SectionSkeleton /> });

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
  return <div className="py-16 motion-safe:animate-pulse bg-gray-50/50 dark:bg-[var(--surface-secondary)]/60" aria-hidden />;
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

      {/* Hero Section */}
      <Hero />

      {/* Category Cards */}
      <CategoryCards />

      {/* Feature Icons Row */}
      <FeatureIconsRow />

      {/* Flash Sale Section */}
      <FlashSaleSection />

      {/* Featured Products Section */}
      <FeaturedProducts />

      {/* Services Section */}
      <div id="services" className="scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
        <Reveal><ServicesOverview /></Reveal>
      </div>

      {/* Software/Projects Section */}
      <div id="software" className="scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
        <Reveal><Portfolio /></Reveal>
      </div>

      {/* Brand Partners Section */}
      <div id="brands" className="scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
        <Reveal><ClientLogos /></Reveal>
      </div>

      {/* Why Choose Us Section */}
      <div id="why-choose-us" className="scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
        <Reveal><WhyChooseUsCards /></Reveal>
      </div>

      {/* Contact CTA Bar */}
      <Reveal><ContactCTABar /></Reveal>

      {/* Customer Reviews Section */}
      <div id="reviews" className="scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
        <Reveal>
          <CustomerReviews />
          <section className="py-12 lg:py-16">
            <div className="container mx-auto px-4">
              <ReviewStatsCard />
            </div>
          </section>
        </Reveal>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
        <Reveal><FAQ /></Reveal>
      </div>

      {/* AI Consultation Section */}
      <div id="consultation" className="scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
        <Reveal><LeadCapture /></Reveal>
      </div>

      {/* Contact Section */}
      <div id="contact" className="scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
        <Reveal><ContactSection /></Reveal>
      </div>
    </>
  );
}
