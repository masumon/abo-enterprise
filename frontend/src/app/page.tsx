import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import Hero from "@/components/home/Hero";
import FlashSaleSection from "@/components/home/FlashSaleSection";
import CategoryCards from "@/components/home/CategoryCards";
import FeatureIconsRow from "@/components/home/FeatureIconsRow";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import ComboSection from "@/components/home/ComboSection";
import WhyChooseUsCards from "@/components/home/WhyChooseUsCards";
import ReviewStatsCard from "@/components/home/ReviewStatsCard";
import Reveal from "@/components/ui/Reveal";
import { SITE_URL, DEFAULT_OG_IMAGE, getBrandFullTitle } from "@/lib/tokens";
import { jsonLdString } from "@/lib/metadata";
import { fetchPublicSettings, settingValue } from "@/lib/serverSettings";
import { isVideoUrl } from "@/lib/media";
import { getLegacyHomeLaneTarget } from "@/lib/legacyHomeLane";

/** contact_phone is stored as a local 01XXXXXXXXX number (admin-facing);
 * JSON-LD needs E.164. Invalid/unset runtime data is omitted rather than
 * replaced with a hard-coded business contact. */
function toE164Bd(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 11 && digits.startsWith("01")) return `+88${digits}`;
  if (digits.length === 13 && digits.startsWith("8801")) return `+${digits}`;
  return null;
}

function getSocialProfiles(settings: Record<string, string>): string[] {
  return [
    "facebook_url",
    "instagram_url",
    "linkedin_url",
    "youtube_url",
    "twitter_url",
    "tiktok_url",
  ]
    .map((key) => settingValue(settings, key))
    .filter(Boolean);
}

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

function buildOrganizationJsonLd(settings: Record<string, string>) {
  const phone = toE164Bd(settingValue(settings, "contact_phone"));
  const streetAddress = settingValue(settings, "contact_address");
  const logo = settingValue(settings, "logo_url", settingValue(settings, "default_og_image_url", DEFAULT_OG_IMAGE));
  const sameAs = getSocialProfiles(settings);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settingValue(settings, "site_name", "ABO Enterprise"),
    url: SITE_URL,
    logo,
    description: getBrandFullTitle("en"),
    ...(streetAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress,
            addressCountry: "BD",
          },
        }
      : {}),
    ...(phone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            telephone: phone,
            contactType: "customer service",
            availableLanguage: ["Bengali", "English"],
          },
        }
      : {}),
    sameAs,
  };
}

function buildLocalBusinessJsonLd(settings: Record<string, string>) {
  const phone = toE164Bd(settingValue(settings, "contact_phone"));
  const streetAddress = settingValue(settings, "contact_address");
  const openingHours = settingValue(settings, "contact_hours_en");
  const image = settingValue(settings, "default_og_image_url", settingValue(settings, "logo_url", DEFAULT_OG_IMAGE));

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: settingValue(settings, "site_name", "ABO Enterprise"),
    image,
    url: SITE_URL,
    ...(phone ? { telephone: phone } : {}),
    ...(streetAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress,
            addressCountry: "BD",
          },
        }
      : {}),
    ...(openingHours ? { openingHours } : {}),
  };
}

function buildWebsiteJsonLd(settings: Record<string, string>) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settingValue(settings, "site_name", "ABO Enterprise"),
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
}

function SectionSkeleton() {
  return <div className="py-16 motion-safe:animate-pulse bg-gray-50/50 dark:bg-[#1c2242]/60" aria-hidden />;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { lane?: string | string[] };
}) {
  const legacyLane = Array.isArray(searchParams?.lane) ? searchParams?.lane[0] : searchParams?.lane;
  const legacyTarget = getLegacyHomeLaneTarget(legacyLane);
  if (legacyTarget) redirect(legacyTarget);

  const settings = await fetchPublicSettings();
  // The hero banner is a CSS background inside a client component, so the
  // browser would only discover it after hydration. Preloading it here (server
  // already has the URL) lets the fetch start with the HTML — a pure hint, no
  // markup or layout change. Skip videos and the unset case.
  // Same key resolveHomeBannerImage() reads, but via the server-safe helper so
  // no client-only module is pulled into this Server Component.
  const heroBanner = settingValue(settings, "hero_image_url");
  const heroPreload = heroBanner && !isVideoUrl(heroBanner) ? heroBanner : null;
  return (
    <>
      {heroPreload && <link rel="preload" as="image" href={heroPreload} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(buildOrganizationJsonLd(settings)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(buildWebsiteJsonLd(settings)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(buildLocalBusinessJsonLd(settings)) }}
      />

      {/* Hero Section */}
      <Hero />

      {/* Category Cards */}
      <CategoryCards />

      {/* Feature Icons Row */}
      <FeatureIconsRow />

      {/* Flash Sale Section */}
      <FlashSaleSection />

      {/* Combo Packs — above Featured Products, two-up on mobile */}
      <ComboSection />

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
          <section className="py-5 lg:py-7">
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
