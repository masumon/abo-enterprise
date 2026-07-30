"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCustomerStore } from "@/store/customer";
import { useLanguageStore } from "@/store/language";
import AuthSplitLayout from "@/components/layout/AuthSplitLayout";
import CustomerOtpForm from "@/components/auth/CustomerOtpForm";

export default function CustomerLoginPage() {
  const { lang } = useLanguageStore();
  const { isLoggedIn } = useCustomerStore();
  const router = useRouter();

  useEffect(() => {
    useCustomerStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/orders");
  }, [isLoggedIn, router]);

  return (
    <AuthSplitLayout
      badge={lang === "bn" ? "👤 গ্রাহক ড্যাশবোর্ড" : "👤 Customer Dashboard"}
      title={lang === "bn" ? "আপনার অ্যাকাউন্টে ঢুকুন" : "Sign in to your account"}
      subtitle={
        lang === "bn"
          ? "অর্ডার, ট্র্যাকিং ও প্রোফাইল — সব এক জায়গায়। কোডটি আপনার ইমেইলে যাবে।"
          : "Orders, tracking & profile — all in one place. The code is sent to your email."
      }
    >
      <CustomerOtpForm redirectTo="/orders" />
      {/* GAP-10 — the "New customer? Register" link pointed at the same form on
          another URL, so it asked the visitor to pick between two identical
          doors. First verified code creates the account; saying so removes the
          choice instead of relocating it. */}
      <p className="text-center text-xs text-muted mt-4 space-y-1">
        <Link href="/track" className="block text-brand-600 hover:underline">
          {lang === "bn" ? "অর্ডার নম্বর দিয়ে ট্র্যাক করুন" : "Track by order number"}
        </Link>
        <span className="block">
          {lang === "bn"
            ? "নতুন গ্রাহক? প্রথম কোড যাচাই হলেই অ্যাকাউন্ট তৈরি হয়ে যাবে।"
            : "New customer? Your account is created the first time you verify a code."}
        </span>
      </p>
    </AuthSplitLayout>
  );
}
