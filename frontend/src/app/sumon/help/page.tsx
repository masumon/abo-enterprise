"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Accordion from "@/components/ui/Accordion";

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal pl-5 space-y-1.5 text-sm leading-relaxed">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ol>
  );
}

function Go({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-300 hover:underline">
      {children} <ExternalLink className="w-3 h-3" aria-hidden />
    </Link>
  );
}

const GROUPS: { title: string; items: { id: string; question: string; answer: React.ReactNode }[] }[] = [
  {
    title: "প্রতিদিনের কাজ",
    items: [
      {
        id: "daily",
        question: "রোজ সকালে কী কী দেখব?",
        answer: (
          <Steps
            items={[
              <>ড্যাশবোর্ডের <b>সেটআপ গাইড</b> দেখুন — কিছু বাকি থাকলে সেখানে লাল/হলুদ চিহ্নে দেখাবে।</>,
              <><Go href="/sumon/orders">অর্ডার</Go> খুলে নতুন (Pending) অর্ডারগুলো নিশ্চিত করুন।</>,
              <><Go href="/sumon/bookings">বুকিং</Go> ও <Go href="/sumon/leads">লিড</Go> দেখে ফোনে/হোয়াটসঅ্যাপে যোগাযোগ করুন।</>,
              <><Go href="/sumon/notifications">নোটিফিকেশন</Go> ও পেমেন্ট ব্যর্থতার সতর্কতা দেখুন।</>,
            ]}
          />
        ),
      },
      {
        id: "orders",
        question: "নতুন অর্ডার এলে কী করব?",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/orders">অর্ডার</Go> পেজে অর্ডারটি খুলুন।</>,
              "গ্রাহকের নাম, ঠিকানা ও পেমেন্ট ঠিক আছে কি না দেখুন; দরকারে ফোন করে নিশ্চিত করুন।",
              "অর্ডারের অবস্থা (Status) ধাপে ধাপে এগিয়ে দিন: Pending → Confirmed → Processing → Shipped → Delivered (বাতিল করতে Cancelled)।",
              <>কুরিয়ারে পাঠালে অর্ডার পেজ থেকেই কুরিয়ার (Steadfast) বুক করা যায়; <Go href="/sumon/tracking">ট্র্যাকিং</Go> এ অবস্থা দেখুন।</>,
              "গ্রাহকের ইমেইল দেওয়া থাকলে অবস্থা বদলালে তাঁকে স্বয়ংক্রিয়ভাবে ইমেইল যায়।",
            ]}
          />
        ),
      },
    ],
  },
  {
    title: "দোকান ও সেবা",
    items: [
      {
        id: "product",
        question: "নতুন পণ্য যোগ করব কীভাবে?",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/products">পণ্য</Go> পেজে “নতুন পণ্য” চাপুন।</>,
              "নাম, দাম, ছবি, ক্যাটাগরি ও স্টকের সংখ্যা দিন।",
              "সংরক্ষণ করলেই পণ্যটি ওয়েবসাইটে দেখাবে। অনেক পণ্য একসাথে দিতে চাইলে “বাল্ক ইমপোর্ট” (CSV/Excel) ব্যবহার করুন।",
              <>স্টক কমে গেলে <Go href="/sumon/inventory">ইনভেন্টরি</Go> পেজে সতর্কতা দেখাবে।</>,
            ]}
          />
        ),
      },
      {
        id: "service",
        question: "সেবা ও বুকিং ফর্ম কীভাবে বদলাব?",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/services">সেবা</Go> পেজে সেবাটি খুলুন।</>,
              "নাম, বিবরণ, ছবি ও মূল্যস্তর (Pricing tier) ঠিক করুন।",
              "বুকিং ফর্মে কোন কোন তথ্য চাইবেন (নাম, ফোন, কাগজপত্র ইত্যাদি) সেখানেই যোগ/বাদ দিন।",
              <>গ্রাহকের বুকিং আসে <Go href="/sumon/bookings">বুকিং</Go> পেজে।</>,
            ]}
          />
        ),
      },
      {
        id: "delivery",
        question: "ডেলিভারি চার্জ কোথায় বদলাব?",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/delivery">চেকআউট ও ডেলিভারি</Go> পেজে সিলেট, ঢাকা ও বাকি দেশের চার্জ লিখুন (শুধু সংখ্যা, যেমন 60)।</>,
              <>ফ্রি-ডেলিভারির সর্বনিম্ন অর্ডার-মূল্যও এখান থেকে ঠিক হয়। জেলা-ভিত্তিক চার্জ চাইলে <Go href="/sumon/delivery-zones">ডেলিভারি জোন</Go> ব্যবহার করুন।</>,
            ]}
          />
        ),
      },
    ],
  },
  {
    title: "ওয়েবসাইটের তথ্য ও চেহারা",
    items: [
      {
        id: "contact",
        question: "ফোন, হোয়াটসঅ্যাপ, ঠিকানা বা সময় বদলাব কীভাবে?",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/settings#company_info">সেটিংস → যোগাযোগ ও ঠিকানা</Go> খুলুন।</>,
              <><b>ফোন (কল)</b> ও <b>WhatsApp নম্বর</b> আলাদা ঘরে লিখুন — দুটো আলাদা রাখা যায়। ফাঁকা রাখলে হোয়াটসঅ্যাপে কল-নম্বরই ব্যবহার হবে।</>,
              "ঠিকানা (বাংলা ও ইংরেজি), ইমেইল ও ব্যবসার সময় লিখুন। সময়ের ঘরে ব্যবসার নাম নয়, সময় লিখুন (যেমন: শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা)।",
              "নিচের “সংরক্ষণ” চাপুন — পুরো সাইটে (হোমপেজ, ফুটার, প্রোডাক্ট, FAQ, ইনভয়েস) নম্বর নিজে থেকে বদলে যাবে।",
              "ভুল নম্বর/ইমেইল লিখলে সংরক্ষণের আগেই বাংলায় সতর্কবার্তা দেখাবে।",
            ]}
          />
        ),
      },
      {
        id: "home",
        question: "হোমপেজের লেখা, ছবি, ব্যানার ও ঘোষণা কীভাবে বদলাব?",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/homepage">হোমপেজ কনটেন্ট</Go> — ইন্ট্রো, সেকশনের লেখা।</>,
              <><Go href="/sumon/promo-slides">ব্যানার ও স্লাইড</Go> — উপরের বড় ছবি/অফার ব্যানার।</>,
              <><Go href="/sumon/announcements">ঘোষণা বার</Go> — সবার উপরের চলমান বার্তা।</>,
              <>সব ছবি <Go href="/sumon/media">ছবি ব্যবস্থাপনা</Go> থেকে আপলোড ও বাছাই হয়।</>,
            ]}
          />
        ),
      },
      {
        id: "team",
        question: "টিম, ডেভেলপার ক্রেডিট ও ফেসবুক লিংক বদলাব কীভাবে?",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/settings#trust_media">সেটিংস → টিম সদস্য</Go> খুলুন।</>,
              "নাম, পদবী (বাংলা ও ইংরেজি), ছবি, বায়ো দিন।",
              "“Facebook link” ঘরে প্রোফাইলের লিংক দিলে About পেজ ও ফুটারের ক্রেডিটে আসল Facebook আইকন আসবে, ক্লিক করলে ওই পেজ খুলবে।",
              "ফুটারের ক্রেডিট স্বয়ংক্রিয়ভাবে সেই সদস্যদের দেখায় যাঁদের পদবীতে “Developer/ডেভেলপার” বা “Designer/ডিজাইনার/Creative/সৃজনশীল” আছে।",
            ]}
          />
        ),
      },
      {
        id: "legal",
        question: "গোপনীয়তা নীতি, শর্তাবলী, রিফান্ড ও কুকি নীতি কীভাবে চলে?",
        answer: (
          <div className="space-y-2 text-sm leading-relaxed">
            <p>এই চারটি পেজে আগে থেকেই বাংলাদেশের নির্দেশিকা অনুযায়ী পূর্ণ লেখা আছে — আপনাকে কিছু লিখতে হবে না।</p>
            <p>
              <Go href="/sumon/legal-pages">আইনি পেজ</Go> এ নিজের লেখা সংরক্ষণ করলে সেটি পুরো ডিফল্ট লেখার <b>জায়গায়</b> বসে যায়। তাই আইনজীবীর দেখা না হলে নিজের লেখা দেবেন না। ফাঁকা রাখলে ডিফল্ট লেখাই চলবে।
            </p>
            <p>অভিযোগ ডেস্কের নাম/পদবী বদলাতে সেটিংসে “Complaints &amp; compliance officer” ঘর ব্যবহার করুন।</p>
          </div>
        ),
      },
    ],
  },
  {
    title: "টাকা-পয়সা ও মার্কেটিং",
    items: [
      {
        id: "pay",
        question: "পেমেন্ট পদ্ধতি চালু/বন্ধ ও মিলিয়ে দেখা",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/payments">পেমেন্ট</Go> পেজে bKash, Nagad, কার্ড ইত্যাদি চালু/বন্ধ করুন।</>,
              "“রিকনসিলিয়েশন” ট্যাবে গেটওয়ের হিসাবের সাথে অর্ডারের পেমেন্ট মিলিয়ে দেখুন।",
              <>ইনভয়েস <Go href="/sumon/invoices">ইনভয়েস</Go> পেজ থেকে দেখা ও পাঠানো যায়।</>,
            ]}
          />
        ),
      },
      {
        id: "marketing",
        question: "কুপন, ফ্ল্যাশ সেল ও নিউজলেটার",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/coupons">কুপন</Go> — কোড, ছাড়ের পরিমাণ ও মেয়াদ দিন।</>,
              <>ফ্ল্যাশ সেল চালু/বন্ধ ও সময় <Go href="/sumon/settings#flash_sale_config">সেটিংস</Go> থেকে ঠিক হয়।</>,
              <><Go href="/sumon/newsletter">নিউজলেটার</Go> — গ্রাহকদের ইমেইল তালিকা ও পাঠানো।</>,
            ]}
          />
        ),
      },
    ],
  },
  {
    title: "নিরাপত্তা ও টিম",
    items: [
      {
        id: "2fa",
        question: "২-ধাপ যাচাই (2FA) কী ও কীভাবে চালু করব?",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/security">অ্যাকাউন্ট নিরাপত্তা</Go> খুলুন।</>,
              "ফোনে Google Authenticator (বা Microsoft Authenticator/Authy) নামান।",
              "QR কোড স্ক্যান করে অ্যাপের ৬-সংখ্যার কোড লিখে নিশ্চিত করুন।",
              <b key="rc">যে ১০টি রিকভারি কোড দেখাবে সেগুলো প্রিন্ট বা ফাইলে সংরক্ষণ করুন — ফোন হারালে এগুলোই ভরসা।</b>,
              "পরের সাইন-ইন থেকে পাসওয়ার্ডের পরে অ্যাপের কোড লাগবে।",
            ]}
          />
        ),
      },
      {
        id: "lost-phone",
        question: "ফোন হারালে বা কোড কাজ না করলে কী করব?",
        answer: (
          <Steps
            items={[
              "সাইন-ইনের সময় “ফোন হাতে নেই? রিকভারি কোড ব্যবহার করুন” চাপুন এবং একটি রিকভারি কোড দিন (প্রতিটি একবারই চলে)।",
              "ঢুকে নতুন ফোনে ২-ধাপ আবার সেট করুন ও নতুন রিকভারি কোড তৈরি করুন।",
              "রিকভারি কোডও না থাকলে মাস্টার অ্যাডমিনকে বলুন — তিনি নিরাপত্তা পেজ থেকে আপনার ২-ধাপ “রিসেট” করে দেবেন।",
              "ভুল কোড বারবার দিলে অ্যাকাউন্ট ১৫ মিনিটের জন্য আটকে যায় — অপেক্ষা করে আবার চেষ্টা করুন।",
            ]}
          />
        ),
      },
      {
        id: "everyone",
        question: "সব অ্যাডমিনের জন্য ২-ধাপ বাধ্যতামূলক করব কীভাবে? (মাস্টার অ্যাডমিন)",
        answer: (
          <Steps
            items={[
              "আগে নিজের অ্যাকাউন্টে ২-ধাপ চালু করুন।",
              <><Go href="/sumon/security">অ্যাকাউন্ট নিরাপত্তা</Go> পেজের “সাইটের নিরাপত্তা নীতি” অংশে সুইচ চালু করুন।</>,
              "এরপর যাঁর ২-ধাপ নেই তিনি পরের সাইন-ইনে সরাসরি সেটআপ পেজে যাবেন; সেটআপ শেষ না হলে অন্য কিছু খুলবে না। কেউ লক-আউট হবেন না।",
              "যেকোনো সময় সুইচ বন্ধ করে আবার ঐচ্ছিক করা যায়।",
            ]}
          />
        ),
      },
      {
        id: "users",
        question: "নতুন সদস্য যোগ ও তাঁর অনুমতি ঠিক করা",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/users">ইউজার</Go> পেজে নতুন সদস্য যোগ করুন এবং ভূমিকা (Role) বাছুন।</>,
              <>কোন ভূমিকা কী করতে পারে তা <Go href="/sumon/roles-permissions">ভূমিকা ও অনুমতি</Go> পেজে দেখুন। শুধু দেখার জন্য Viewer, কনটেন্ট সম্পাদনার জন্য Editor, ব্যবস্থাপনার জন্য Admin।</>,
              "কারও পাসওয়ার্ড বদলালে বা তাঁকে বন্ধ করলে তিনি সব ডিভাইস থেকে আপনাআপনি সাইন-আউট হয়ে যান।",
              "মাস্টার (Super) অ্যাডমিনের অ্যাকাউন্ট শুধু মাস্টার অ্যাডমিনই বদলাতে পারেন।",
            ]}
          />
        ),
      },
      {
        id: "audit",
        question: "কে কখন কী বদলাল দেখব কীভাবে?",
        answer: (
          <p className="text-sm leading-relaxed">
            <Go href="/sumon/audit">অডিট লগ</Go> এ প্রতিটি গুরুত্বপূর্ণ পরিবর্তনের তারিখ, কে করেছেন ও কী বদলেছে দেখা যায়। সন্দেহ হলে এখান থেকেই শুরু করুন।
          </p>
        ),
      },
    ],
  },
  {
    title: "সমস্যা হলে",
    items: [
      {
        id: "slow",
        question: "সাইট প্রথমবার ধীর খুলছে কেন?",
        answer: (
          <p className="text-sm leading-relaxed">
            সার্ভার কিছুক্ষণ ব্যবহার না হলে বিশ্রামে চলে যায় (ফ্রি প্ল্যানের নিয়ম), তাই প্রথম লোডে একটু বেশি সময় লাগতে পারে। কয়েক সেকেন্ড পরে পেজ রিফ্রেশ করুন — তারপর স্বাভাবিক গতিতে চলবে।
          </p>
        ),
      },
      {
        id: "wrong-info",
        question: "সাইটে ভুল ফোন/তথ্য দেখাচ্ছে",
        answer: (
          <Steps
            items={[
              <><Go href="/sumon/settings#company_info">সেটিংস → যোগাযোগ ও ঠিকানা</Go> এ গিয়ে ঠিক করে সংরক্ষণ করুন।</>,
              "১ মিনিট পর পেজ রিফ্রেশ করুন; পুরনো তথ্য দেখালে ব্রাউজারের ক্যাশ পরিষ্কার করুন।",
              "তবু না বদলালে নিজের ডেভেলপারকে জানান (পেজের ঠিকানাসহ)।",
            ]}
          />
        ),
      },
      {
        id: "backup",
        question: "ডেটার ব্যাকআপ কি আছে?",
        answer: (
          <p className="text-sm leading-relaxed">
            হ্যাঁ — ডেটাবেসের একটি স্বয়ংক্রিয় ব্যাকআপ প্রতি সপ্তাহে নেওয়া হয় এবং ৩০ দিন সংরক্ষিত থাকে। রিস্টোর করা একটি টেকনিক্যাল কাজ, তাই প্রয়োজনে আপনার ডেভেলপারের সাথে যোগাযোগ করুন। বড় কিছু বদলানোর আগে ডেভেলপারকে একবার জানিয়ে রাখা নিরাপদ।
          </p>
        ),
      },
    ],
  },
];

export default function AdminHelpPage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <AdminPageHeader
        title="Help Guide"
        titleBn="সহায়তা গাইড"
        description="Step-by-step answers for everyday admin tasks, in simple language."
        descriptionBn="প্যানেল চালানোর প্রতিদিনের কাজগুলো ধাপে ধাপে, সহজ বাংলায়। লিংকে চাপলেই সঠিক পেজ খুলবে।"
      />
      {GROUPS.map((g) => (
        <section key={g.title} aria-labelledby={`help-${g.title}`}>
          <h2 id={`help-${g.title}`} className="text-base font-bold text-heading mb-2">{g.title}</h2>
          <Accordion items={g.items} />
        </section>
      ))}
    </div>
  );
}
