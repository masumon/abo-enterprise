"use client";

import { useEffect, useState } from "react";
import { useLanguageStore } from "@/store/language";
import { Shield, Truck, Lock, RotateCcw, Award, Headphones, type LucideIcon } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, A11y } from "swiper/modules";
import "swiper/css";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_WHY_CHOOSE_KEY, getWhyChooseReasons, type CmsReason } from "@/lib/cmsContent";

/** Icon names usable from the admin JSON (site_why_choose_json). Keeps the
 * original six icons so the default (no admin override) look is unchanged. */
const ICONS: Record<string, LucideIcon> = {
  shield: Shield,
  truck: Truck,
  lock: Lock,
  "rotate-ccw": RotateCcw,
  award: Award,
  headphones: Headphones,
};

/** Cosmetic accent per card — cycles by position since the CMS JSON only
 * carries an icon name, not a color. */
// Brand + gold alternation so the row stays lively but on-brand with the rest
// of the homepage (was a green/blue/purple/orange/yellow/red mix that clashed).
const COLORS = [
  { color: "text-brand-600 dark:text-brand-300", bgColor: "bg-brand-50 dark:bg-brand-500/10" },
  { color: "text-accent-600 dark:text-accent-300", bgColor: "bg-accent-50 dark:bg-accent-500/15" },
  { color: "text-brand-700 dark:text-brand-200", bgColor: "bg-brand-100 dark:bg-brand-500/15" },
  { color: "text-accent-700 dark:text-accent-200", bgColor: "bg-accent-100 dark:bg-accent-500/20" },
  { color: "text-brand-600 dark:text-brand-300", bgColor: "bg-brand-50 dark:bg-brand-500/10" },
  { color: "text-accent-600 dark:text-accent-300", bgColor: "bg-accent-50 dark:bg-accent-500/15" },
];

const FALLBACK: CmsReason[] = [
  {
    icon: "shield",
    title_en: "100% Original Products", title_bn: "১০০% অরিজিনাল প্রোডাক্ট",
    desc_en: "We guarantee 100% original and authentic products for all customers.",
    desc_bn: "আমরা সব গ্রাহকের জন্য ১০০% অরিজিনাল এবং খাঁটি পণ্যের গ্যারান্টি দিই।",
  },
  {
    icon: "truck",
    title_en: "Free Delivery in Sylhet", title_bn: "সিলেটে ফ্রি ডেলিভারি",
    desc_en: "Free delivery on orders above 2000 tk in Sylhet area and surrounding regions.",
    desc_bn: "সিলেট এলাকায় ২০০০ টাকার উপরে অর্ডারে ফ্রি ডেলিভারি।",
  },
  {
    icon: "lock",
    title_en: "Secure Payment", title_bn: "নিরাপদ পেমেন্ট",
    desc_en: "Your payment information is always secure and encrypted with SSL technology.",
    desc_bn: "আপনার পেমেন্ট তথ্য সর্বদা নিরাপদ এবং SSL প্রযুক্তি দ্বারা এনক্রিপ্ট করা।",
  },
  {
    icon: "rotate-ccw",
    title_en: "Easy Returns", title_bn: "সহজ রিটার্ন নীতি",
    desc_en: "7-day easy return policy if you're not satisfied with your purchase.",
    desc_bn: "যদি সন্তুষ্ট না হন তাহলে ৭ দিনের মধ্যে সহজ রিটার্ন নীতি।",
  },
  {
    icon: "award",
    title_en: "Warranty Support", title_bn: "ওয়ারেন্টি সাপোর্ট",
    desc_en: "Extended warranty and after-sales support for all electronic products.",
    desc_bn: "সব ইলেকট্রনিক্স পণ্যের জন্য সম্প্রসারিত ওয়ারেন্টি এবং আফটার সেল সাপোর্ট।",
  },
  {
    icon: "headphones",
    title_en: "24/7 Customer Support", title_bn: "২৪/৭ কাস্টমার সাপোর্ট",
    desc_en: "Our support team is available 24/7 to help you with any queries.",
    desc_bn: "আমাদের সাপোর্ট টিম ২৪/৭ আপনার যেকোনো প্রশ্নের উত্তর দিতে প্রস্তুত।",
  },
];

export default function WhyChooseUsCards() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_WHY_CHOOSE_KEY]);
  const reasons = getWhyChooseReasons(settings, FALLBACK);

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return (
    <section className="py-5 lg:py-7 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="text-4xl" aria-hidden>⭐</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-heading mb-4">
            {lang === "bn" ? "কেন আমাদের বেছে নেবেন?" : "Why Choose Us?"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
            {lang === "bn"
              ? "আমরা আপনার বিশ্বাস এবং সন্তুষ্টিকে সর্বোচ্চ অগ্রাধিকার দিই।"
              : "We prioritize your trust and satisfaction above everything else."}
          </p>
        </div>

        {/* Cards — same content, auto-scrolling carousel instead of a static
            grid. slidesPerView mirrors the prior grid-cols-2/lg:grid-cols-3
            so the at-rest look is unchanged; loop+autoplay add the motion,
            touch/drag swipe come from Swiper itself. */}
        <Swiper
          modules={[Autoplay, A11y]}
          slidesPerView={2}
          spaceBetween={12}
          loop
          autoplay={reduceMotion ? false : { delay: 2600, disableOnInteraction: false, pauseOnMouseEnter: true }}
          speed={900}
          grabCursor
          breakpoints={{
            1024: { slidesPerView: 3, spaceBetween: 24 },
          }}
          className="why-choose-swiper !pb-1"
        >
          {reasons.map((reason, i) => {
            // Known lucide name → icon component; anything else (an admin-picked
            // emoji/text) renders literally; empty → Shield default.
            const known = ICONS[reason.icon ?? ""];
            const Icon = known ?? (reason.icon ? null : Shield);
            const { color, bgColor } = COLORS[i % COLORS.length];
            const title = lang === "bn" ? reason.title_bn || reason.title_en : reason.title_en || reason.title_bn;
            const desc = lang === "bn" ? reason.desc_bn || reason.desc_en : reason.desc_en || reason.desc_bn;
            return (
              <SwiperSlide key={`${reason.title_en || reason.title_bn}-${i}`} className="!h-auto">
                <GlassCard hover className="h-full flex flex-col items-start gap-3 sm:gap-4 p-4 sm:p-6">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl ${bgColor} flex items-center justify-center`}>
                    {Icon ? (
                      <Icon className={`w-5 h-5 sm:w-7 sm:h-7 ${color}`} aria-hidden />
                    ) : (
                      <span className={`text-xl sm:text-2xl ${color}`} aria-hidden>{reason.icon}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-lg text-heading mb-1 sm:mb-2">{title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                </GlassCard>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
}
