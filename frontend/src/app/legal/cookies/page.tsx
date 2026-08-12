"use client";

import Link from "next/link";
import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { useLegalPageOverride } from "@/hooks/useLegalPageOverride";

const LAST_UPDATED = "2026-07-25";

export default function CookiesPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const pageTitle = isBn ? "কুকি নীতি" : "Cookies Policy";
  const overrideSections = useLegalPageOverride("cookies", pageTitle, isBn);
  const { settings } = usePublicSettings(["contact_email", "contact_phone"]);
  const email = getSettingValue(settings, "contact_email", "info@aboenterprise.com");
  const phone = getSettingValue(settings, "contact_phone", "+880 1825 007977");

  const sections: LegalSection[] = [
    {
      id: "what",
      title: isBn ? "কুকি কী" : "What Are Cookies",
      content: (
        <p>
          {isBn
            ? "কুকি হলো ছোট টেক্সট ফাইল যা আপনি যখন আমাদের ওয়েবসাইট ব্যবহার করেন তখন আপনার ডিভাইসে সংরক্ষিত হয়। এগুলো সাইটকে আপনার পছন্দ (ভাষা, থিম, কার্ট, লগইন) মনে রাখতে এবং অভিজ্ঞতা উন্নত করতে সাহায্য করে। অনুরূপ প্রযুক্তির মধ্যে লোকাল স্টোরেজ ও পিক্সেলও অন্তর্ভুক্ত।"
            : "Cookies are small text files stored on your device when you use our website. They help the site remember your preferences (language, theme, cart, login) and improve your experience. Similar technologies include local storage and pixels."}
        </p>
      ),
    },
    {
      id: "types",
      title: isBn ? "আমরা কোন ধরনের কুকি ব্যবহার করি" : "Types of Cookies We Use",
      content: (
        <ul className="list-disc list-inside space-y-2">
          <li>
            <b>{isBn ? "অপরিহার্য কুকি: " : "Essential cookies: "}</b>
            {isBn
              ? "লগইন, শপিং কার্ট, নিরাপত্তা ও মৌলিক কার্যকারিতার জন্য প্রয়োজনীয়। এগুলো বন্ধ করা যায় না।"
              : "Required for login, shopping cart, security and core functionality. These cannot be turned off."}
          </li>
          <li>
            <b>{isBn ? "পছন্দ কুকি: " : "Preference cookies: "}</b>
            {isBn
              ? "আপনার ভাষা (বাংলা/English) ও লাইট/ডার্ক থিমের পছন্দ মনে রাখে।"
              : "Remember your language (Bengali/English) and light/dark theme choices."}
          </li>
          <li>
            <b>{isBn ? "বিশ্লেষণ কুকি: " : "Analytics cookies: "}</b>
            {isBn
              ? "সাইটের ব্যবহার বেনামে বুঝে সেবা উন্নত করতে সাহায্য করে।"
              : "Help us understand site usage anonymously to improve our services."}
          </li>
          <li>
            <b>{isBn ? "তৃতীয় পক্ষের কুকি: " : "Third-party cookies: "}</b>
            {isBn
              ? "পেমেন্ট গেটওয়ে ও মিডিয়া হোস্টিংয়ের মতো বিশ্বস্ত সেবা দ্বারা সেট হতে পারে।"
              : "May be set by trusted services such as payment gateways and media hosting."}
          </li>
        </ul>
      ),
    },
    {
      id: "why",
      title: isBn ? "কেন আমরা কুকি ব্যবহার করি" : "Why We Use Cookies",
      content: (
        <p>
          {isBn
            ? "কুকি আমাদের সাহায্য করে আপনাকে লগইন রাখতে, কার্টে পণ্য সংরক্ষণ করতে, পছন্দ মনে রাখতে, প্রতারণা প্রতিরোধ করতে এবং ওয়েবসাইটের পারফরম্যান্স উন্নত করতে।"
            : "Cookies help us keep you logged in, retain items in your cart, remember your preferences, prevent fraud and improve website performance."}
        </p>
      ),
    },
    {
      id: "control",
      title: isBn ? "কুকি নিয়ন্ত্রণ ও অপসারণ" : "Managing & Removing Cookies",
      content: (
        <p>
          {isBn
            ? "আপনি যেকোনো সময় আপনার ব্রাউজার সেটিংস থেকে কুকি দেখতে, মুছতে বা ব্লক করতে পারেন। মনে রাখবেন, অপরিহার্য কুকি ব্লক করলে সাইটের কিছু অংশ (যেমন কার্ট বা লগইন) সঠিকভাবে কাজ নাও করতে পারে।"
            : "You can view, delete or block cookies at any time from your browser settings. Note that blocking essential cookies may cause some parts of the site (such as cart or login) to stop working properly."}
        </p>
      ),
    },
    {
      id: "consent",
      title: isBn ? "সম্মতি ও পরিবর্তন" : "Consent & Changes",
      content: (
        <p>
          {isBn
            ? "আমাদের সাইট ব্যবহার অব্যাহত রেখে আপনি এই নীতি অনুযায়ী কুকি ব্যবহারে সম্মতি দিচ্ছেন। প্রয়োজনে আমরা এই নীতি হালনাগাদ করতে পারি; পরিবর্তন এই পেজে প্রকাশ করা হবে। আরও তথ্যের জন্য দেখুন আমাদের "
            : "By continuing to use our site, you consent to the use of cookies as described in this policy. We may update this policy when needed; changes will be posted on this page. For more information see our "}
          <Link href="/legal/privacy" className="text-brand-600 underline">{isBn ? "গোপনীয়তা নীতি" : "Privacy Policy"}</Link>।
        </p>
      ),
    },
    {
      id: "contact",
      title: isBn ? "যোগাযোগ" : "Contact",
      content: (
        <p>
          {isBn ? "কুকি সংক্রান্ত প্রশ্নে: " : "For cookie-related questions: "}
          <b>{email}</b> · <b>{phone}</b>।
        </p>
      ),
    },
  ];

  return (
    <main>
      <PageHero
        pageKey="cookies"
        variant="light"
        title={pageTitle}
        breadcrumbs={[{ label: isBn ? "কুকি" : "Cookies" }]}
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
