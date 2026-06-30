"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MessageCircle } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import Accordion from "@/components/ui/Accordion";
import { FAQ_ITEMS, FAQ_CATEGORIES } from "@/lib/data/faq";

export default function FaqClient() {
  const { lang } = useLanguageStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchCat = category === "all" || item.category === category;
      if (!q) return matchCat;
      const text = `${item.q.en} ${item.q.bn} ${item.a.en} ${item.a.bn}`.toLowerCase();
      return matchCat && text.includes(q);
    });
  }, [query, category]);

  const accordionItems = filtered.map((item, i) => ({
    id: `faq-${i}`,
    question: lang === "bn" ? item.q.bn : item.q.en,
    answer: lang === "bn" ? item.a.bn : item.a.en,
  }));

  return (
    <main>
      <PageHero
        pageKey="faq"
        title={lang === "bn" ? "সাধারণ প্রশ্ন ও উত্তর" : "Frequently Asked Questions"}
        subtitle={lang === "bn" ? "আপনার প্রশ্নের উত্তর খুঁজুন" : "Find answers to common questions"}
        breadcrumbs={[{ label: "FAQ" }]}
      />

      <section className="enterprise-section">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "bn" ? "প্রশ্ন খুঁজুন..." : "Search questions..."}
              className="input pl-11"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {FAQ_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  category === cat.id
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 dark:bg-white/10 text-muted hover:bg-brand-50 dark:hover:bg-brand-900/30"
                }`}
              >
                {lang === "bn" ? cat.label.bn : cat.label.en}
              </button>
            ))}
          </div>

          {accordionItems.length > 0 ? (
            <Accordion items={accordionItems} />
          ) : (
            <p className="text-center text-muted py-8">
              {lang === "bn" ? "কোনো প্রশ্ন পাওয়া যায়নি" : "No questions found"}
            </p>
          )}

          <div className="enterprise-card p-6 mt-10 text-center">
            <p className="text-sm text-muted mb-4">
              {lang === "bn" ? "উত্তর না পেলে সরাসরি যোগাযোগ করুন" : "Can't find your answer? Contact us directly"}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="https://wa.me/8801825007977" target="_blank" rel="noopener noreferrer" className="btn btn-brand btn-sm">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
              <Link href="/contact" className="btn btn-outline btn-sm">
                {lang === "bn" ? "যোগাযোগ" : "Contact"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
