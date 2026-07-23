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
      subtitle={lang === "bn" ? "অর্ডার, ট্র্যাকিং ও প্রোফাইল — সব এক জায়গায়। OTP দিয়ে ফোন যাচাই করুন।" : "Orders, tracking & profile — all in one place. Verify with OTP."}
    >
      <CustomerOtpForm redirectTo="/orders" />
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
