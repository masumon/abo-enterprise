"use client";

import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";

export default function PrivacyPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <GlassCard className="p-8 md:p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {isBn ? "গোপনীয়তা নীতি" : "Privacy Policy"}
          </h1>
          <div className="prose prose-sm text-gray-600 space-y-4">
            <p>{isBn ? "ABO Enterprise আপনার ব্যক্তিগত তথ্য সুরক্ষিত রাখতে প্রতিশ্রুতিবদ্ধ।" : "ABO Enterprise is committed to protecting your personal information."}</p>
            <h2 className="text-lg font-bold text-gray-900">{isBn ? "তথ্য সংগ্রহ" : "Data Collection"}</h2>
            <p>{isBn ? "আমরা নাম, ফোন, ইমেইল ও অর্ডার তথ্য সংগ্রহ করি শুধুমাত্র সেবা প্রদানের জন্য।" : "We collect name, phone, email and order data solely to provide our services."}</p>
            <h2 className="text-lg font-bold text-gray-900">{isBn ? "তথ্য শেয়ার" : "Data Sharing"}</h2>
            <p>{isBn ? "আপনার তথ্য তৃতীয় পক্ষের সাথে বিক্রি করা হয় না।" : "Your data is never sold to third parties."}</p>
            <h2 className="text-lg font-bold text-gray-900">{isBn ? "যোগাযোগ" : "Contact"}</h2>
            <p>abo.enterprise@gmail.com | +880 1825 007977</p>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
