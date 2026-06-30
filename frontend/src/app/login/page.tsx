"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BD_PHONE_REGEX } from "@/lib/phone";
import { Phone, User, LogIn, Loader2 } from "lucide-react";
import { useCustomerStore } from "@/store/customer";
import { useLanguageStore } from "@/store/language";
import AuthSplitLayout from "@/components/layout/AuthSplitLayout";

export default function CustomerLoginPage() {
  const { lang } = useLanguageStore();
  const { login, isLoggedIn } = useCustomerStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/orders");
  }, [isLoggedIn, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
    router.push("/orders");
  };

  return (
    <AuthSplitLayout
      title={lang === "bn" ? "গ্রাহক লগইন" : "Customer Login"}
      subtitle={lang === "bn" ? "ফোন নম্বর দিয়ে অর্ডার দেখুন" : "View your orders with phone number"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="form-label">{lang === "bn" ? "নাম" : "Name"}</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={name} onChange={(e) => setName(e.target.value)} className="input pl-10" />
          </div>
        </div>
        <div>
          <label className="form-label">{lang === "bn" ? "ফোন" : "Phone"}</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input pl-10" placeholder="01XXXXXXXXX" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" defaultChecked className="rounded border-gray-300" />
          {lang === "bn" ? "আমাকে মনে রাখুন" : "Remember me"}
        </label>
        <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline block">
          {lang === "bn" ? "সাহায্য প্রয়োজন?" : "Need help signing in?"}
        </Link>
        <button type="submit" disabled={loading} className="btn btn-brand btn-md w-full btn-ripple">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {lang === "bn" ? "লগইন করুন" : "Sign In"}
        </button>
      </form>
      <p className="text-center text-xs text-muted mt-4 space-y-1">
        <Link href="/track" className="block text-brand-600 hover:underline">
          {lang === "bn" ? "অর্ডার নম্বর দিয়ে ট্র্যাক করুন" : "Track by order number"}
        </Link>
        <span>
          {lang === "bn" ? "নতুন গ্রাহক? " : "New customer? "}
          <Link href="/register" className="text-brand-600 hover:underline font-medium">
            {lang === "bn" ? "রেজিস্টার করুন" : "Register"}
          </Link>
        </span>
      </p>
    </AuthSplitLayout>
  );
}
