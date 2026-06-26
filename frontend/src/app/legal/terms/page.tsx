"use client";

import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";

export default function TermsPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <GlassCard className="p-8 md:p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {isBn ? "সেবার শর্তাবলী" : "Terms of Service"}
          </h1>
          <div className="text-gray-600 space-y-4 text-sm leading-relaxed">
            <p>{isBn ? "ABO Enterprise ওয়েবসাইট ও সেবা ব্যবহার করে আপনি এই শর্তাবলী মেনে নিচ্ছেন।" : "By using ABO Enterprise website and services, you agree to these terms."}</p>
            <p>{isBn ? "পণ্যের মূল্য ও স্টক পরিবর্তন হতে পারে। অর্ডার নিশ্চিতকরণের পর আমরা যোগাযোগ করব।" : "Product prices and stock may change. We will contact you after order confirmation."}</p>
            <p>{isBn ? "সফটওয়্যার ও কাস্টম প্রজেক্টের জন্য আলাদা চুক্তি প্রযোজ্য।" : "Separate agreements apply for software and custom projects."}</p>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
