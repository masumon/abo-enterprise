"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PlayCircle, Headphones, Link2, Clock, Code2 } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useShowcaseContent } from "@/hooks/useShowcaseContent";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { toBdWhatsappHref } from "@/lib/phone";
import GlassCard from "@/components/ui/GlassCard";

const FEATURES = [
  { Icon: PlayCircle, label: { en: "Live Demo", bn: "লাইভ ডেমো" }, href: "/projects", external: false, tint: "from-brand-500/15 to-brand-500/5", iconColor: "text-brand-600 dark:text-brand-300" },
  { Icon: Headphones, label: { en: "Free Consultation", bn: "ফ্রি কনসালটেশন" }, href: "/contact", external: false, tint: "from-accent-500/15 to-accent-500/5", iconColor: "text-accent-600 dark:text-accent-300" },
  { Icon: Link2, label: { en: "Easy Integration", bn: "সহজ ইন্টিগ্রেশন" }, href: "/services", external: false, tint: "from-brand-500/15 to-brand-500/5", iconColor: "text-brand-600 dark:text-brand-300" },
  { Icon: Clock, label: { en: "24/7 Support", bn: "২৪/৭ সাপোর্ট" }, href: "__whatsapp__", external: true, tint: "from-accent-500/15 to-accent-500/5", iconColor: "text-accent-600 dark:text-accent-300" },
] as const;

export default function Portfolio() {
  const { lang } = useLanguageStore();
  const { projects } = useShowcaseContent();
  const { settings } = usePublicSettings(["whatsapp_number", "contact_phone"]);
  const whatsappNumber = getSettingValue(settings, "whatsapp_number") || getSettingValue(settings, "contact_phone");
  const whatsappHref = toBdWhatsappHref(whatsappNumber);
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  return (
    <section className="py-5 lg:py-7 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8 lg:mb-10">
          <div>
            <span className="inline-block text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent mb-1">
              {lang === "bn" ? "সফটওয়্যার" : "Software"}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-heading tracking-tight leading-tight">
              {lang === "bn" ? "সফটওয়্যার সমাধান" : "Software Solutions"}
            </h2>
          </div>
          <Link href="/projects" className="group inline-flex items-center gap-1.5 flex-shrink-0 rounded-full border border-[var(--line)] bg-white dark:bg-white/5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-300 shadow-sm hover:shadow-md hover:border-brand-200 hover:-translate-y-0.5 transition-all whitespace-nowrap">
            {lang === "bn" ? "সব সমাধান" : "View all"}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-8 sm:mb-10">
          {projects.slice(0, 4).map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}`}>
              <GlassCard hover className="overflow-hidden h-full group flex flex-col rounded-2xl sm:rounded-3xl group-hover:shadow-xl group-hover:shadow-brand-500/10 group-hover:-translate-y-1.5 transition-all duration-300">
                <div className="relative h-32 sm:h-44 overflow-hidden">
                  {p.image?.trim() ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/20 p-3 sm:p-4">
                      <Image
                        src={p.image}
                        alt={t(p.title)}
                        fill
                        className="object-contain object-center p-2 transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw"
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex items-center justify-center overflow-hidden">
                      <span aria-hidden className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-accent-500/15 blur-2xl" />
                      <span aria-hidden className="absolute -bottom-5 -left-3 text-white/[0.06] font-black text-[6.5rem] leading-none select-none">
                        {t(p.title).charAt(0)}
                      </span>
                      <span className="relative w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                        <Code2 className="w-7 h-7 text-accent-400" aria-hidden />
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-sm sm:text-lg text-heading mt-0.5 line-clamp-2 leading-snug group-hover:text-brand-600 transition-colors">{t(p.title)}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 flex-1">{t(p.result)}</p>
                  <span className="inline-flex items-center gap-1 text-xs sm:text-sm text-brand-600 dark:text-brand-400 font-semibold mt-3 w-fit group-hover:gap-2 transition-all">
                    {lang === "bn" ? "বিস্তারিত দেখুন" : "Learn more"} <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>

        <div className="bg-gradient-to-r from-brand-50 to-accent-50 dark:from-brand-900/20 dark:to-accent-900/10 rounded-2xl p-4 sm:p-6">
          <div className="marquee-viewport">
            <div className="marquee-track gap-3 sm:gap-4 py-0.5" style={{ ["--marquee-duration" as string]: "22s" }}>
              {[...FEATURES, ...FEATURES].map((feature, idx) => {
                const href = feature.external ? whatsappHref : feature.href;
                const dup = idx >= FEATURES.length;
                const FeatureIcon = feature.Icon;
                const inner = (
                  <>
                    <span className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${feature.tint} mb-2.5 group-hover:scale-110 transition-transform`}>
                      <FeatureIcon className={`w-6 h-6 sm:w-7 sm:h-7 ${feature.iconColor}`} strokeWidth={2.2} aria-hidden />
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-heading leading-tight whitespace-nowrap">
                      {lang === "bn" ? feature.label.bn : feature.label.en}
                    </p>
                  </>
                );
                const className = "group flex-shrink-0 w-[8.5rem] sm:w-[11rem] flex flex-col items-center text-center rounded-2xl px-3 py-4 sm:py-5 bg-white/70 dark:bg-white/5 border border-[var(--line)] shadow-sm hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-1 hover:border-brand-200 transition-all touch-manipulation";
                if (!href) {
                  return <div key={idx} aria-hidden={dup} className={className}>{inner}</div>;
                }
                return feature.external ? (
                  <a key={idx} href={href} target="_blank" rel="noopener noreferrer" aria-hidden={dup} tabIndex={dup ? -1 : 0} className={className}>
                    {inner}
                  </a>
                ) : (
                  <Link key={idx} href={href} aria-hidden={dup} tabIndex={dup ? -1 : 0} className={className}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
