import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import ServicesOverview from "@/components/home/ServicesOverview";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import SoftwareSolutions from "@/components/home/SoftwareSolutions";
import Industries from "@/components/home/Industries";
import Portfolio from "@/components/home/Portfolio";
import CustomerReviews from "@/components/home/CustomerReviews";
import FAQ from "@/components/home/FAQ";
import LeadCapture from "@/components/home/LeadCapture";
import ContactSection from "@/components/home/ContactSection";

export const metadata: Metadata = {
  title: "ABO Enterprise — বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম",
  description:
    "মোবাইল এক্সেসরিজ, গ্যাজেট, প্রিন্টিং, আইনি সেবা, AI সমাধান এবং কাস্টম সফটওয়্যার — একটি প্ল্যাটফর্মে।",
  alternates: { canonical: "https://aboenterprise.vercel.app" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ABO Enterprise",
  url: "https://aboenterprise.vercel.app",
  logo: "https://aboenterprise.vercel.app/icons/icon-512.png",
  description:
    "Bangladesh's complete technology ecosystem — mobile accessories, printing, legal assistance, software development, AI solutions.",
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
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ABO Enterprise",
  url: "https://aboenterprise.vercel.app",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://aboenterprise.vercel.app/products?search={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

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
      <WhyChooseUs />
      <SoftwareSolutions />
      <Industries />
      <Portfolio />
      <CustomerReviews />
      <FAQ />
      <LeadCapture />
      <ContactSection />
    </>
  );
}
