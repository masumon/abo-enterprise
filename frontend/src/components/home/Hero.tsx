"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, ShoppingBag, ArrowRight, Zap } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

export default function Hero() {
  const { lang } = useLanguageStore();
  const t = useT();

  return (
    <section className="gradient-hero min-h-[92vh] flex items-center relative overflow-hidden -mt-[6.25rem] pt-[6.25rem]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white space-y-6 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 glass-panel rounded-full text-sm font-medium">
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              {t("hero_badge")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-balance">
              {t("hero_title_1")}<br />
              <span className="text-yellow-300">{t("hero_title_2")}</span><br />
              {t("hero_title_3")}
            </h1>

            <p className="text-white/80 text-lg max-w-lg leading-relaxed">
              {t("hero_sub")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/services" className="btn btn-lg bg-white text-brand-700 hover:bg-gray-50 shadow-lg btn-ripple">
                <Calendar className="w-5 h-5" />
                {t("hero_cta_services")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/products" className="btn btn-lg btn-glass btn-ripple">
                <ShoppingBag className="w-5 h-5" />
                {t("hero_cta_products")}
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center animate-fade-in">
            <div className="relative w-full max-w-md">
              <div className="glass-panel rounded-3xl p-6 shadow-2xl border border-white/20">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Image
                      src="https://i.ibb.co.com/pjY3wvG9/1769284089412.png"
                      alt="ABO Enterprise"
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-white/30"
                    />
                    <div>
                      <p className="text-white font-semibold text-sm">ABO Enterprise</p>
                      <p className="text-white/60 text-xs">
                        {lang === "bn" ? "এন্টারপ্রাইজ ড্যাশবোর্ড" : "Enterprise Dashboard"}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-green-300 font-medium bg-green-500/20 px-2.5 py-1 rounded-full border border-green-500/30">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Live
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: lang === "bn" ? "অর্ডার" : "Orders", end: 128, suffix: "+", icon: "📦" },
                    { label: lang === "bn" ? "সেবা" : "Services", end: 12, suffix: "+", icon: "⚙️" },
                    { label: lang === "bn" ? "গ্রাহক" : "Clients", end: 500, suffix: "+", icon: "👥" },
                    { label: lang === "bn" ? "প্রজেক্ট" : "Projects", end: 50, suffix: "+", icon: "🚀" },
                  ].map((item) => (
                    <div key={item.label} className="glass-panel rounded-xl p-3.5 animate-scale-in">
                      <span className="text-xl">{item.icon}</span>
                      <p className="text-white font-bold text-lg mt-1">
                        <AnimatedCounter end={item.end} suffix={item.suffix} />
                      </p>
                      <p className="text-white/60 text-xs">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
                    {lang === "bn" ? "সাম্প্রতিক কার্যক্রম" : "Recent Activity"}
                  </p>
                  {[
                    { icon: "🛒", text: lang === "bn" ? "নতুন অর্ডার" : "New order received", time: "2m" },
                    { icon: "📅", text: lang === "bn" ? "সেবা বুকিং নিশ্চিত" : "Booking confirmed", time: "15m" },
                    { icon: "💼", text: lang === "bn" ? "ERP জিজ্ঞাসা" : "ERP inquiry", time: "1h" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
                      <span>{item.icon}</span>
                      <span className="text-xs flex-1 text-white/80">{item.text}</span>
                      <span className="text-white/40 text-[10px]">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-glass px-3 py-2 flex items-center gap-2 animate-float">
                <span className="text-lg">🤖</span>
                <div>
                  <p className="text-gray-900 text-xs font-semibold">AI Ready</p>
                  <p className="text-gray-400 text-[10px]">Enterprise</p>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-glass px-3 py-2 flex items-center gap-2 animate-float" style={{ animationDelay: "1s" }}>
                <span className="text-lg">⚡</span>
                <div>
                  <p className="text-gray-900 text-xs font-semibold">
                    {lang === "bn" ? "দ্রুত ডেলিভারি" : "Fast Delivery"}
                  </p>
                  <p className="text-gray-400 text-[10px]">Sylhet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" className="w-full">
          <path d="M0 60L48 52C96 44 192 28 288 24C384 20 480 28 576 36C672 44 768 52 864 48C960 44 1056 28 1152 24C1248 20 1344 28 1392 32L1440 36V60H0Z" fill="var(--surface, #fafbff)"/>
        </svg>
      </div>
    </section>
  );
}
