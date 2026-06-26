"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Zap, Bot, Code } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";

const TAGS = [
  { icon: ShoppingBag, label: { en: "Products", bn: "পণ্য" } },
  { icon: Code, label: { en: "Software", bn: "সফটওয়্যার" } },
  { icon: Bot, label: { en: "AI Solutions", bn: "AI সমাধান" } },
  { icon: Zap, label: { en: "Automation", bn: "অটোমেশন" } },
];

export default function Hero() {
  const { lang } = useLanguageStore();
  const { openCart } = useCartStore();

  return (
    <section className="gradient-hero min-h-[88vh] flex items-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-accent-500/10 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-3xl mx-auto text-center text-white">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-28 h-28 rounded-full border-4 border-white/30 bg-white/10 backdrop-blur-sm p-2 animate-float shadow-2xl">
                <Image
                  src="https://i.ibb.co.com/pjY3wvG9/1769284089412.png"
                  alt="ABO Enterprise"
                  width={108}
                  height={108}
                  className="rounded-full object-cover"
                  priority
                />
              </div>
              <span className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4 text-balance">
            {lang === "bn" ? (
              <>ABO Enterprise</>
            ) : (
              <>ABO Enterprise</>
            )}
          </h1>

          <p className="text-lg sm:text-xl text-white/80 mb-3 font-medium">
            {lang === "bn"
              ? "বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম"
              : "Bangladesh's Complete Technology Ecosystem"}
          </p>

          <p className="text-white/65 text-base mb-8 max-w-xl mx-auto">
            {lang === "bn"
              ? "মোবাইল এক্সেসরিজ থেকে AI সমাধান, সফটওয়্যার থেকে আইনি সেবা — সবকিছু এক জায়গায়।"
              : "From mobile accessories to AI solutions, custom software to legal services — everything in one place."}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {TAGS.map(({ icon: Icon, label }) => (
              <span
                key={label.en}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium border border-white/20"
              >
                <Icon className="w-3.5 h-3.5" />
                {lang === "bn" ? label.bn : label.en}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/products" className="btn btn-primary btn-lg shadow-lg hover:shadow-accent-500/30">
              <ShoppingBag className="w-5 h-5" />
              {lang === "bn" ? "পণ্য দেখুন" : "Shop Products"}
            </Link>
            <Link href="/services/software" className="btn btn-lg bg-white/15 text-white border border-white/30 hover:bg-white/25 backdrop-blur-sm">
              {lang === "bn" ? "AI ও সফটওয়্যার সেবা" : "AI & Software Services"}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 80L48 69.3C96 58.7 192 37.3 288 32C384 26.7 480 37.3 576 48C672 58.7 768 69.3 864 64C960 58.7 1056 37.3 1152 32C1248 26.7 1344 37.3 1392 42.7L1440 48V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z" fill="white"/>
        </svg>
      </div>
    </section>
  );
}
