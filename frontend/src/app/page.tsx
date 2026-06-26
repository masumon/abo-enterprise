import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import EntryPoints from "@/components/home/EntryPoints";
import QuickCategories from "@/components/home/QuickCategories";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import ServicesOverview from "@/components/home/ServicesOverview";
import SoftwareSolutions from "@/components/home/SoftwareSolutions";
import Industries from "@/components/home/Industries";
import Portfolio from "@/components/home/Portfolio";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import CustomerReviews from "@/components/home/CustomerReviews";
import Stats from "@/components/home/Stats";
import FAQ from "@/components/home/FAQ";
import LeadCapture from "@/components/home/LeadCapture";
import ContactSection from "@/components/home/ContactSection";

export const metadata: Metadata = {
  title: "ABO Enterprise — বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম",
  description:
    "মোবাইল এক্সেসরিজ, গ্যাজেট, প্রিন্টিং, আইনি সেবা, AI সমাধান এবং কাস্টম সফটওয়্যার — একটি প্ল্যাটফর্মে।",
};

export default function HomePage() {
  return (
    <>
      {/* 1. Hero — Left-right split, 3 CTAs */}
      <Hero />

      {/* 2. 3 Entry Points — Shop | Book | Business Solutions */}
      <EntryPoints />

      {/* 3. Quick Categories — 8 icon shortcuts */}
      <QuickCategories />

      {/* 4. Featured Products — Amazon-style cards */}
      <FeaturedProducts />

      {/* 5. Services Overview */}
      <ServicesOverview />

      {/* 6. Software Solutions Grid */}
      <SoftwareSolutions />

      {/* 7. Industries We Serve */}
      <Industries />

      {/* 8. Portfolio / Case Studies */}
      <Portfolio />

      {/* 9. Why Choose Us */}
      <WhyChooseUs />

      {/* 10. Customer Reviews */}
      <CustomerReviews />

      {/* 11. Stats */}
      <Stats />

      {/* 12. FAQ */}
      <FAQ />

      {/* 13. Lead Capture CTA */}
      <LeadCapture />

      {/* 14. Contact */}
      <ContactSection />
    </>
  );
}
