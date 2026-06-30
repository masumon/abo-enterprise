"use client";

import Link from "next/link";
import { Phone, ArrowLeft, MessageCircle } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import AuthSplitLayout from "@/components/layout/AuthSplitLayout";

export default function ForgotPasswordPage() {
  const { lang } = useLanguageStore();

  return (
    <AuthSplitLayout
      title={lang === "bn" ? "পাসওয়ার্ড রিসেট" : "Account Recovery"}
      subtitle={lang === "bn" ? "আমাদের লগইন ফোন-ভিত্তিক" : "Our login is phone-based — no password required"}
    >
      <div className="space-y-4 text-sm text-muted">
        <p>
          {lang === "bn"
            ? "ABO Enterprise গ্রাহক পোর্টালে পাসওয়ার্ডের পরিবর্তে আপনার ফোন নম্বর ব্যবহার করা হয়। অর্ডার দেখতে ফোন নম্বর দিয়ে লগইন করুন।"
            : "ABO Enterprise uses your phone number instead of a password. Sign in with your phone to view orders."}
        </p>
        <div className="enterprise-card p-4 space-y-3 bg-brand-50/50 dark:bg-brand-900/20 border-brand-100">
          <p className="font-semibold text-heading">{lang === "bn" ? "সাহায্য প্রয়োজন?" : "Need help?"}</p>
          <a href="tel:+8801825007977" className="flex items-center gap-2 text-brand-600 hover:underline">
            <Phone className="w-4 h-4" /> +880 1825 007977
          </a>
          <a href="https://wa.me/8801825007977" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
            <MessageCircle className="w-4 h-4" /> WhatsApp Support
          </a>
        </div>
        <Link href="/login" className="btn btn-brand btn-md w-full">
          <ArrowLeft className="w-4 h-4" />
          {lang === "bn" ? "লগইনে ফিরুন" : "Back to Login"}
        </Link>
        <Link href="/track" className="btn btn-outline btn-md w-full text-center">
          {lang === "bn" ? "অর্ডার ট্র্যাক করুন" : "Track Order"}
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
