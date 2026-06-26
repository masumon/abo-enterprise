"use client";
import { Star, Quote } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const REVIEWS = [
  {
    name: "Rahim Uddin",
    role: { en: "Shop Owner, Sylhet", bn: "দোকান মালিক, সিলেট" },
    rating: 5,
    text: {
      en: "ABO Enterprise built our POS system in 2 weeks. It's fast, easy and our billing errors dropped to zero!",
      bn: "ABO Enterprise আমাদের POS সিস্টেম ২ সপ্তাহে তৈরি করেছে। দ্রুত, সহজ এবং বিলিং ভুল শূন্যে নেমেছে!",
    },
    source: "Google",
    emoji: "⭐",
  },
  {
    name: "Fatema Begum",
    role: { en: "Restaurant Owner", bn: "রেস্টুরেন্ট মালিক" },
    rating: 5,
    text: {
      en: "Their restaurant management software transformed our kitchen operations. Order confusion is gone!",
      bn: "তাদের রেস্টুরেন্ট সফটওয়্যার আমাদের কিচেন সম্পূর্ণ বদলে দিয়েছে। অর্ডারের বিভ্রান্তি নেই!",
    },
    source: "Facebook",
    emoji: "🍽",
  },
  {
    name: "Karim Hassan",
    role: { en: "IT Manager, Corporate", bn: "IT ম্যানেজার, কর্পোরেট" },
    rating: 5,
    text: {
      en: "We needed a custom ERP with AI features. ABO delivered exactly what we wanted — on time!",
      bn: "আমাদের AI ফিচার সহ কাস্টম ERP দরকার ছিল। ABO ঠিক সময়ে, ঠিক যা চেয়েছিলাম তা দিয়েছে!",
    },
    source: "Direct",
    emoji: "💼",
  },
  {
    name: "Nusrat Jahan",
    role: { en: "Freelancer, Dhaka", bn: "ফ্রিল্যান্সার, ঢাকা" },
    rating: 5,
    text: {
      en: "Bought phone accessories from ABO — quality is top-notch and delivery was same-day!",
      bn: "ABO থেকে ফোন এক্সেসরিজ কিনেছি — মান অসাধারণ এবং একই দিনে ডেলিভারি!",
    },
    source: "Google",
    emoji: "📱",
  },
];

export default function CustomerReviews() {
  const { lang } = useLanguageStore();
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
            <span className="ml-2 font-bold text-gray-900">5.0</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {lang === "bn" ? "গ্রাহকরা কী বলছেন?" : "What Our Clients Say"}
          </h2>
          <p className="text-gray-500 text-sm">
            {lang === "bn" ? "৫০০+ সন্তুষ্ট গ্রাহক আমাদের সেরা পুরস্কার।" : "500+ happy clients are our greatest reward."}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {REVIEWS.map((r) => (
            <div key={r.name} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow relative">
              <Quote className="w-6 h-6 text-brand-200 mb-3" />
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                "{lang === "bn" ? r.text.bn : r.text.en}"
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                  <p className="text-gray-400 text-xs">{lang === "bn" ? r.role.bn : r.role.en}</p>
                </div>
                <div className="text-right">
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">{r.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
