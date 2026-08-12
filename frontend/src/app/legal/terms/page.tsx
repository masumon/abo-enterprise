"use client";

import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { useLegalPageOverride } from "@/hooks/useLegalPageOverride";

const LAST_UPDATED = "2026-07-25";

export default function TermsPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const pageTitle = isBn ? "সেবার শর্তাবলী" : "Terms of Service";
  const overrideSections = useLegalPageOverride("terms", pageTitle, isBn);
  const { settings } = usePublicSettings(["contact_email", "contact_phone", "contact_address"]);
  const email = getSettingValue(settings, "contact_email", "info@aboenterprise.com");
  const phone = getSettingValue(settings, "contact_phone", "+880 1825 007977");
  const address = getSettingValue(settings, "contact_address", isBn ? "সিলেট, বাংলাদেশ" : "Sylhet, Bangladesh");

  const sections: LegalSection[] = [
    {
      id: "agreement",
      title: isBn ? "চুক্তি ও গ্রহণযোগ্যতা" : "Agreement & Acceptance",
      content: (
        <>
          <p>
            {isBn
              ? "ABO Enterprise-এর ওয়েবসাইট, অ্যাপ ও সেবা ব্যবহার করে আপনি এই শর্তাবলী এবং আমাদের গোপনীয়তা নীতি ও কুকি নীতি মেনে নিচ্ছেন। আপনি যদি এই শর্তাবলীর সাথে একমত না হন, অনুগ্রহ করে সেবা ব্যবহার করবেন না।"
              : "By using the ABO Enterprise website, app and services, you agree to these Terms of Service together with our Privacy Policy and Cookies Policy. If you do not agree, please do not use the services."}
          </p>
          <p>
            {isBn
              ? "সেবা ব্যবহারের জন্য আপনাকে কমপক্ষে ১৮ বছর বয়সী হতে হবে অথবা আইনগত অভিভাবকের তত্ত্বাবধানে থাকতে হবে।"
              : "You must be at least 18 years old, or use the services under the supervision of a legal guardian."}
          </p>
        </>
      ),
    },
    {
      id: "company",
      title: isBn ? "প্রতিষ্ঠান পরিচিতি" : "About the Company",
      content: (
        <p>
          {isBn
            ? "ABO Enterprise বাংলাদেশ থেকে পরিচালিত একটি নিবন্ধিত প্রতিষ্ঠান, যা ই-কমার্স পণ্য, প্রিন্টিং, সফটওয়্যার ও ডিজিটাল সেবা প্রদান করে। ঠিকানা: "
            : "ABO Enterprise is a registered business operating from Bangladesh, providing e-commerce products, printing, software and digital services. Address: "}
          <b>{address}</b>।
        </p>
      ),
    },
    {
      id: "orders",
      title: isBn ? "অর্ডার, মূল্য ও পেমেন্ট" : "Orders, Pricing & Payment",
      content: (
        <>
          <p>
            {isBn
              ? "সকল মূল্য বাংলাদেশি টাকায় (৳/BDT) এবং প্রযোজ্য ভ্যাট/ট্যাক্সসহ প্রদর্শিত হয়। পণ্যের মূল্য, স্টক ও অফার পূর্ব ঘোষণা ছাড়াই পরিবর্তন হতে পারে।"
              : "All prices are shown in Bangladeshi Taka (BDT) inclusive of applicable VAT/tax. Product prices, stock and offers may change without prior notice."}
          </p>
          <p>
            {isBn
              ? "আমরা ক্যাশ-অন-ডেলিভারি এবং অনুমোদিত অনলাইন গেটওয়ে (bKash, Nagad, ব্যাংক কার্ড, SSLCOMMERZ) গ্রহণ করি। অর্ডার নিশ্চিতকরণের পর আমরা ফোন বা ইমেইলে যোগাযোগ করব।"
              : "We accept Cash on Delivery and approved online gateways (bKash, Nagad, bank cards, SSLCOMMERZ). We will contact you by phone or email after order confirmation."}
          </p>
          <p>
            {isBn
              ? "স্পষ্ট মূল্য-ত্রুটি, স্টক সীমাবদ্ধতা বা জালিয়াতির সন্দেহ থাকলে আমরা যেকোনো অর্ডার বাতিল বা প্রত্যাখ্যান করার অধিকার সংরক্ষণ করি; সেক্ষেত্রে পরিশোধিত অর্থ সম্পূর্ণ ফেরত দেওয়া হবে।"
              : "We reserve the right to cancel or decline any order in cases of obvious pricing errors, stock limitations or suspected fraud; any amount paid will be fully refunded in such cases."}
          </p>
        </>
      ),
    },
    {
      id: "delivery",
      title: isBn ? "ডেলিভারি ও রিটার্ন" : "Delivery & Returns",
      content: (
        <p>
          {isBn
            ? "ডেলিভারি সময় ও চার্জ এলাকাভেদে ভিন্ন হয় এবং চেকআউটে প্রদর্শিত হয়। ফেরত ও রিফান্ড সংক্রান্ত বিস্তারিত আমাদের রিফান্ড নীতি ও শিপিং তথ্য পেজে বর্ণিত আছে, যা ভোক্তা-অধিকার সংরক্ষণ আইন, ২০০৯ অনুসারে পরিচালিত।"
            : "Delivery time and charges vary by area and are shown at checkout. Returns and refunds are detailed in our Refund Policy and Shipping pages, handled in line with the Consumer Rights Protection Act, 2009 of Bangladesh."}
        </p>
      ),
    },
    {
      id: "software",
      title: isBn ? "সফটওয়্যার ও কাস্টম প্রজেক্ট" : "Software & Custom Projects",
      content: (
        <p>
          {isBn
            ? "সফটওয়্যার, ওয়েব ও কাস্টম প্রজেক্টের জন্য পৃথক লিখিত চুক্তি (স্কোপ, মাইলস্টোন, পেমেন্ট শিডিউল) প্রযোজ্য। সেই চুক্তির শর্ত এই সাধারণ শর্তাবলীর ওপর প্রাধান্য পাবে।"
            : "Software, web and custom projects are governed by separate written agreements (scope, milestones, payment schedule). The terms of that agreement prevail over these general terms."}
        </p>
      ),
    },
    {
      id: "ip",
      title: isBn ? "বৌদ্ধিক সম্পত্তি" : "Intellectual Property",
      content: (
        <p>
          {isBn
            ? "এই ওয়েবসাইটের সকল কনটেন্ট, লোগো, ট্রেডমার্ক, গ্রাফিক্স ও সফটওয়্যার ABO Enterprise বা এর লাইসেন্সদাতার সম্পত্তি এবং প্রযোজ্য কপিরাইট ও ট্রেডমার্ক আইন দ্বারা সুরক্ষিত। পূর্বানুমতি ছাড়া অনুলিপি, বিতরণ বা বাণিজ্যিক ব্যবহার নিষিদ্ধ।"
            : "All content, logos, trademarks, graphics and software on this website belong to ABO Enterprise or its licensors and are protected by applicable copyright and trademark laws. Copying, distribution or commercial use without prior permission is prohibited."}
        </p>
      ),
    },
    {
      id: "conduct",
      title: isBn ? "ব্যবহারকারীর দায়িত্ব" : "Acceptable Use",
      content: (
        <p>
          {isBn
            ? "আপনি সঠিক তথ্য প্রদান করতে, অ্যাকাউন্টের গোপনীয়তা রক্ষা করতে এবং সেবা কোনো বেআইনি, প্রতারণামূলক বা ক্ষতিকর উদ্দেশ্যে ব্যবহার না করতে সম্মত হচ্ছেন। তথ্য ও যোগাযোগ প্রযুক্তি আইনসহ প্রযোজ্য আইন লঙ্ঘন করলে অ্যাকাউন্ট স্থগিত হতে পারে।"
            : "You agree to provide accurate information, keep your account credentials secure, and not use the services for any unlawful, fraudulent or harmful purpose. Violating applicable law, including ICT regulations, may result in account suspension."}
        </p>
      ),
    },
    {
      id: "liability",
      title: isBn ? "দায়সীমা ও ওয়ারেন্টি" : "Liability & Warranty",
      content: (
        <p>
          {isBn
            ? "সেবা \"যেমন আছে\" ভিত্তিতে প্রদান করা হয়। আমরা মানসম্পন্ন সেবা দিতে সর্বোচ্চ চেষ্টা করি, তবে আমাদের নিয়ন্ত্রণবহির্ভূত পরিস্থিতি (প্রাকৃতিক দুর্যোগ, নেটওয়ার্ক বিভ্রাট, কুরিয়ার বিলম্ব) থেকে সৃষ্ট পরোক্ষ ক্ষতির জন্য দায়ী নই। আমাদের সর্বোচ্চ দায় সংশ্লিষ্ট অর্ডারের পরিশোধিত মূল্যের মধ্যে সীমাবদ্ধ।"
            : "The services are provided \"as is\". We strive to deliver quality service but are not liable for indirect losses arising from circumstances beyond our control (natural disasters, network outages, courier delays). Our maximum liability is limited to the amount paid for the relevant order."}
        </p>
      ),
    },
    {
      id: "law",
      title: isBn ? "প্রযোজ্য আইন ও এখতিয়ার" : "Governing Law & Jurisdiction",
      content: (
        <p>
          {isBn
            ? "এই শর্তাবলী গণপ্রজাতন্ত্রী বাংলাদেশের প্রচলিত আইন দ্বারা পরিচালিত হবে। উদ্ভূত যেকোনো বিরোধ প্রথমে সৌহার্দ্যপূর্ণভাবে নিষ্পত্তির চেষ্টা করা হবে; ব্যর্থ হলে তা বাংলাদেশের উপযুক্ত আদালতের একচ্ছত্র এখতিয়ারভুক্ত হবে।"
            : "These terms are governed by the laws of the People's Republic of Bangladesh. Any dispute will first be addressed amicably; failing that, it falls under the exclusive jurisdiction of the competent courts of Bangladesh."}
        </p>
      ),
    },
    {
      id: "changes",
      title: isBn ? "পরিবর্তন ও যোগাযোগ" : "Changes & Contact",
      content: (
        <p>
          {isBn
            ? "আমরা যেকোনো সময় এই শর্তাবলী হালনাগাদ করতে পারি; উল্লেখযোগ্য পরিবর্তন এই পেজে প্রকাশ করা হবে। প্রশ্নের জন্য যোগাযোগ করুন — ইমেইল: "
            : "We may update these terms at any time; significant changes will be posted on this page. For questions, contact us — Email: "}
          <b>{email}</b> · {isBn ? "ফোন: " : "Phone: "}<b>{phone}</b>।
        </p>
      ),
    },
  ];

  return (
    <main>
      <PageHero
        pageKey="terms"
        variant="light"
        title={pageTitle}
        breadcrumbs={[{ label: isBn ? "শর্তাবলী" : "Terms" }]}
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
