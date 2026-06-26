"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, User, LogIn, Loader2 } from "lucide-react";
import { useCustomerStore } from "@/store/customer";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";

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
    if (!/^0[13-9]\d{8}$/.test(phone)) {
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
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <GlassCard className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-7 h-7 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold">{lang === "bn" ? "গ্রাহক লগইন" : "Customer Login"}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === "bn" ? "ফোন নম্বর দিয়ে অর্ডার দেখুন" : "View your orders with phone number"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">{lang === "bn" ? "নাম" : "Name"}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={name} onChange={(e) => setName(e.target.value)} className="input pl-10" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{lang === "bn" ? "ফোন" : "Phone"}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input pl-10" placeholder="01XXXXXXXXX" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-brand btn-md w-full btn-ripple">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {lang === "bn" ? "অর্ডার দেখুন" : "View My Orders"}
          </button>
        </form>
        <p className="text-center text-xs text-gray-500 mt-4">
          <Link href="/track" className="text-brand-600 hover:underline">{lang === "bn" ? "অর্ডার নম্বর দিয়ে ট্র্যাক করুন" : "Track by order number"}</Link>
        </p>
      </GlassCard>
    </main>
  );
}
