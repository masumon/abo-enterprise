"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const LANES = [
  { id: "popular", label: { en: "Popular", bn: "জনপ্রিয়" }, icon: "🏆" },
  { id: "deals", label: { en: "Flash Sales", bn: "ফ্ল্যাশ সেল" }, icon: "⚡" },
  { id: "categories", label: { en: "Categories", bn: "ক্যাটেগরি" }, icon: "▤" },
  { id: "reviews", label: { en: "Reviews", bn: "রিভিউ" }, icon: "⭐" },
  { id: "faq", label: { en: "FAQ", bn: "সাধারণ প্রশ্ন" }, icon: "❓" },
  { id: "contact", label: { en: "Contact", bn: "যোগাযোগ" }, icon: "📞" },
];

export default function LaneSwitcher() {
  const { lang } = useLanguageStore();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("popular");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (LANES.some((l) => l.id === id)) {
              setActive(id);
            }
          }
        }
      },
      { threshold: 0.3 }
    );

    LANES.forEach((lane) => {
      const el = document.getElementById(lane.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
      setOpen(false);
    }
  };

  const activeLabel = LANES.find((l) => l.id === active)?.label;

  return (
    <div className="sticky top-[var(--navbar-offset)] z-40 bg-white dark:bg-[var(--surface)] border-b border-gray-100 dark:border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 py-3">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {lang === "bn" ? "এই পৃষ্ঠায়" : "On this page"}
          </span>

          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <span className="text-lg" aria-hidden="true">{LANES.find((l) => l.id === active)?.icon}</span>
              <span className="text-sm font-medium">
                {activeLabel ? (lang === "bn" ? activeLabel.bn : activeLabel.en) : ""}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[var(--surface)] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-50">
                {LANES.map((lane) => (
                  <button
                    key={lane.id}
                    onClick={() => handleScroll(lane.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm font-medium transition-colors ${
                      active === lane.id
                        ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-300"
                        : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-lg" aria-hidden="true">{lane.icon}</span>
                    <span>{lang === "bn" ? lane.label.bn : lane.label.en}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-1 ml-auto">
            {LANES.map((lane) => (
              <button
                key={lane.id}
                onClick={() => handleScroll(lane.id)}
                title={lang === "bn" ? lane.label.bn : lane.label.en}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                  active === lane.id
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20"
                }`}
                aria-label={lang === "bn" ? lane.label.bn : lane.label.en}
              >
                <span aria-hidden="true">{lane.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
