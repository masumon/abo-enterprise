"use client";

import Link from "next/link";
import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";
import { useLegalPageOverride } from "@/hooks/useLegalPageOverride";
import { BulletList, ComplianceOfficerBlock } from "@/components/legal/LegalShared";

const LAST_UPDATED = "2026-10-08";

/**
 * Privacy policy and terms for the Apon mobile app. The default text below is based only on
 * what the app itself states (everything stays on the phone; nothing is sent unless the user
 * shares it). An admin can replace the whole page from Admin → Legal pages → Apon.
 */
export default function AponPrivacyPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const pageTitle = isBn ? "আপন অ্যাপ — গোপনীয়তা নীতি ও শর্তাবলী" : "Apon app — Privacy Policy & Terms";
  const override = useLegalPageOverride("apon", pageTitle, isBn);

  const p = (en: string, bn: string) => <p>{isBn ? bn : en}</p>;
  const list = (en: string[], bn: string[]) => <BulletList items={isBn ? bn : en} />;

  const sections: LegalSection[] = [
    {
      id: "about",
      title: isBn ? "এই নীতি সম্পর্কে" : "About this policy",
      content: p(
        "This policy explains how the Apon (আপন) Android app treats your information, and the terms for using it. Apon is published by ABO Enterprise (Sylhet, Bangladesh). The separate website privacy policy covers this website.",
        "এই নীতিতে বলা হয়েছে আপন (Apon) Android অ্যাপ আপনার তথ্য কীভাবে সামলায় এবং এটি ব্যবহারের শর্ত কী। অ্যাপটি ABO Enterprise (সিলেট, বাংলাদেশ) প্রকাশ করেছে। ওয়েবসাইটের জন্য আলাদা গোপনীয়তা নীতি আছে।",
      ),
    },
    {
      id: "on-device",
      title: isBn ? "আপনার তথ্য আপনার ফোনেই থাকে" : "Your data stays on your phone",
      content: (
        <div className="space-y-3">
          {p(
            "Your tasks, memories, money entries, health records (medicines, doctors, tests, prescriptions, body readings), photos and reminders are stored on your phone. The app does not send them to any server on its own, and it works without internet.",
            "আপনার কাজ, স্মৃতি, টাকার হিসাব, স্বাস্থ্যের তথ্য (ওষুধ, ডাক্তার, টেস্ট, প্রেসক্রিপশন, শরীরের মাপ), ছবি ও রিমাইন্ডার আপনার ফোনেই সংরক্ষিত থাকে। অ্যাপ এগুলো নিজে থেকে কোনো সার্ভারে পাঠায় না এবং ইন্টারনেট ছাড়াই চলে।",
          )}
          {p(
            "Health and money details are sensitive. Only you decide whether anything leaves the phone.",
            "স্বাস্থ্য ও টাকার তথ্য সংবেদনশীল। এগুলো ফোনের বাইরে যাবে কি না, সেই সিদ্ধান্ত শুধু আপনার।",
          )}
        </div>
      ),
    },
    {
      id: "leaves-device",
      title: isBn ? "কখন তথ্য ফোনের বাইরে যেতে পারে" : "When data can leave the phone",
      content: list(
        [
          "When you create a backup file and share or copy it somewhere yourself (that file may include your attachments).",
          "When you use the phone's share option on an entry.",
          "Android's own device backup: if it is switched on in your phone settings, Android itself may save app data to your Google account. This is controlled by your phone settings, not by Apon.",
        ],
        [
          "আপনি নিজে ব্যাকআপ ফাইল বানিয়ে কোথাও শেয়ার বা কপি করলে (ফাইলে আপনার সংযুক্ত ফাইলও থাকতে পারে)।",
          "কোনো এন্ট্রিতে ফোনের শেয়ার সুবিধা ব্যবহার করলে।",
          "Android এর নিজস্ব ডিভাইস ব্যাকআপ: ফোনের সেটিংসে চালু থাকলে Android নিজেই অ্যাপের ডেটা আপনার Google অ্যাকাউন্টে রাখতে পারে। এটি আপনার ফোনের সেটিং দ্বারা নিয়ন্ত্রিত, আপন দ্বারা নয়।",
        ],
      ),
    },
    {
      id: "permissions",
      title: isBn ? "অনুমতি" : "Permissions",
      content: p(
        "The app asks for permissions only when you use the related feature (camera, microphone, contacts, photos, location, notifications, exact alarms, biometrics). Most are optional; if you decline, the rest of the app works. The reason for each is listed on the Apon download page.",
        "সংশ্লিষ্ট সুবিধা ব্যবহারের সময়ই অ্যাপ অনুমতি চায় (ক্যামেরা, মাইক্রোফোন, কন্ট্যাক্ট, ছবি, লোকেশন, নোটিফিকেশন, নির্ভুল অ্যালার্ম, বায়োমেট্রিক)। বেশিরভাগই ঐচ্ছিক; না দিলে বাকি অ্যাপ চলে। প্রতিটির কারণ আপন ডাউনলোড পেজে দেওয়া আছে।",
      ),
    },
    {
      id: "your-control",
      title: isBn ? "আপনার নিয়ন্ত্রণ" : "Your control",
      content: list(
        [
          "Delete your data at any time by clearing the app's data in phone settings or uninstalling the app.",
          "Use the in-app backup to keep a copy; keep that file somewhere safe because it contains your records.",
          "Protect your phone with a screen lock and use the app lock (fingerprint) if available.",
        ],
        [
          "ফোনের সেটিংসে অ্যাপের ডেটা মুছে বা অ্যাপ আনইনস্টল করে যেকোনো সময় আপনার তথ্য মুছে ফেলতে পারেন।",
          "কপি রাখতে অ্যাপের ব্যাকআপ ব্যবহার করুন; ফাইলটিতে আপনার সব হিসাব থাকে, তাই নিরাপদ জায়গায় রাখুন।",
          "ফোনে স্ক্রিন লক দিন এবং সুযোগ থাকলে অ্যাপ লক (ফিঙ্গারপ্রিন্ট) ব্যবহার করুন।",
        ],
      ),
    },
    {
      id: "download-logs",
      title: isBn ? "ডাউনলোডের সময় ওয়েবসাইট কী রাখে" : "What this website keeps when you download",
      content: p(
        "To count downloads and prevent abuse, the website records the time, the app version and your browser type, and a one-way scrambled form of your IP address (the address itself is not stored). This is used only for statistics and protection.",
        "ডাউনলোড গণনা ও অপব্যবহার ঠেকাতে ওয়েবসাইট সময়, অ্যাপের সংস্করণ ও আপনার ব্রাউজারের ধরন এবং আইপি ঠিকানার একটি একমুখী গোপন রূপ রাখে (আসল ঠিকানা রাখা হয় না)। এটি শুধু পরিসংখ্যান ও সুরক্ষার কাজে ব্যবহৃত হয়।",
      ),
    },
    {
      id: "not-advice",
      title: isBn ? "চিকিৎসা বা আর্থিক পরামর্শ নয়" : "Not medical or financial advice",
      content: p(
        "Apon helps you keep records and reminders. It does not give medical, legal or financial advice and cannot replace a doctor or an accountant. Check important medicine and health decisions with a qualified professional.",
        "আপন আপনাকে হিসাব ও রিমাইন্ডার রাখতে সাহায্য করে। এটি চিকিৎসা, আইনি বা আর্থিক পরামর্শ দেয় না এবং ডাক্তার বা হিসাবরক্ষকের বিকল্প নয়। ওষুধ ও স্বাস্থ্য সংক্রান্ত গুরুত্বপূর্ণ সিদ্ধান্ত যোগ্য পেশাদারের সাথে যাচাই করুন।",
      ),
    },
    {
      id: "terms",
      title: isBn ? "ব্যবহারের শর্ত" : "Terms of use",
      content: list(
        [
          "Apon is free for personal use. You may not copy, resell, or claim it as your own, or remove its credits.",
          "It is provided “as is”. We work to keep it reliable, but we cannot promise it will be error-free; keep a backup of anything important.",
          "To the extent allowed by law, ABO Enterprise is not liable for loss caused by device loss, deleted data, or missed reminders (for example when the phone's battery saver blocks alarms).",
          "Children under 18 should use the app with a parent or guardian.",
          "We may update the app and these terms; the new date will appear on this page. These terms are governed by the laws of Bangladesh.",
        ],
        [
          "আপন ব্যক্তিগত ব্যবহারের জন্য বিনামূল্যে। কপি, পুনঃবিক্রয়, নিজের নামে দাবি বা ক্রেডিট মুছে ফেলা যাবে না।",
          "অ্যাপটি “যেমন আছে” তেমন দেওয়া হয়। এটি নির্ভরযোগ্য রাখতে আমরা চেষ্টা করি, তবে ত্রুটিমুক্ত থাকার নিশ্চয়তা দিতে পারি না; গুরুত্বপূর্ণ তথ্যের ব্যাকআপ রাখুন।",
          "আইনে অনুমোদিত সীমায়, ফোন হারানো, ডেটা মুছে যাওয়া বা রিমাইন্ডার মিস হওয়ার (যেমন ফোনের ব্যাটারি সেভার অ্যালার্ম আটকালে) ক্ষতির দায় ABO Enterprise বহন করে না।",
          "১৮ বছরের কম বয়সীরা অভিভাবকের সাথে অ্যাপ ব্যবহার করবেন।",
          "আমরা অ্যাপ ও এই শর্ত হালনাগাদ করতে পারি; নতুন তারিখ এই পেজে দেখা যাবে। এই শর্ত বাংলাদেশের আইন দ্বারা পরিচালিত।",
        ],
      ),
    },
    {
      id: "contact",
      title: isBn ? "যোগাযোগ ও অভিযোগ" : "Contact & complaints",
      content: (
        <div className="space-y-3">
          <ComplianceOfficerBlock />
          <p className="text-sm">
            <Link href="/legal/privacy" className="underline underline-offset-2">{isBn ? "ওয়েবসাইটের গোপনীয়তা নীতি" : "Website privacy policy"}</Link>
            {" · "}
            <Link href="/apon" className="underline underline-offset-2">{isBn ? "আপন ডাউনলোড পেজ" : "Apon download page"}</Link>
          </p>
        </div>
      ),
    },
  ];

  return (
    <main>
      <PageHero variant="light" title={pageTitle} breadcrumbs={[{ label: isBn ? "আপন" : "Apon", href: "/apon" }, { label: isBn ? "গোপনীয়তা" : "Privacy" }]} />
      <LegalPageLayout title={pageTitle} sections={override ?? sections} showTitle={false} lastUpdated={LAST_UPDATED} />
    </main>
  );
}
