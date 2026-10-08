"use client";

import Link from "next/link";
import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";
import { useLegalPageOverride } from "@/hooks/useLegalPageOverride";
import { BulletList, ComplianceOfficerBlock } from "@/components/legal/LegalShared";

const LAST_UPDATED = "2026-09-07";

/**
 * Privacy policy, terms and copyright for the Apon mobile app, as supplied by the app's
 * publisher. An admin can still replace the whole page from Admin → Legal pages → Apon.
 */
export default function AponPrivacyPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const pageTitle = isBn ? "আপন অ্যাপ — গোপনীয়তা নীতি ও শর্তাবলি" : "Apon app — Privacy Policy & Terms";
  const override = useLegalPageOverride("apon", pageTitle, isBn);

  const p = (en: string, bn: string) => <p>{isBn ? bn : en}</p>;
  const list = (en: string[], bn: string[]) => <BulletList items={isBn ? bn : en} />;
  const T = (en: string, bn: string) => (isBn ? bn : en);

  const sections: LegalSection[] = [
    {
      id: "intro",
      title: T("Privacy • Terms • Copyright", "গোপনীয়তা • শর্ত • কপিরাইট"),
      content: p(
        "Apon is your own notebook — tasks, things to remember, debts and dues, income and expenses, people and health records. Everything stays only on your phone. Below, in plain words: what the app keeps, what it does not, why each permission is asked, and what your rights are.",
        "আপন আপনার নিজের খাতা — কাজ, মনে রাখার কথা, দেনা-পাওনা, আয়-ব্যয়, মানুষজন আর স্বাস্থ্যের হিসাব। সবকিছু থাকে শুধু আপনার ফোনে। নিচে সহজ ভাষায় লেখা আছে অ্যাপ কী রাখে, কী রাখে না, কোন অনুমতি কেন চায়, আর আপনার অধিকার কী।",
      ),
    },
    {
      id: "glance",
      title: T("Part 1 — Privacy policy: at a glance", "পর্ব ১ — গোপনীয়তা নীতি: এক নজরে"),
      content: list(
        [
          "Everything you write stays only on your phone. We have no server, and the app sends nothing anywhere.",
          "No account, no sign-in, no ads, no tracking of you.",
          "Data leaves the phone only when you yourself keep a backup or copy somewhere else, or send it to someone.",
          "The app never switches on a permission or changes a setting by itself — it tells you what is needed; the decision is yours.",
        ],
        [
          "আপনার লেখা সবকিছু শুধু আপনার ফোনে থাকে। আমাদের কোনো সার্ভার নেই, অ্যাপ কিছুই কোথাও পাঠায় না।",
          "কোনো অ্যাকাউন্ট নেই, সাইন-ইন নেই, বিজ্ঞাপন নেই, আপনার উপর নজরদারি নেই।",
          "তথ্য ফোনের বাইরে যায় শুধু তখন, যখন আপনি নিজে ব্যাকআপ বা কপি অন্য কোথাও রাখেন বা কাউকে পাঠান।",
          "অ্যাপ নিজে থেকে কোনো অনুমতি চালু করে না, কোনো সেটিংও বদলায় না — কী লাগবে তা জানায়, সিদ্ধান্ত আপনার।",
        ],
      ),
    },
    {
      id: "keeps",
      title: T("What the app keeps on your phone", "অ্যাপ আপনার ফোনে যা রাখে"),
      content: list(
        [
          "What you write: tasks and their times, memories, notes, tags.",
          "Money records: income, expenses, categories, ownership, budgets, debts and dues, instalments.",
          "Names, phone numbers, emails and addresses of people you have written down. If you import from Contacts, only the one person you pick is brought in.",
          "Health: medicines and dose times, doctors, tests, report photos or PDFs, treatment costs.",
          "Photos, videos, PDFs and files you add — copied into the app's own local storage.",
          "Places: only when you tap “Add place”, your approximate position (about 100 metres) at that moment.",
          "When you call or message someone from the app, only the time you did so — not what was said or written.",
          "App settings: language, light/dark theme, time zone, quiet hours. The app-lock PIN is not stored as-is; it is transformed so the real PIN cannot be recovered from it.",
          "Your phone maker's name (for example vivo, Samsung) — read only inside the phone, to show the right reminder steps for your phone. It is sent nowhere.",
          "A small tally of how the app understands your habits (for example “gym” is usually a morning task) — on the phone only.",
        ],
        [
          "আপনার লেখা: কাজ ও তার সময়, মেমোরি, নোট, ট্যাগ।",
          "টাকার হিসাব: আয়, খরচ, খাত, মালিকানা, বাজেট, দেনা-পাওনা আর কিস্তি।",
          "যাদের কথা আপনি লিখেছেন তাদের নাম, ফোন নম্বর, ইমেইল, ঠিকানা। কন্টাক্ট থেকে নিলে শুধু আপনার বেছে নেওয়া একজনের তথ্য আসে।",
          "স্বাস্থ্য: ওষুধ ও খাওয়ার সময়, ডাক্তার, পরীক্ষা, রিপোর্টের ছবি বা PDF, চিকিৎসার খরচ।",
          "আপনার যোগ করা ছবি, ভিডিও, PDF ও ফাইল — অ্যাপের নিজের লোকাল স্টোরেজে কপি হয়ে থাকে।",
          "জায়গা: শুধু আপনি “জায়গা যোগ করুন” চাপলে সেই মুহূর্তের অবস্থান (প্রায় ১০০ মিটার পর্যন্ত আনুমানিক)।",
          "অ্যাপ থেকে কাউকে কল বা মেসেজ করলে শুধু কখন করেছেন সেই সময় — কী বলেছেন বা লিখেছেন তা নয়।",
          "অ্যাপের সেটিং: ভাষা, আলো/অন্ধকার থিম, সময় অঞ্চল, নীরব সময়। অ্যাপ লকের পিন সরাসরি রাখা হয় না — এমনভাবে বদলে রাখা হয় যা থেকে আসল পিন আর বের করা যায় না।",
          "ফোনের কোম্পানির নাম (যেমন vivo, Samsung) — শুধু ফোনের ভেতরে পড়া হয়, আপনার ফোনের জন্য রিমাইন্ডারের যুক্তিক ধাপ দেখাতে। কোথাও পাঠানো হয় না।",
          "অ্যাপ কীভাবে আপনার অভ্যাস বোঝে তার ছোট হিসাব (যেমন “জিম” সাধারণত সকালের কাজ) — শুধু ফোনে।",
        ],
      ),
    },
    {
      id: "never",
      title: T("What the app never takes", "অ্যাপ যা কখনো নেয় না"),
      content: list(
        [
          "Not your whole phonebook.",
          "Not your location while the app is closed, and not a history of where you have been.",
          "Not your call log or SMS — the app does not even ask for these permissions.",
          "The app does not record or store any microphone sound by itself.",
          "Advertising ID, usage statistics or crash reports do not come to us.",
        ],
        [
          "আপনার পুরো ফোনবুক নয়।",
          "অ্যাপ বন্ধ থাকা অবস্থায় আপনার অবস্থান নয়, কোথায় কোথায় গেছেন তার ইতিহাসও নয়।",
          "কল লগ বা এসএমএস নয় — এই অনুমতি অ্যাপ চায়ই না।",
          "অ্যাপ নিজে মাইকের কোনো শব্দ রেকর্ড করে না, জমিয়েও রাখে না।",
          "বিজ্ঞাপনের আইডি, ব্যবহারের পরিসংখ্যান বা অ্যাপ বন্ধ হয়ে যাওয়ার রিপোর্ট আমাদের কাছে আসে না।",
        ],
      ),
    },
    {
      id: "permissions",
      title: T("Why each permission is needed", "কোন অনুমতি কেন লাগে"),
      content: (
        <div className="space-y-3">
          {list(
            [
              "Notifications — to show task and medicine reminders.",
              "Exact-time alarms — to ring a reminder at the very minute you set, even when the app is closed.",
              "Battery exemption and auto-start — so the phone does not switch reminders off to save battery, and reminders are set again when the phone restarts.",
              "Microphone — only when you tap the mic, to write by speaking. The speech-to-text is done by the phone's own voice service (for example Google); if Bangla is not available offline on your phone, that service uses the internet under its own rules. The text stays only on your phone.",
              "Camera — only when you tap to take a photo: receipts, prescriptions, or text on paper. Reading the text from the photo happens inside the phone.",
              "Photos and files — only when you tap to add something or pick a backup location.",
              "Contacts — only when you tap “Import from contacts”; only the person you pick.",
              "Location — only when you tap “Add place”, once, at that moment.",
              "Fingerprint or phone lock — only if you turn on app lock, to open the app.",
              "Calling — the call button opens the phone's dialer; no separate permission is needed.",
            ],
            [
              "নোটিফিকেশন — কাজ ও ওষুধের রিমাইন্ডার দেখাতে।",
              "ঠিক সময়ে বাজা — অ্যাপ বন্ধ থাকলেও ঠিক যে মিনিটে দিয়েছেন সেই মিনিটে রিমাইন্ডার বাজাতে।",
              "ব্যাটারি থেকে ছাড় ও অটো-স্টার্ট — ফোন যেন ব্যাটারি বাঁচাতে গিয়ে রিমাইন্ডার বন্ধ না করে দেয়, আর ফোন আবার চালু হলে রিমাইন্ডারগুলো আবার সেট হয়।",
              "মাইক্রোফোন — শুধু আপনি মাইক চাপলে, কথা বলে লিখতে। কথা থেকে লেখা বানায় ফোনের নিজের ভয়েস সেবা (যেমন Google); ফোনে বাংলা অফলাইনে না থাকলে সেই সেবা ইন্টারনেট ব্যবহার করে — সেটা ফোনের সেবার নিজস্ব নিয়মে চলে। লেখাটা শুধু আপনার ফোনেই থাকে।",
              "ক্যামেরা — শুধু আপনি ছবি তুলতে চাপলে: রশিদ, প্রেসক্রিপশন, বা কাগজের লেখা পড়াতে। ছবির লেখা পড়া হয় ফোনের ভেতরেই।",
              "ছবি ও ফাইল — শুধু আপনি কিছু যোগ করতে বা ব্যাকআপ রাখার জায়গা বাছতে চাপলে।",
              "কন্টাক্ট — শুধু “কন্টাক্ট থেকে নিন” চাপলে; আপনি যাকে বাছেন শুধু তার তথ্য।",
              "অবস্থান — শুধু আপনি “জায়গা যোগ করুন” চাপলে, সেই মুহূর্তে একবার।",
              "আঙুলের ছাপ বা ফোনের লক — শুধু অ্যাপ লক চালু করলে, অ্যাপ খুলতে।",
              "কল — কল বোতাম চাপলে ফোনের ডায়ালার খোলে; এর জন্য আলাদা অনুমতি লাগে না।",
            ],
          )}
          {p(
            "You can switch off any permission in the phone's settings; the app keeps working and only that part stops.",
            "যেকোনো অনুমতি ফোনের সেটিংস থেকে বন্ধ করতে পারেন; অ্যাপ চলবে, শুধু সেই অংশটুকু কাজ করবে না।",
          )}
        </div>
      ),
    },
    {
      id: "health",
      title: T("Health information", "স্বাস্থ্যের তথ্য"),
      content: p(
        "Medicines, doctors, tests and reports are very personal. Like everything else, they stay only on your phone. The app gives only general health information — not diagnosis or medicine doses; talk to a doctor before deciding.",
        "ওষুধ, ডাক্তার, পরীক্ষা আর রিপোর্ট খুব ব্যক্তিগত তথ্য। এগুলোও বাকি সবকিছুর মতো শুধু আপনার ফোনে থাকে। অ্যাপ শুধু সাধারণ স্বাস্থ্য-তথ্য দেয় — রোগ নির্ণয় বা ওষুধের মাত্রা নয়; সিদ্ধান্তের আগে ডাক্তারের সাথে কথা বলুন।",
      ),
    },
    {
      id: "ai",
      title: T("Apon and your own AI", "আপন ও নিজের AI"),
      content: p(
        "Apon understands what you say inside the phone. If you wish, you can add an AI model file you downloaded yourself — it also runs on the phone and sends nothing. General-knowledge answers from AI can be wrong, so the app marks them separately. About your own records, the AI never makes up answers.",
        "আপন আপনার কথা বোঝে ফোনের ভেতরেই। আপনি চাইলে নিজের নামানো একটি AI মডেল ফাইল যোগ করতে পারেন — সেটিও ফোনেই চলে, কিছু পাঠায় না। AI-এর সাধারণ জ্ঞানের উত্তর ভুল হতে পারে, তাই অ্যাপ সেটা আলাদা করে চিহ্ন দিয়ে দেখায়। আপনার নিজের তথ্য নিয়ে AI কখনো বানিয়ে উত্তর দেয় না।",
      ),
    },
    {
      id: "backup",
      title: T("Backup", "ব্যাকআপ"),
      content: p(
        "You can take a backup whenever you like. Auto-backup is off at first — only if you turn it on does it keep one backup a week, inside the app and, if you choose an Apon folder, in Documents > Apon too. With a password, the backup is locked: nobody can open it without the password, not even us; if you forget the password it cannot be recovered. If you keep a backup in another app or cloud, that place's own rules apply.",
        "আপনি যখন খুশি ব্যাকআপ নিতে পারেন। অটো-ব্যাকআপ শুরুতে বন্ধ থাকে — আপনি চালু করলে তবেই প্রতি সপ্তাহে একটি ব্যাকআপ রাখে, অ্যাপের ভেতরে আর আপনি Apon ফোল্ডার বেছে দিলে Documents > Apon-এও। পাসওয়ার্ড দিলে ব্যাকআপ তালাবদ্ধ থাকে — পাসওয়ার্ড ছাড়া কেউ খুলতে পারে না, আমরাও না; পাসওয়ার্ড ভুলে গেলে ফেরত আনা যাবে না। ব্যাকআপ অন্য অ্যাপ বা ক্লাউডে রাখলে সেখানে সেই জায়গার নিয়ম চলে।",
      ),
    },
    {
      id: "components",
      title: T("Components made by others", "অন্যদের তৈরি উপাদান"),
      content: p(
        "The app is built with open-source components used worldwide, such as React Native, Expo, SQLite, and Google's on-phone system for reading text from photos. All of these run on the phone; they bring no ads or tracking.",
        "অ্যাপ বানানো হয়েছে বিশ্বজুড়ে ব্যবহৃত খোলা (ওপেন-সোর্স) উপাদান দিয়ে, যেমন React Native, Expo, SQLite, আর ছবির লেখা পড়তে Google-এর ফোনের ভেতরে চলা ব্যবস্থা। এগুলো সব ফোনেই চলে; এতে কোনো বিজ্ঞাপন বা নজরদারি নেই।",
      ),
    },
    {
      id: "deleting",
      title: T("Deleting your data", "তথ্য মোছা"),
      content: p(
        "Your data stays as long as you do not delete it. You can delete any item on its own (deleted items stay in “Deleted items” and can be restored). If you uninstall the app or clear its data, everything on the phone is gone — take a backup first.",
        "আপনার তথ্য ততদিন থাকে যতদিন আপনি না মোছেন। যেকোনো জিনিস আলাদা করে মুছতে পারেন (মোছা জিনিস “মুছে ফেলা জিনিস”-এ থাকে, চাইলে ফেরত আনা যায়)। অ্যাপ আনইনস্টল করলে বা অ্যাপের তথ্য মুছে দিলে ফোনের সবকিছু চলে যায় — আগে ব্যাকআপ নিয়ে রাখুন।",
      ),
    },
    {
      id: "children",
      title: T("Children", "শিশু"),
      content: p(
        "The app is for adults keeping their own records, not for children under 13. No information reaches us from anyone.",
        "অ্যাপটি বড়দের নিজের হিসাব রাখার জন্য, ১৩ বছরের কম বয়সীদের জন্য নয়। কারও কাছ থেকে কোনো তথ্য আমাদের কাছে আসে না।",
      ),
    },
    {
      id: "download-logs",
      title: T("What this website keeps when you download", "ডাউনলোডের সময় ওয়েবসাইট কী রাখে"),
      content: p(
        "This applies to the website, not the app. To count downloads and prevent abuse, the website records the time, the app version and your browser type, and a one-way scrambled form of your IP address (the address itself is not stored). This is used only for statistics and protection.",
        "এটি ওয়েবসাইটের ক্ষেত্রে, অ্যাপের নয়। ডাউনলোড গণনা ও অপব্যবহার ঠেকাতে ওয়েবসাইট সময়, অ্যাপের সংস্করণ ও আপনার ব্রাউজারের ধরন এবং আইপি ঠিকানার একটি একমুখী গোপন রূপ রাখে (আসল ঠিকানা রাখা হয় না)। এটি শুধু পরিসংখ্যান ও সুরক্ষার কাজে ব্যবহৃত হয়।",
      ),
    },
    {
      id: "changes",
      title: T("If this policy changes", "এই নীতি বদলালে"),
      content: p(
        "If the policy changes, the new date will be shown inside the app.",
        "নীতি বদলালে নতুন তারিখসহ অ্যাপের ভেতরেই দেখা যাবে।",
      ),
    },
    {
      id: "terms",
      title: T("Part 2 — Terms of use", "পর্ব ২ — ব্যবহারের শর্ত"),
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-heading mb-1">{T("1. Permission to use", "১. ব্যবহারের অনুমতি")}</h3>
            {p(
              "You may use Apon on your own or your family's phone. This permission is personal — it cannot be sold or handed over to anyone else.",
              "আপনি নিজের বা পরিবারের ফোনে আপন ব্যবহার করতে পারবেন। এই অনুমতি ব্যক্তিগত — অন্য কাউকে বিক্রি বা হস্তান্তর করা যায় না।",
            )}
          </div>
          <div>
            <h3 className="font-bold text-heading mb-1">{T("2. What is not allowed", "২. যা করা যাবে না")}</h3>
            {list(
              [
                "Copying, selling or renting the app or any part of it as your own.",
                "Opening the app to extract or copy its inner code, beyond what the law allows.",
                "Removing or changing copyright or the creator's name.",
                "Using the app to break the law or harm others.",
              ],
              [
                "অ্যাপ বা এর অংশ নিজের বলে কপি, বিক্রি বা ভাড়া দেওয়া।",
                "আইন যতটুকু অনুমতি দেয় তার বাইরে অ্যাপ খুলে ভেতরের কোড বের করা বা নকল করা।",
                "কপিরাইট বা নির্মাতার নাম সরানো বা বদলানো।",
                "অ্যাপ দিয়ে আইন ভাঙা বা অন্যের ক্ষতি করা।",
              ],
            )}
          </div>
          <div>
            <h3 className="font-bold text-heading mb-1">{T("3. Your data is yours", "৩. আপনার তথ্য আপনারই")}</h3>
            {p(
              "You own everything you write and keep in the app. It never comes to us, so we claim no rights over it.",
              "অ্যাপে আপনার লেখা ও রাখা সবকিছুর মালিক আপনি। সেগুলো আমাদের কাছে আসেই না, তাই আমরা তার কোনো অধিকার দাবি করি না।",
            )}
          </div>
          <div>
            <h3 className="font-bold text-heading mb-1">{T("4. Updates", "৪. আপডেট")}</h3>
            {p(
              "The app will improve over time; a new version may add, change or remove parts. Take a backup before updating.",
              "অ্যাপ সময়ের সাথে উন্নত হবে; নতুন সংস্করণে কোনো অংশ যোগ, বদল বা বাদ হতে পারে। আপডেটের আগে ব্যাকআপ নিয়ে রাখা ভালো।",
            )}
          </div>
          <div>
            <h3 className="font-bold text-heading mb-1">{T("5. Limit of responsibility", "৫. দায়িত্বের সীমা")}</h3>
            {p(
              "The app is provided as it is. We built it with care, but mistakes or data loss are not impossible — so keep regular backups. Before important decisions about money, health or law, check the app's figures and take professional advice. To the extent the law allows, SUMON and ABO ENTERPRISE are not liable for indirect loss or data loss resulting from this.",
              "অ্যাপ যেমন আছে তেমনভাবে দেওয়া হচ্ছে। আমরা যত্ন নিয়ে বানিয়েছি, তবু ভুল বা তথ্য হারানো অসম্ভব নয় — তাই নিয়মিত ব্যাকআপ রাখুন। টাকা, স্বাস্থ্য বা আইনের গুরুত্বপূর্ণ সিদ্ধান্তের আগে অ্যাপের হিসাব মিলিয়ে নিন ও বিশেষজ্ঞের পরামর্শ নিন। আইন যতটুকু অনুমতি দেয়, এর ফলে হওয়া কোনো পরোক্ষ ক্ষতি বা তথ্য হারানোর দায় SUMON বা ABO ENTERPRISE-এর নয়।",
            )}
          </div>
          <div>
            <h3 className="font-bold text-heading mb-1">{T("6. Governing law", "৬. প্রযোজ্য আইন")}</h3>
            {p(
              "These terms are governed by the laws of Bangladesh. Your rights as a consumer under your own country's law are not reduced by this.",
              "এই শর্ত বাংলাদেশের আইন অনুযায়ী চলবে। আপনার দেশের আইনে ক্রেতা হিসেবে যে অধিকার আছে, তা এতে কমে না।",
            )}
          </div>
        </div>
      ),
    },
    {
      id: "copyright",
      title: T("Part 3 — Copyright", "পর্ব ৩ — কপিরাইট"),
      content: (
        <div className="space-y-3">
          {p("© 2026 SUMON | All rights reserved.", "© 2026 SUMON | সর্বস্বত্ব সংরক্ষিত।")}
          {p(
            "The name, logo, design, screens and text of Apon are the property of SUMON. Without written permission they may not be used in a way that suggests we endorse something.",
            "আপন-এর নাম, লোগো, নকশা, পর্দা ও লেখা SUMON-এর সম্পত্তি। লিখিত অনুমতি ছাড়া এগুলো এমনভাবে ব্যবহার করা যাবে না যাতে মনে হয় আমরা সমর্থন দিচ্ছি।",
          )}
          {p(
            "Open-source components made by others belong to their respective authors and are used under their own terms. A copy of those terms will be sent on request.",
            "অন্যদের তৈরি খোলা (ওপেন-সোর্স) উপাদান তাদের নিজ নিজ লেখকের, তাদের নিজস্ব শর্তে ব্যবহৃত। চাইলে সেই শর্তের কপি পাঠানো হবে।",
          )}
          {p(
            "Apon — your data only on your phone. 100% offline — nothing goes to a server.",
            "আপন — আপনার তথ্য শুধু আপনার ফোনে। ১০০% অফলাইন — কিছুই সার্ভারে যায় না।",
          )}
        </div>
      ),
    },
    {
      id: "contact",
      title: T("Contact", "যোগাযোগ"),
      content: (
        <div className="space-y-3">
          {p(
            "For questions, suggestions or complaints, email us:",
            "প্রশ্ন, পরামর্শ বা অভিযোগ থাকলে ইমেইল করুন:",
          )}
          <p>
            <a href="mailto:info@aboenterprise.com" className="font-semibold underline underline-offset-2">info@aboenterprise.com</a>
          </p>
          <ComplianceOfficerBlock />
          <p className="text-sm">
            <Link href="/legal/privacy" className="underline underline-offset-2">{T("Website privacy policy", "ওয়েবসাইটের গোপনীয়তা নীতি")}</Link>
            {" · "}
            <Link href="/apon" className="underline underline-offset-2">{T("Apon download page", "আপন ডাউনলোড পেজ")}</Link>
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
