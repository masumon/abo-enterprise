"use client";

import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";

export default function PrivacyPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";

  const sections: LegalSection[] = [
    {
      id: "introduction",
      title: isBn ? "ভূমিকা" : "Introduction",
      content: <p>{isBn ? "ABO Enterprise আপনার ব্যক্তিগত তথ্য সুরক্ষিত রাখতে প্রতিশ্রুতিবদ্ধ।" : "ABO Enterprise is committed to protecting your personal information."}</p>,
    },
    {
      id: "collection",
      title: isBn ? "তথ্য সংগ্রহ" : "Data Collection",
      content: <p>{isBn ? "আমরা নাম, ফোন, ইমেইল ও অর্ডার তথ্য সংগ্রহ করি শুধুমাত্র সেবা প্রদানের জন্য।" : "We collect name, phone, email and order data solely to provide our services."}</p>,
    },
    {
      id: "sharing",
      title: isBn ? "তথ্য শেয়ার" : "Data Sharing",
      content: <p>{isBn ? "আপনার তথ্য তৃতীয় পক্ষের সাথে বিক্রি করা হয় না।" : "Your data is never sold to third parties."}</p>,
    },
    {
      id: "cookies",
      title: isBn ? "কুকি" : "Cookies",
      content: <p>{isBn ? "আমরা আপনার অভিজ্ঞতা উন্নত করতে কুকি ব্যবহার করি। ব্রাউজার সেটিংস থেকে কুকি নিয়ন্ত্রণ করতে পারবেন।" : "We use cookies to improve your experience. You can control cookies via browser settings."}</p>,
    },
    {
      id: "contact",
      title: isBn ? "যোগাযোগ" : "Contact",
      content: <p>abo.enterprise@gmail.com | +880 1825 007977</p>,
    },
  ];

  return (
    <main>
      <PageHero
        title={isBn ? "গোপনীয়তা নীতি" : "Privacy Policy"}
        breadcrumbs={[{ label: isBn ? "গোপনীয়তা" : "Privacy" }]}
        variant="light"
      />
      <LegalPageLayout title={isBn ? "গোপনীয়তা নীতি" : "Privacy Policy"} sections={sections} showTitle={false} />
    </main>
  );
}
