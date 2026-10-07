"use client";

import Link from "next/link";
import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";
import { useLegalPageOverride } from "@/hooks/useLegalPageOverride";
import { BulletList, ComplianceOfficerBlock } from "@/components/legal/LegalShared";

const LAST_UPDATED = "2026-10-07";

export default function PrivacyPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const pageTitle = isBn ? "গোপনীয়তা নীতি" : "Privacy Policy";
  const overrideSections = useLegalPageOverride("privacy", pageTitle, isBn);

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
      id: "legal-basis",
      title: isBn ? "আইনি ভিত্তি ও প্রযোজ্য আইন" : "Legal Basis & Applicable Laws",
      content: (
        <div className="space-y-3">
          <p>
            {isBn
              ? "আমরা বাংলাদেশের প্রচলিত আইন অনুসারে ব্যক্তিগত তথ্য প্রক্রিয়াজাত করি — ব্যক্তিগত উপাত্ত সুরক্ষা অধ্যাদেশ, ২০২৫ (এর বিধানগুলো কার্যকর হওয়া সাপেক্ষে), সাইবার সিকিউরিটি অধ্যাদেশ, ২০২৫, ভোক্তা-অধিকার সংরক্ষণ আইন, ২০০৯ এবং ডিজিটাল কমার্স পরিচালনা নির্দেশিকা, ২০২১। বাংলাদেশের বাইরের দর্শকদের জন্য আমরা স্বচ্ছতা, উদ্দেশ্য-সীমাবদ্ধতা ও ন্যূনতম তথ্য সংগ্রহের মতো স্বীকৃত আন্তর্জাতিক নীতিও (GDPR-ধারার) অনুসরণ করি।"
              : "We process personal data in line with the laws of Bangladesh — the Personal Data Protection Ordinance, 2025 (as its provisions come into force), the Cyber Security Ordinance, 2025, the Consumer Rights Protection Act, 2009 and the Digital Commerce Operation Guidelines, 2021. For visitors outside Bangladesh we also follow widely accepted international principles (GDPR-style transparency, purpose limitation and data minimisation)."}
          </p>
          <p className="font-medium">{isBn ? "আমরা কেবল এই ক্ষেত্রগুলোতে তথ্য প্রক্রিয়াজাত করি:" : "We process data only where:"}</p>
          <BulletList
            items={
              isBn
                ? [
                    "আপনি স্পষ্ট সম্মতি দিয়েছেন (যেমন কুকি, প্রচারণামূলক বার্তা)।",
                    "অর্ডার, বুকিং বা সেবা চুক্তি পূরণের জন্য প্রয়োজন।",
                    "আইনি বাধ্যবাধকতা পালনে প্রয়োজন (যেমন হিসাব ও কর সংক্রান্ত রেকর্ড)।",
                    "প্রতারণা প্রতিরোধ ও সাইটের নিরাপত্তা রক্ষার বৈধ স্বার্থে প্রয়োজন।",
                  ]
                : [
                    "you have given clear consent (for example cookies or promotional messages);",
                    "it is needed to perform an order, booking or service contract;",
                    "we must comply with a legal obligation (such as accounting and tax records); or",
                    "it is necessary for our legitimate interest in preventing fraud and keeping the site secure.",
                  ]
            }
          />
        </div>
      ),
    },
    {
      id: "rights-process",
      title: isBn ? "আপনার অধিকার ও প্রয়োগের পদ্ধতি" : "Your Rights & How to Exercise Them",
      content: (
        <div className="space-y-3">
          <BulletList
            items={
              isBn
                ? [
                    "দেখা: আমরা আপনার সম্পর্কে কোন তথ্য রাখি তার একটি কপি চাইতে পারেন।",
                    "সংশোধন: ভুল বা অসম্পূর্ণ তথ্য ঠিক করাতে পারেন।",
                    "মুছে ফেলা: আইনত সংরক্ষণ বাধ্যতামূলক নয় এমন তথ্য মুছে ফেলার অনুরোধ করতে পারেন।",
                    "সীমিতকরণ ও আপত্তি: স্বয়ংক্রিয় সিদ্ধান্ত, প্রোফাইলিং বা প্রচারণামূলক ব্যবহারে আপত্তি জানাতে পারেন।",
                    "সম্মতি প্রত্যাহার: যেকোনো সময় কুকি সম্মতি (কুকি নীতি পেজের বাটন) বা প্রচারণামূলক বার্তার সম্মতি প্রত্যাহার করতে পারেন।",
                  ]
                : [
                    "Access: ask for a copy of the personal data we hold about you.",
                    "Correction: have inaccurate or incomplete data fixed.",
                    "Deletion: ask us to delete data we are not legally required to keep.",
                    "Restriction & objection: object to automated decisions, profiling or promotional use.",
                    "Withdrawing consent: withdraw cookie consent (button on the Cookie Policy page) or promotional-message consent at any time.",
                  ]
            }
          />
          <p>
            {isBn
              ? "অনুরোধ করতে নিচের অভিযোগ ও কমপ্লায়েন্স ডেস্কে আপনার নাম, ফোন নম্বর ও (প্রযোজ্য হলে) অর্ডার নম্বরসহ জানান। পরিচয় যাচাইয়ের পর আমরা ৭২ ঘণ্টার মধ্যে প্রাপ্তি নিশ্চিত করি এবং সাধারণত ৩০ দিনের মধ্যে অনুরোধ নিষ্পত্তি করি। হিসাব, কর বা আইনি দাবির জন্য যে রেকর্ড রাখা বাধ্যতামূলক, তা মুছে ফেলা যাবে না — তবে আমরা কারণ ব্যাখ্যা করব।"
              : "To make a request, contact the Complaints & Compliance Desk below with your name, phone number and (if relevant) order number. After verifying your identity we acknowledge within 72 hours and normally complete the request within 30 days. Records we must keep for accounting, tax or legal claims cannot be erased — we will explain why."}
          </p>
        </div>
      ),
    },
    {
      id: "transfers",
      title: isBn ? "হোস্টিং ও আন্তর্জাতিক স্থানান্তর" : "Hosting & International Transfers",
      content: (
        <p>
          {isBn
            ? "আমাদের ওয়েবসাইট, ডেটাবেস, ছবি সংরক্ষণ, ইমেইল ও পেমেন্ট সেবা নির্ভরযোগ্য ক্লাউড সেবাদাতাদের মাধ্যমে পরিচালিত হয়, যাদের সার্ভার বাংলাদেশের বাইরে থাকতে পারে। আমরা এমন সেবাদাতা বেছে নিই যাদের নিরাপত্তা ব্যবস্থা রয়েছে এবং কেবল প্রয়োজনীয় তথ্যই শেয়ার করি। আমরা আপনার তথ্য বিক্রি করি না।"
            : "Our website, database, image storage, email and payment services run on reputable cloud providers whose servers may be outside Bangladesh. We choose providers with security safeguards and share only what is necessary. We never sell your personal data."}
        </p>
      ),
    },
    {
      id: "marketing",
      title: isBn ? "প্রচারণামূলক বার্তা" : "Marketing Messages",
      content: (
        <p>
          {isBn
            ? "অর্ডার, বুকিং ও ডেলিভারি সংক্রান্ত বার্তা (এসএমএস, ইমেইল, হোয়াটসঅ্যাপ) সেবার অংশ হিসেবে পাঠানো হয়। অফার ও নিউজলেটার আমরা শুধু আপনার সম্মতি থাকলে পাঠাই এবং প্রতিটি বার্তায় বা আমাদের সাথে যোগাযোগ করে যেকোনো সময় বন্ধ করতে পারবেন।"
            : "Order, booking and delivery messages (SMS, email, WhatsApp) are sent as part of the service. Offers and newsletters are sent only with your consent, and you can opt out at any time from the message itself or by contacting us."}
        </p>
      ),
    },
    {
      id: "breach",
      title: isBn ? "তথ্য নিরাপত্তা লঙ্ঘন" : "Data Breaches",
      content: (
        <p>
          {isBn
            ? "আপনার ক্ষতির আশঙ্কা তৈরি করে এমন কোনো তথ্য-লঙ্ঘন ঘটলে আমরা অযথা বিলম্ব না করে ক্ষতিগ্রস্তদের এবং আইনানুযায়ী কর্তৃপক্ষকে জানাব এবং আপনার করণীয় ব্যাখ্যা করব। শিশুদের (১৮ বছরের কম) তথ্য আমরা অভিভাবকের সম্মতি ছাড়া জেনেশুনে সংগ্রহ করি না এবং কখনোই প্রোফাইলিং বা টার্গেটেড বিজ্ঞাপনে ব্যবহার করি না।"
            : "If a breach is likely to harm you, we will notify affected users and, where the law requires, the authorities without undue delay, and explain what you can do. We do not knowingly collect data from children under 18 without a parent or guardian's consent and never use it for profiling or targeted advertising."}
        </p>
      ),
    },
    {
      id: "contact",
      title: isBn ? "অভিযোগ ও যোগাযোগ" : "Complaints & Contact",
      content: <ComplianceOfficerBlock />,
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
