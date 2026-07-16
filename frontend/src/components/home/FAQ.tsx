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
    <section className="enterprise-section-alt">
      <div className="container mx-auto px-4 max-w-3xl">
        <SectionHeader
          title={lang === "bn" ? "সাধারণ প্রশ্ন ও উত্তর" : "Frequently Asked Questions"}
          subtitle={lang === "bn" ? "আপনার প্রশ্নের উত্তর না পেলে WhatsApp-এ জিজ্ঞেস করুন।" : "Can't find your answer? Ask us on WhatsApp."}
        />
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
