"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useShowcaseContent } from "@/hooks/useShowcaseContent";
import GlassCard from "@/components/ui/GlassCard";
import { resolveProjectImage } from "@/lib/demoImages";

export default function Portfolio() {
  const { lang } = useLanguageStore();
  const { projects } = useShowcaseContent();
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  return (
    <section id="software" className="py-12 lg:py-16 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-baseline justify-between gap-4 mb-8 lg:mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-heading">
            {lang === "bn" ? "সফটওয়্যার সমাধান" : "Software Solutions"}
          </h2>
          <Link href="/projects" className="text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-300 whitespace-nowrap">
            {lang === "bn" ? "সব সমাধান →" : "View all →"}
          </Link>
        </div>

        {/* Software Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
          {projects.slice(0, 4).map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}`}>
              <GlassCard hover className="overflow-hidden h-full group flex flex-col">
                <div className="relative h-32 sm:h-40 flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/20 p-3 sm:p-4 overflow-hidden">
                  <Image
                    src={resolveProjectImage(p.image)}
                    alt={t(p.title)}
                    fill
                    className="object-contain object-center p-2 transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw"
                  />
                </div>
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-sm sm:text-base text-heading mt-1 line-clamp-2">{t(p.title)}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 flex-1">{t(p.result)}</p>
                  <span className="inline-flex items-center gap-1 text-xs sm:text-sm text-brand-600 dark:text-brand-400 font-medium mt-3 w-fit">
                    {lang === "bn" ? "বিস্তারিত দেখুন" : "Learn more"} <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>

        {/* Software Features Row */}
        <div className="bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: "🎬", label: { en: "Live Demo", bn: "লাইভ ডেমো" } },
              { icon: "🎧", label: { en: "Free Consultation", bn: "ফ্রি কনসালটেশন" } },
              { icon: "🔗", label: { en: "Easy Integration", bn: "সহজ ইন্টিগ্রেশন" } },
              { icon: "24", label: { en: "24/7 Support", bn: "২৪/৭ সাপোর্ট" } },
            ].map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <span className="text-3xl sm:text-4xl mb-2">{feature.icon}</span>
                <p className="text-xs sm:text-sm font-semibold text-heading">
                  {lang === "bn" ? feature.label.bn : feature.label.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
