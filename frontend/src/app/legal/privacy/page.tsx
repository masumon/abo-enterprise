"use client";

import Link from "next/link";
import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { useLegalPageOverride } from "@/hooks/useLegalPageOverride";

const LAST_UPDATED = "2026-07-25";

export default function PrivacyPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const pageTitle = isBn ? "গোপনীয়তা নীতি" : "Privacy Policy";
  const overrideSections = useLegalPageOverride("privacy", pageTitle, isBn);
  const { settings } = usePublicSettings(["contact_email", "contact_phone", "contact_address"]);
  const email = getSettingValue(settings, "contact_email", "info@aboenterprise.com");
  const phone = getSettingValue(settings, "contact_phone", "+880 1825 007977");
  const address = getSettingValue(settings, "contact_address", isBn ? "সিলেট, বাংলাদেশ" : "Sylhet, Bangladesh");

  const sections: LegalSection[] = [
    {
      id: "introduction",
      title: isBn ? "ভূমিকা" : "Introduction",
      content: (
        <p>
          {isBn
            ? "ABO Enterprise (বাংলাদেশ থেকে পরিচালিত) আপনার ব্যক্তিগত তথ্যের গোপনীয়তা রক্ষায় প্রতিশ্রুতিবদ্ধ। এই নীতি ব্যাখ্যা করে আমরা কী তথ্য সংগ্রহ করি, কীভাবে ব্যবহার ও সুরক্ষিত রাখি এবং এ বিষয়ে আপনার অধিকার কী। এটি প্রযোজ্য আইন ও আন্তর্জাতিক ডেটা-সুরক্ষা নীতিমালার (যেমন GDPR-এর মূলনীতি) সঙ্গে সামঞ্জস্যপূর্ণ।"
            : "ABO Enterprise (operating from Bangladesh) is committed to protecting the privacy of your personal information. This policy explains what data we collect, how we use and safeguard it, and your rights. It aligns with applicable law and international data-protection principles (such as those of the GDPR)."}
        </p>
      ),
    },
    {
      id: "collection",
      title: isBn ? "আমরা কী তথ্য সংগ্রহ করি" : "Information We Collect",
      content: (
        <ul className="list-disc list-inside space-y-1.5">
          <li>{isBn ? "পরিচয় ও যোগাযোগ: নাম, ফোন, ইমেইল, ডেলিভারি ঠিকানা।" : "Identity & contact: name, phone, email, delivery address."}</li>
          <li>{isBn ? "অর্ডার তথ্য: পণ্য, পরিমাণ, লেনদেনের রেকর্ড।" : "Order data: products, quantities, transaction records."}</li>
          <li>{isBn ? "পেমেন্ট তথ্য: গেটওয়ের মাধ্যমে নিরাপদে প্রক্রিয়াকৃত (সম্পূর্ণ কার্ড নম্বর আমরা সংরক্ষণ করি না)।" : "Payment data: processed securely via gateways (we do not store full card numbers)."}</li>
          <li>{isBn ? "কারিগরি তথ্য: ডিভাইস, ব্রাউজার, IP ও কুকির মাধ্যমে ব্যবহারের ধরন।" : "Technical data: device, browser, IP and usage patterns via cookies."}</li>
        </ul>
      ),
    },
    {
      id: "usage",
      title: isBn ? "তথ্য কীভাবে ব্যবহার করি" : "How We Use Your Information",
      content: (
        <p>
          {isBn
            ? "অর্ডার প্রক্রিয়াকরণ ও ডেলিভারি, গ্রাহক সহায়তা, অ্যাকাউন্ট ব্যবস্থাপনা, প্রতারণা প্রতিরোধ, আইনি বাধ্যবাধকতা পূরণ এবং (আপনার সম্মতি থাকলে) অফার ও আপডেট জানাতে আপনার তথ্য ব্যবহার করা হয়। আমরা কখনোই বিজ্ঞাপনদাতার কাছে আপনার তথ্য বিক্রি করি না।"
            : "We use your data to process orders and delivery, provide customer support, manage accounts, prevent fraud, meet legal obligations and — with your consent — send offers and updates. We never sell your data to advertisers."}
        </p>
      ),
    },
    {
      id: "sharing",
      title: isBn ? "তৃতীয় পক্ষের সাথে শেয়ারিং" : "Sharing with Third Parties",
      content: (
        <p>
          {isBn
            ? "নিরাপদ সেবা প্রদানের জন্য আমরা বিশ্বস্ত প্রোভাইডারদের সাথে শুধু প্রয়োজনীয় তথ্য শেয়ার করি: ছবি/ভিডিও হোস্টিং (Cloudinary), পেমেন্ট গেটওয়ে (bKash, Nagad, SSLCOMMERZ), এবং কুরিয়ার/লজিস্টিক পার্টনার। আইনি প্রয়োজনে উপযুক্ত কর্তৃপক্ষের কাছে তথ্য প্রকাশ করা হতে পারে।"
            : "To deliver services securely we share only necessary data with trusted providers: media hosting (Cloudinary), payment gateways (bKash, Nagad, SSLCOMMERZ) and courier/logistics partners. Data may be disclosed to competent authorities where legally required."}
        </p>
      ),
    },
    {
      id: "cookies",
      title: isBn ? "কুকি ও ট্র্যাকিং" : "Cookies & Tracking",
      content: (
        <p>
          {isBn ? "আমরা আপনার অভিজ্ঞতা উন্নত করতে কুকি ব্যবহার করি। বিস্তারিত জানতে দেখুন আমাদের " : "We use cookies to improve your experience. For details see our "}
          <Link href="/legal/cookies" className="text-brand-600 underline">{isBn ? "কুকি নীতি" : "Cookies Policy"}</Link>
          {isBn ? "। ব্রাউজার সেটিংস থেকে কুকি নিয়ন্ত্রণ করা যায়।" : ". You can manage cookies from your browser settings."}
        </p>
      ),
    },
    {
      id: "rights",
      title: isBn ? "আপনার অধিকার" : "Your Rights",
      content: (
        <p>
          {isBn
            ? "আপনি নিজের সংরক্ষিত তথ্য দেখতে, সংশোধন করতে, মুছে ফেলতে বা মার্কেটিং থেকে অব্যাহতি নিতে অনুরোধ করতে পারেন। অনুরোধ জানাতে ইমেইল করুন "
            : "You may request to access, correct, delete your stored data or opt out of marketing. To make a request, email "}
          <b>{email}</b>{isBn ? "; আমরা যুক্তিসঙ্গত সময়ের মধ্যে সাড়া দেব।" : "; we will respond within a reasonable time."}
        </p>
      ),
    },
    {
      id: "security",
      title: isBn ? "নিরাপত্তা ও সংরক্ষণকাল" : "Security & Retention",
      content: (
        <p>
          {isBn
            ? "আমরা এনক্রিপশনসহ যুক্তিসঙ্গত কারিগরি ও প্রশাসনিক ব্যবস্থায় আপনার তথ্য সুরক্ষিত রাখি এবং সেবা প্রদান ও আইনি/হিসাবরক্ষণ প্রয়োজন অনুযায়ী নির্দিষ্ট সময় পর্যন্ত সংরক্ষণ করি; এরপর নিরাপদে মুছে ফেলা হয়।"
            : "We protect your data with reasonable technical and administrative measures including encryption, and retain it only as long as needed to provide services and meet legal/accounting requirements, after which it is securely deleted."}
        </p>
      ),
    },
    {
      id: "children",
      title: isBn ? "শিশুদের গোপনীয়তা" : "Children's Privacy",
      content: (
        <p>
          {isBn
            ? "আমাদের সেবা প্রাপ্তবয়স্কদের জন্য। আমরা জেনেবুঝে ১৮ বছরের কম বয়সীদের তথ্য সংগ্রহ করি না।"
            : "Our services are intended for adults. We do not knowingly collect data from anyone under 18 years of age."}
        </p>
      ),
    },
    {
      id: "contact",
      title: isBn ? "যোগাযোগ" : "Contact",
      content: (
        <p>
          {isBn ? "গোপনীয়তা সংক্রান্ত যেকোনো প্রশ্নে: " : "For any privacy questions: "}
          <b>{email}</b> · <b>{phone}</b> · {address}।
        </p>
      ),
    },
  ];

  return (
    <main>
      <PageHero
        pageKey="privacy"
        variant="light"
        title={pageTitle}
        breadcrumbs={[{ label: isBn ? "গোপনীয়তা" : "Privacy" }]}
      />
      <LegalPageLayout
        title={pageTitle}
        sections={overrideSections ?? sections}
        showTitle={false}
        lastUpdated={LAST_UPDATED}
      />
    </main>
  );
}
