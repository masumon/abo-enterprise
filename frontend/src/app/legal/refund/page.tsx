"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";
import { useLegalPageOverride } from "@/hooks/useLegalPageOverride";

const LAST_UPDATED = "2026-07-25";

export default function RefundPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const pageTitle = isBn ? "রিফান্ড নীতি" : "Refund Policy";
  const overrideSections = useLegalPageOverride("refund", pageTitle, isBn);

  const sections: LegalSection[] = [
    {
      id: "overview",
      title: isBn ? "সারসংক্ষেপ" : "Overview",
      content: (
        <p>
          {isBn
            ? "গ্রাহক সন্তুষ্টি আমাদের অগ্রাধিকার। ভোক্তা-অধিকার সংরক্ষণ আইন, ২০০৯ ও আন্তর্জাতিক e-commerce মান অনুসরণ করে আমরা ত্রুটিপূর্ণ বা ভুল পণ্যের ক্ষেত্রে ন্যায্য রিটার্ন, প্রতিস্থাপন ও রিফান্ড নিশ্চিত করি।"
            : "Customer satisfaction is our priority. In line with the Consumer Rights Protection Act, 2009 and international e-commerce standards, we ensure fair returns, replacement and refunds for defective or incorrect items."}
        </p>
      ),
    },
    {
      id: "window",
      title: isBn ? "রিটার্ন উইন্ডো ও শর্ত" : "Return Window & Conditions",
      content: (
        <>
          <p>
            {isBn
              ? "পণ্য বুঝে পাওয়ার ৭ (সাত) দিনের মধ্যে রিটার্ন/রিফান্ডের অনুরোধ করতে হবে। পণ্য যোগ্য হতে হলে:"
              : "Return/refund requests must be made within 7 (seven) days of receiving the product. To qualify, the item must be:"}
          </p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>{isBn ? "অব্যবহৃত ও আসল অবস্থায়, মূল প্যাকেজিং ও ট্যাগসহ" : "Unused and in original condition with original packaging and tags"}</li>
            <li>{isBn ? "অর্ডার নম্বর ও ক্রয়ের প্রমাণসহ (রসিদ/ইনভয়েস)" : "Accompanied by the order number and proof of purchase (receipt/invoice)"}</li>
            <li>{isBn ? "ত্রুটির ক্ষেত্রে সমস্যার ছবি/ভিডিও প্রমাণসহ" : "Supported by photo/video evidence in case of a defect"}</li>
          </ul>
        </>
      ),
    },
    {
      id: "products",
      title: isBn ? "পণ্য রিফান্ড ও প্রতিস্থাপন" : "Product Refund & Replacement",
      content: (
        <p>
          {isBn
            ? "পণ্য ত্রুটিপূর্ণ, ক্ষতিগ্রস্ত বা ভুল ডেলিভারি হলে বিনামূল্যে প্রতিস্থাপন অথবা সম্পূর্ণ রিফান্ড প্রদান করা হয়। উপযুক্ত ক্ষেত্রে রিটার্ন শিপিং খরচ আমরা বহন করি।"
            : "If a product is defective, damaged or wrongly delivered, we provide a free replacement or full refund. Where applicable, we bear the return shipping cost."}
        </p>
      ),
    },
    {
      id: "custom",
      title: isBn ? "কাস্টম সেবা ও সফটওয়্যার" : "Custom Services & Software",
      content: (
        <p>
          {isBn
            ? "কাস্টম প্রিন্টিং, ডিজাইন ও সফটওয়্যার প্রজেক্টে রিফান্ড কাজের অগ্রগতি ও লিখিত চুক্তির শর্তের ওপর নির্ভর করে। কাজ শুরুর আগে বাতিল করলে অগ্রিমের সমন্বয় করা হয়; সম্পন্ন অংশ রিফান্ডযোগ্য নয়।"
            : "For custom printing, design and software projects, refunds depend on work progress and the written agreement. Cancellation before work begins is adjusted against advances; completed portions are non-refundable."}
        </p>
      ),
    },
    {
      id: "non-refundable",
      title: isBn ? "যা রিফান্ডযোগ্য নয়" : "Non-Refundable Items",
      content: (
        <ul className="list-disc list-inside space-y-1.5">
          <li>{isBn ? "কাস্টমাইজড/পার্সোনালাইজড পণ্য (ত্রুটি ছাড়া)" : "Customized/personalized items (unless defective)"}</li>
          <li>{isBn ? "শুরু হয়ে যাওয়া কাস্টম সেবার সম্পন্ন অংশ" : "Completed portions of custom services already begun"}</li>
          <li>{isBn ? "ডেলিভারি চার্জ (পণ্য ত্রুটিপূর্ণ না হলে)" : "Delivery charges (unless the product was defective)"}</li>
          <li>{isBn ? "৭ দিনের সময়সীমা পেরিয়ে গেলে" : "Requests made after the 7-day window"}</li>
        </ul>
      ),
    },
    {
      id: "process",
      title: isBn ? "রিফান্ড প্রক্রিয়া" : "Refund Process",
      content: (
        <ol className="list-decimal list-inside space-y-2">
          <li>{isBn ? "অর্ডার নম্বর ও সমস্যার বিবরণসহ যোগাযোগ করুন" : "Contact us with your order number and issue description"}</li>
          <li>{isBn ? "আমাদের টিম ২৪–৪৮ ঘণ্টার মধ্যে অনুরোধ যাচাই করবে" : "Our team reviews the request within 24–48 hours"}</li>
          <li>{isBn ? "অনুমোদিত হলে ৩–৭ কর্মদিবসের মধ্যে রিফান্ড সম্পন্ন হবে" : "Approved refunds are processed within 3–7 business days"}</li>
        </ol>
      ),
    },
    {
      id: "method",
      title: isBn ? "রিফান্ড কীভাবে ফেরত আসে" : "How Refunds Are Returned",
      content: (
        <p>
          {isBn
            ? "রিফান্ড সাধারণত মূল পেমেন্ট মাধ্যমেই ফেরত দেওয়া হয় (bKash, Nagad, কার্ড/ব্যাংক)। ক্যাশ-অন-ডেলিভারি অর্ডারের ক্ষেত্রে আপনার নির্দেশিত bKash/Nagad বা ব্যাংক অ্যাকাউন্টে রিফান্ড পাঠানো হয়।"
            : "Refunds are normally returned to the original payment method (bKash, Nagad, card/bank). For Cash on Delivery orders, refunds are sent to your specified bKash/Nagad or bank account."}
        </p>
      ),
    },
    {
      id: "support",
      title: isBn ? "সাপোর্ট" : "Contact Support",
      content: (
        <div className="space-y-2">
          <p>{isBn ? "রিফান্ডের জন্য অর্ডার নম্বর ও প্রমাণসহ যোগাযোগ করুন।" : "Contact us with your order number and proof for refund requests."}</p>
          <Link href="/contact" className="btn btn-outline btn-sm inline-flex">{isBn ? "যোগাযোগ" : "Contact Us"}</Link>
          <a href="https://wa.me/8801825007977" target="_blank" rel="noopener noreferrer" className="btn btn-brand btn-sm inline-flex ml-2">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </div>
      ),
    },
  ];

  return (
    <main>
      <PageHero
        pageKey="refund"
        variant="light"
        title={pageTitle}
        breadcrumbs={[{ label: isBn ? "রিফান্ড" : "Refund" }]}
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
