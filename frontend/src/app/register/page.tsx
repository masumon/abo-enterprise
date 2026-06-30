"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BD_PHONE_REGEX } from "@/lib/phone";
import { Phone, User, UserPlus, Loader2 } from "lucide-react";
import { useCustomerStore } from "@/store/customer";
import { useLanguageStore } from "@/store/language";
import AuthSplitLayout from "@/components/layout/AuthSplitLayout";

export default function RegisterPage() {
  const { lang } = useLanguageStore();
  const { login, isLoggedIn } = useCustomerStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/profile");
  }, [isLoggedIn, router]);

  const passwordStrength = phone.length >= 11 ? "strong" : phone.length >= 8 ? "medium" : "weak";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!agreed) {
      setError(lang === "bn" ? "শর্তাবলীতে সম্মত হন" : "Please agree to terms");
      return;
    }
    if (!BD_PHONE_REGEX.test(phone)) {
      setError(lang === "bn" ? "সঠিক ফোন নম্বর দিন" : "Enter valid BD phone number");
      return;
    }
    if (name.trim().length < 2) {
      setError(lang === "bn" ? "নাম দিন" : "Enter your name");
      return;
    }
    setLoading(true);
    login(phone, name.trim());
    router.push("/profile");
  };

  return (
    <AuthSplitLayout
      title={lang === "bn" ? "রেজিস্ট্রেশন" : "Create Account"}
      subtitle={lang === "bn" ? "ফোন নম্বর দিয়ে দ্রুত রেজিস্টার করুন" : "Quick registration with your phone number"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="form-label">{lang === "bn" ? "পূর্ণ নাম" : "Full Name"}</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={name} onChange={(e) => setName(e.target.value)} className="input pl-10" required />
          </div>
        </div>
        <div>
          <label className="form-label">{lang === "bn" ? "ফোন নম্বর" : "Phone Number"}</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input pl-10" placeholder="01XXXXXXXXX" required />
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all ${
                passwordStrength === "strong" ? "w-full bg-green-500" : passwordStrength === "medium" ? "w-2/3 bg-yellow-500" : "w-1/3 bg-red-400"
              }`}
            />
          </div>
          <p className="text-[10px] text-muted mt-1">
            {lang === "bn" ? "বাংলাদেশি মোবাইল নম্বর (১১ ডিজিট)" : "Valid Bangladesh mobile (11 digits)"}
          </p>
        </div>
        <label className="flex items-start gap-2 text-xs text-muted cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded border-gray-300 mt-0.5" />
          <span>
            {lang === "bn" ? "আমি " : "I agree to the "}
            <Link href="/legal/terms" className="text-brand-600 hover:underline">{lang === "bn" ? "শর্তাবলী" : "Terms"}</Link>
            {lang === "bn" ? " ও " : " and "}
            <Link href="/legal/privacy" className="text-brand-600 hover:underline">{lang === "bn" ? "গোপনীয়তা নীতি" : "Privacy Policy"}</Link>
          </span>
        </label>
        <button type="submit" disabled={loading} className="btn btn-brand btn-md w-full btn-ripple">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {lang === "bn" ? "অ্যাকাউন্ট তৈরি করুন" : "Create Account"}
        </button>
      </form>
      <p className="text-center text-xs text-muted mt-4">
        {lang === "bn" ? "ইতিমধ্যে অ্যাকাউন্ট আছে? " : "Already have an account? "}
        <Link href="/login" className="text-brand-600 hover:underline font-medium">
          {lang === "bn" ? "লগইন" : "Sign In"}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
