"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";

export default function RefundPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";

  const sections: LegalSection[] = [
    {
      id: "products",
      title: isBn ? "পণ্য রিফান্ড" : "Product Refunds",
      content: <p>{isBn ? "পণ্যে ত্রুটি থাকলে ৭ দিনের মধ্যে রিফান্ড বা প্রতিস্থাপন করা হয়।" : "Defective products qualify for refund or replacement within 7 days."}</p>,
    },
    {
      id: "custom",
      title: isBn ? "কাস্টম সেবা" : "Custom Services",
      content: <p>{isBn ? "কাস্টম প্রিন্টিং ও সফটওয়্যার প্রজেক্টে রিফান্ড প্রজেক্টের অগ্রগতির উপর নির্ভর করে।" : "Custom printing and software project refunds depend on project progress."}</p>,
    },
    {
      id: "process",
      title: isBn ? "রিফান্ড প্রক্রিয়া" : "Refund Process",
      content: (
        <ol className="list-decimal list-inside space-y-2">
          <li>{isBn ? "অর্ডার নম্বর ও সমস্যার বিবরণ দিন" : "Provide order number and issue description"}</li>
          <li>{isBn ? "আমাদের টিম ২৪-৪৮ ঘণ্টায় যাচাই করবে" : "Our team reviews within 24-48 hours"}</li>
          <li>{isBn ? "অনুমোদিত হলে ৩-৭ কর্মদিবসে রিফান্ড" : "Approved refunds processed in 3-7 business days"}</li>
        </ol>
      ),
    },
    {
      id: "support",
      title: isBn ? "সাপোর্ট" : "Contact Support",
      content: (
        <div className="space-y-2">
          <p>{isBn ? "রিফান্ডের জন্য অর্ডার নম্বর ও প্রমাণসহ যোগাযোগ করুন।" : "Contact us with order number and proof for refund requests."}</p>
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
        title={isBn ? "রিফান্ড নীতি" : "Refund Policy"}
        breadcrumbs={[{ label: isBn ? "রিফান্ড" : "Refund" }]}
        variant="light"
      />
      <LegalPageLayout title={isBn ? "রিফান্ড নীতি" : "Refund Policy"} sections={sections} showTitle={false} />
    </main>
  );
}
