"use client";

import Link from "next/link";
import { useLanguageStore } from "@/store/language";
import SectionHeader from "@/components/ui/SectionHeader";
import Accordion from "@/components/ui/Accordion";
import { resolveFaqItems } from "@/lib/data/faq";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_FAQ_KEY } from "@/lib/cmsContent";

export default function FAQ() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_FAQ_KEY]);

  const items = resolveFaqItems(settings).slice(0, 6).map((faq, i) => ({
    id: `home-faq-${i}`,
    question: lang === "bn" ? faq.q.bn : faq.q.en,
    answer: lang === "bn" ? faq.a.bn : faq.a.en,
  }));

  return (
    <section className="py-5 lg:py-7 bg-gradient-to-b from-gray-50 to-white dark:from-white/5 dark:to-[var(--surface)]">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-heading mb-2">
            {lang === "bn" ? "সাধারণ প্রশ্ন ও উত্তর" : "Frequently Asked Questions"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            {lang === "bn"
              ? "আপনার প্রশ্নের উত্তর এখানে খুঁজুন। না পেলে WhatsApp-এ যোগাযোগ করুন।"
              : "Find answers to common questions. Can't find yours? Reach us on WhatsApp."}
          </p>
        </div>
        <Accordion items={items} />
        <div className="text-center mt-8">
          <Link href="/faq" className="btn btn-outline btn-sm">
            {lang === "bn" ? "সব প্রশ্ন দেখুন" : "View all FAQs"}
          </Link>
        </div>
      </div>
    </section>
  );
}
