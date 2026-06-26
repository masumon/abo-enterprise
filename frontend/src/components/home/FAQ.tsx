"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const FAQS = [
  {
    q: { en: "What products do you sell?",              bn: "আপনারা কী কী পণ্য বিক্রি করেন?" },
    a: { en: "We sell mobile accessories, phone cases, chargers, cables, power banks, gadgets and more. Delivery available across Sylhet.", bn: "আমরা মোবাইল এক্সেসরিজ, ফোন কেস, চার্জার, কেবল, পাওয়ার ব্যাংক, গ্যাজেট ও আরও অনেক পণ্য বিক্রি করি। সিলেটে ডেলিভারি পাওয়া যায়।" },
  },
  {
    q: { en: "How can I book a service?",               bn: "কিভাবে সেবা বুক করব?" },
    a: { en: "Click 'Book a Service', fill the form with your details and requirements. We'll confirm within 2-4 hours.", bn: "'সেবা বুক করুন' ক্লিক করুন, ফর্মে আপনার তথ্য ও প্রয়োজন লিখুন। আমরা ২-৪ ঘন্টার মধ্যে নিশ্চিত করব।" },
  },
  {
    q: { en: "Do you develop custom software?",        bn: "আপনারা কি কাস্টম সফটওয়্যার বানান?" },
    a: { en: "Yes! We build POS, ERP, CRM, school/hospital management systems, AI chatbots and any custom software your business needs.", bn: "হ্যাঁ! আমরা POS, ERP, CRM, স্কুল/হাসপাতাল ম্যানেজমেন্ট সিস্টেম, AI চ্যাটবট এবং আপনার ব্যবসার যেকোনো কাস্টম সফটওয়্যার তৈরি করি।" },
  },
  {
    q: { en: "What are your payment methods?",         bn: "পেমেন্টের পদ্ধতি কী কী?" },
    a: { en: "We accept bKash, Nagad, bank transfer and cash on delivery (for products in Sylhet).", bn: "আমরা bKash, Nagad, ব্যাংক ট্রান্সফার এবং ক্যাশ অন ডেলিভারি (সিলেটে পণ্যের জন্য) গ্রহণ করি।" },
  },
  {
    q: { en: "How long does software development take?", bn: "সফটওয়্যার ডেভেলপমেন্ট কতদিন লাগে?" },
    a: { en: "Simple projects take 1-2 weeks, medium projects 1-2 months, and complex enterprise systems 2-4 months. We always provide a timeline before starting.", bn: "সহজ প্রজেক্ট ১-২ সপ্তাহ, মাঝারি প্রজেক্ট ১-২ মাস এবং জটিল এন্টারপ্রাইজ সিস্টেম ২-৪ মাস লাগে। শুরু করার আগে আমরা সবসময় টাইমলাইন দিই।" },
  },
  {
    q: { en: "Do you offer after-sales support?",      bn: "বিক্রয়ের পর সাপোর্ট দেন কি?" },
    a: { en: "Yes! All software projects include 3 months free support. Products have 7-day return policy for defects.", bn: "হ্যাঁ! সব সফটওয়্যার প্রজেক্টে ৩ মাস ফ্রি সাপোর্ট আছে। পণ্যে ত্রুটি থাকলে ৭ দিনের রিটার্ন পলিসি আছে।" },
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const { lang } = useLanguageStore();

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {lang === "bn" ? "সাধারণ প্রশ্ন ও উত্তর" : "Frequently Asked Questions"}
          </h2>
          <p className="text-gray-500 text-sm">
            {lang === "bn" ? "আপনার প্রশ্নের উত্তর না পেলে WhatsApp-এ জিজ্ঞেস করুন।" : "Can't find your answer? Ask us on WhatsApp."}
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-gray-900 hover:text-brand-700 transition-colors"
                aria-expanded={open === i ? "true" : "false"}
              >
                <span>{lang === "bn" ? faq.q.bn : faq.q.en}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-50">
                  <p className="pt-3">{lang === "bn" ? faq.a.bn : faq.a.en}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
