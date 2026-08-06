"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useShowcaseContent } from "@/hooks/useShowcaseContent";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { toBdWhatsappHref } from "@/lib/phone";
import GlassCard from "@/components/ui/GlassCard";
import { resolveProjectImage } from "@/lib/demoImages";

// The four promise tiles under the software listing. Each one navigates:
// Live Demo / Easy Integration point at the listings this section is about,
// Free Consultation is the contact form, and 24/7 Support opens WhatsApp —
// a real, always-on channel rather than a page. Each also carries a tint so
// the row reads as a set of premium, tappable cards. `href` may be an internal
// route or an external URL; `external` marks the WhatsApp one for a new tab.
const FEATURES = [
  { icon: "🎬", label: { en: "Live Demo", bn: "লাইভ ডেমো" }, href: "/projects", external: false, tint: "from-fuchsia-500/15 to-fuchsia-500/5" },
  { icon: "🎧", label: { en: "Free Consultation", bn: "ফ্রি কনসালটেশন" }, href: "/contact", external: false, tint: "from-brand-500/15 to-brand-500/5" },
  { icon: "🔗", label: { en: "Easy Integration", bn: "সহজ ইন্টিগ্রেশন" }, href: "/services", external: false, tint: "from-emerald-500/15 to-emerald-500/5" },
  { icon: "24", label: { en: "24/7 Support", bn: "২৪/৭ সাপোর্ট" }, href: "__whatsapp__", external: true, tint: "from-amber-500/15 to-amber-500/5" },
] as const;

export default function Portfolio() {
  const { lang } = useLanguageStore();
  const { projects } = useShowcaseContent();
  const { settings } = usePublicSettings(["whatsapp_number", "contact_phone"]);
  const whatsappHref = toBdWhatsappHref(
    getSettingValue(settings, "whatsapp_number", getSettingValue(settings, "contact_phone", "01825007977"))
  );
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  return (
    <section id="software" className="py-5 lg:py-7 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8 lg:mb-10">
          <div>
            <span className="inline-block text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase bg-gradient-to-r from-brand-600 to-fuchsia-600 bg-clip-text text-transparent mb-1">
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

        {/* Software Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-8 sm:mb-10">
          {projects.slice(0, 4).map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}`}>
              <GlassCard hover className="overflow-hidden h-full group flex flex-col rounded-2xl sm:rounded-3xl group-hover:shadow-xl group-hover:shadow-brand-500/10 group-hover:-translate-y-1.5 transition-all duration-300">
                <div className="relative h-32 sm:h-44 flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/20 p-3 sm:p-4 overflow-hidden">
                  <Image
                    src={resolveProjectImage(p.image)}
                    alt={t(p.title)}
                    fill
                    className="object-contain object-center p-2 transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw"
                  />
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

        {/* Software Features Row — four tappable promise cards, side by side
            with horizontal scroll on phones (a snap rail) and evenly spread
            from sm up. 24/7 Support opens WhatsApp. */}
        <div className="bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-2xl p-4 sm:p-6">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FEATURES.map((feature, idx) => {
              const href = feature.href === "__whatsapp__" ? whatsappHref : feature.href;
              const inner = (
                <>
                  <span className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${feature.tint} text-2xl sm:text-3xl font-extrabold text-heading mb-2.5 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-heading leading-tight">
                    {lang === "bn" ? feature.label.bn : feature.label.en}
                  </p>
                </>
              );
              const className = "group snap-start flex-shrink-0 w-[7.5rem] sm:w-auto sm:flex-1 flex flex-col items-center text-center rounded-2xl px-3 py-4 sm:py-5 bg-white/70 dark:bg-white/5 border border-[var(--line)] shadow-sm hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-1 hover:border-brand-200 transition-all touch-manipulation";
              return feature.external ? (
                <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className={className}>
                  {inner}
                </a>
              ) : (
                <Link key={idx} href={href} className={className}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
