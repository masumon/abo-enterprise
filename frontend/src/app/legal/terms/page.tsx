"use client";

import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";

export default function TermsPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";

  const sections: LegalSection[] = [
    {
      id: "agreement",
      title: isBn ? "চুক্তি" : "Agreement",
      content: <p>{isBn ? "ABO Enterprise ওয়েবসাইট ও সেবা ব্যবহার করে আপনি এই শর্তাবলী মেনে নিচ্ছেন।" : "By using ABO Enterprise website and services, you agree to these terms."}</p>,
    },
    {
      id: "orders",
      title: isBn ? "অর্ডার ও মূল্য" : "Orders & Pricing",
      content: <p>{isBn ? "পণ্যের মূল্য ও স্টক পরিবর্তন হতে পারে। অর্ডার নিশ্চিতকরণের পর আমরা যোগাযোগ করব।" : "Product prices and stock may change. We will contact you after order confirmation."}</p>,
    },
    {
      id: "software",
      title: isBn ? "সফটওয়্যার ও প্রজেক্ট" : "Software & Projects",
      content: <p>{isBn ? "সফটওয়্যার ও কাস্টম প্রজেক্টের জন্য আলাদা চুক্তি প্রযোজ্য।" : "Separate agreements apply for software and custom projects."}</p>,
    },
    {
      id: "liability",
      title: isBn ? "দায়বদ্ধতা" : "Liability",
      content: <p>{isBn ? "আমরা সেবা প্রদানের সর্বোচ্চ চেষ্টা করি, তবে অনাকাঙ্ক্ষিত বিলম্বের জন্য দায়ী নই।" : "We strive to deliver quality service but are not liable for unforeseen delays beyond our control."}</p>,
    },
  ];

  return (
    <main>
      <PageHero
        pageKey="terms"
        variant="light"
        title={isBn ? "সেবার শর্তাবলী" : "Terms of Service"}
        breadcrumbs={[{ label: isBn ? "শর্তাবলী" : "Terms" }]}
      />
      <LegalPageLayout title={isBn ? "সেবার শর্তাবলী" : "Terms of Service"} sections={sections} showTitle={false} />
    </main>
  );
}
