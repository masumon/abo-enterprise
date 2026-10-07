"use client";

import Link from "next/link";
import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { useLegalPageOverride } from "@/hooks/useLegalPageOverride";
import { ComplianceOfficerBlock, CookiePreferencesButton, CookieTable, type CookieRow } from "@/components/legal/LegalShared";

const LAST_UPDATED = "2026-10-07";


const COOKIE_ROWS: CookieRow[] = [
  { name: "abo-cookie-consent-v2", category: { en: "Consent record", bn: "সম্মতির রেকর্ড" }, purpose: { en: "Remembers the cookie choice you made.", bn: "আপনার কুকি পছন্দ মনে রাখে।" }, duration: { en: "Until you clear it", bn: "মুছে ফেলার আগ পর্যন্ত" }, provider: "ABO Enterprise", optional: false },
  { name: "abo-cart · abo-wishlist · abo-compare", category: { en: "Shopping", bn: "কেনাকাটা" }, purpose: { en: "Keeps your cart, wishlist and comparison list on this device.", bn: "আপনার কার্ট, উইশলিস্ট ও তুলনা তালিকা এই ডিভাইসে ধরে রাখে।" }, duration: { en: "Until you clear it", bn: "মুছে ফেলার আগ পর্যন্ত" }, provider: "ABO Enterprise", optional: false },
  { name: "abo-customer · abo-customer-profile", category: { en: "Account", bn: "অ্যাকাউন্ট" }, purpose: { en: "Keeps you signed in and remembers saved delivery details.", bn: "আপনাকে লগইন রাখে এবং সংরক্ষিত ডেলিভারি তথ্য মনে রাখে।" }, duration: { en: "Until you sign out", bn: "সাইন-আউট না করা পর্যন্ত" }, provider: "ABO Enterprise", optional: false },
  { name: "abo-lang · abo-theme", category: { en: "Preferences", bn: "পছন্দ" }, purpose: { en: "Remembers your language and light/dark mode.", bn: "আপনার ভাষা ও লাইট/ডার্ক মোড মনে রাখে।" }, duration: { en: "Until you clear it", bn: "মুছে ফেলার আগ পর্যন্ত" }, provider: "ABO Enterprise", optional: false },
  { name: "abo_assistant_session*", category: { en: "Chat assistant", bn: "চ্যাট সহকারী" }, purpose: { en: "Keeps your conversation with the site assistant together.", bn: "সাইট সহকারীর সাথে আপনার কথোপকথন ধরে রাখে।" }, duration: { en: "Browser session / until cleared", bn: "ব্রাউজার সেশন / মুছে ফেলা পর্যন্ত" }, provider: "ABO Enterprise", optional: false },
  { name: "__cf_bm (and similar)", category: { en: "Security", bn: "নিরাপত্তা" }, purpose: { en: "Bot and abuse protection by our security/CDN provider (may be set).", bn: "আমাদের নিরাপত্তা/CDN সেবাদাতার বট ও অপব্যবহার প্রতিরোধ (সেট হতে পারে)।" }, duration: { en: "Up to 30 minutes", bn: "সর্বোচ্চ ৩০ মিনিট" }, provider: "Cloudflare", optional: false },
  { name: "Payment gateway cookies", category: { en: "Payment", bn: "পেমেন্ট" }, purpose: { en: "Set by bKash, Nagad or SSLCommerz on their own pages to complete and secure your payment.", bn: "পেমেন্ট সম্পন্ন ও সুরক্ষিত করতে bKash, Nagad বা SSLCommerz নিজেদের পেজে সেট করে।" }, duration: { en: "Session", bn: "সেশন" }, provider: "bKash / Nagad / SSLCommerz", optional: false },
  { name: "_ga · _ga_*", category: { en: "Analytics", bn: "অ্যানালিটিক্স" }, purpose: { en: "Counts visits and page views so we can improve the site.", bn: "ভিজিট ও পেজ-ভিউ গণনা করে সাইট উন্নত করতে সাহায্য করে।" }, duration: { en: "Up to 2 years", bn: "সর্বোচ্চ ২ বছর" }, provider: "Google Analytics", optional: true },
  { name: "_fbp", category: { en: "Marketing", bn: "মার্কেটিং" }, purpose: { en: "Measures the effectiveness of our ads (only if the Meta Pixel is enabled).", bn: "আমাদের বিজ্ঞাপনের কার্যকারিতা মাপে (শুধু Meta Pixel চালু থাকলে)।" }, duration: { en: "Up to 90 days", bn: "সর্বোচ্চ ৯০ দিন" }, provider: "Meta (Facebook)", optional: true },
];

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
      id: "inventory",
      title: isBn ? "আমরা যেসব কুকি ও স্টোরেজ ব্যবহার করি" : "Cookies & Storage We Use",
      content: (
        <div className="space-y-3">
          <p>
            {isBn
              ? "অপরিহার্য কুকি সাইট চালাতে প্রয়োজন, তাই সম্মতি ছাড়াই ব্যবহৃত হয়। ঐচ্ছিক (অ্যানালিটিক্স ও মার্কেটিং) কুকি আপনার স্পষ্ট সম্মতির আগে চালু হয় না — সম্মতি না দিলে এগুলো লোডই হয় না।"
              : "Essential cookies are needed to run the site, so they are used without consent. Optional (analytics and marketing) cookies are never switched on before you agree — if you do not consent, they are not even loaded."}
          </p>
          <CookieTable rows={COOKIE_ROWS} />
          <p className="text-xs text-muted">
            {isBn
              ? "তালিকাটি আমাদের বর্তমান ব্যবস্থা অনুযায়ী; মেয়াদ প্রদানকারীর সেটিং অনুযায়ী বদলাতে পারে। মার্কেটিং কুকি কেবল তখনই ব্যবহৃত হয় যখন সাইটে একটি বিজ্ঞাপন-পিক্সেল সক্রিয় করা থাকে।"
              : "This list reflects our current setup; durations may vary with the provider's settings. Marketing cookies are used only when an advertising pixel has been enabled on the site."}
          </p>
        </div>
      ),
    },
    {
      id: "preferences",
      title: isBn ? "সম্মতি পরিবর্তন বা প্রত্যাহার" : "Change or Withdraw Consent",
      content: (
        <div className="space-y-3">
          <p>
            {isBn
              ? "সম্মতি দেওয়ার মতোই সহজে আপনি তা বদলাতে বা প্রত্যাহার করতে পারেন। নিচের বাটনে চাপলে কুকি পছন্দ-ফর্ম আবার খুলবে। প্রত্যাহারের আগে যা প্রক্রিয়াজাত হয়েছে তার বৈধতা এতে নষ্ট হয় না। ব্রাউজারের সেটিং থেকেও কুকি মুছে ফেলা বা ব্লক করা যায়।"
              : "You can change or withdraw consent as easily as you gave it. The button below re-opens the cookie preferences. Withdrawal does not affect processing that happened before it. You can also delete or block cookies in your browser settings."}
          </p>
          <CookiePreferencesButton />
        </div>
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
