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
};

export default function HomePage() {
  return (
    <>
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
