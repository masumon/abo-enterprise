"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Calendar, Briefcase, ArrowRight, Zap, Bot, Code, Printer, Scale, Star } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const FEATURES = [
  { icon: ShoppingBag, label: { en: "Products & Accessories", bn: "পণ্য ও এক্সেসরিজ" } },
  { icon: Code,        label: { en: "Software & ERP / CRM",  bn: "সফটওয়্যার ও ERP/CRM" } },
  { icon: Bot,         label: { en: "AI & Automation",       bn: "AI ও অটোমেশন" } },
  { icon: Printer,     label: { en: "Printing Services",     bn: "প্রিন্টিং সেবা" } },
  { icon: Scale,       label: { en: "Legal Case Writing",    bn: "আইনি কেস রাইটিং" } },
];

const STATS = [
  { value: "500+", label: { en: "Happy Clients", bn: "সন্তুষ্ট গ্রাহক" } },
  { value: "12+",  label: { en: "Services",      bn: "সেবা" } },
  { value: "5★",   label: { en: "Rated",         bn: "রেটিং" } },
];

export default function Hero() {
  const { lang } = useLanguageStore();

  return (
    <section className="gradient-hero min-h-[90vh] flex items-center relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-400/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* ─── LEFT SIDE ─── */}
          <div className="text-white space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-sm font-medium">
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              {lang === "bn" ? "বাংলাদেশের সম্পূর্ণ টেক ইকোসিস্টেম" : "Bangladesh's Complete Tech Ecosystem"}
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              {lang === "bn" ? (
                <>
                  আপনার ব্যবসার<br />
                  <span className="text-yellow-300">সব সমাধান</span><br />
                  এক জায়গায়
                </>
              ) : (
                <>
                  Everything Your<br />
                  <span className="text-yellow-300">Business Needs</span><br />
                  In One Place
                </>
              )}
            </h1>

            {/* Features list */}
            <ul className="space-y-2.5">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label.en} className="flex items-center gap-3 text-white/85 text-sm">
                  <span className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </span>
                  {lang === "bn" ? label.bn : label.en}
                </li>
              ))}
            </ul>

            {/* 3 CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/products"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-brand-700 font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                <ShoppingBag className="w-[18px] h-[18px]" />
                {lang === "bn" ? "পণ্য দেখুন" : "Shop Products"}
              </Link>
              <Link
                href="/services"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/15 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/25 transition-all backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0"
              >
                <Calendar className="w-[18px] h-[18px]" />
                {lang === "bn" ? "সেবা বুক করুন" : "Book a Service"}
              </Link>
              <Link
                href="/projects"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-accent-500/80 text-white font-semibold rounded-xl border border-accent-400/50 hover:bg-accent-500 transition-all backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0"
              >
                <Briefcase className="w-[18px] h-[18px]" />
                {lang === "bn" ? "কোটেশন নিন" : "Get a Quote"}
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 pt-2 border-t border-white/15">
              {STATS.map((stat) => (
                <div key={stat.value} className="text-center">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/60 text-xs">{lang === "bn" ? stat.label.bn : stat.label.en}</div>
                </div>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
              </div>
            </div>
          </div>

          {/* ─── RIGHT SIDE — Dashboard Mockup ─── */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-md">
              {/* Main card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
                {/* Mockup header */}
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
                      <p className="text-white/60 text-xs">Digital Ecosystem</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-green-300 font-medium bg-green-500/20 px-2.5 py-1 rounded-full border border-green-500/30">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Live
                  </span>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "Products", value: "500+", color: "from-blue-500/30 to-blue-600/20", icon: "📦" },
                    { label: "Services", value: "12+",  color: "from-green-500/30 to-green-600/20", icon: "⚙️" },
                    { label: "Clients",  value: "500+", color: "from-purple-500/30 to-purple-600/20", icon: "👥" },
                    { label: "Projects", value: "50+",  color: "from-orange-500/30 to-orange-600/20", icon: "🚀" },
                  ].map((item) => (
                    <div key={item.label} className={`bg-gradient-to-br ${item.color} rounded-xl p-3.5 border border-white/10`}>
                      <span className="text-xl">{item.icon}</span>
                      <p className="text-white font-bold text-lg mt-1">{item.value}</p>
                      <p className="text-white/60 text-xs">{item.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent activity */}
                <div className="space-y-2">
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2">Recent Activity</p>
                  {[
                    { icon: "🛒", text: "New order received", time: "2m ago", color: "text-blue-300" },
                    { icon: "📅", text: "Service booking confirmed", time: "15m ago", color: "text-green-300" },
                    { icon: "💼", text: "Project inquiry — ERP", time: "1h ago", color: "text-purple-300" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
                      <span className="text-base">{item.icon}</span>
                      <span className={`text-xs flex-1 ${item.color}`}>{item.text}</span>
                      <span className="text-white/40 text-[10px]">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badge cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl px-3 py-2 flex items-center gap-2 border border-gray-100">
                <span className="text-lg">🤖</span>
                <div>
                  <p className="text-gray-900 text-xs font-semibold">AI Ready</p>
                  <p className="text-gray-400 text-[10px]">Solutions available</p>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl px-3 py-2 flex items-center gap-2 border border-gray-100">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="text-gray-900 text-xs font-semibold">Fast Delivery</p>
                  <p className="text-gray-400 text-[10px]">Same day in Sylhet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 60L48 52C96 44 192 28 288 24C384 20 480 28 576 36C672 44 768 52 864 48C960 44 1056 28 1152 24C1248 20 1344 28 1392 32L1440 36V60H0Z" fill="white"/>
        </svg>
      </div>
    </section>
  );
}
