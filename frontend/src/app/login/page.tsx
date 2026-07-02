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
      title={lang === "bn" ? "গ্রাহক লগইন" : "Customer Login"}
      subtitle={lang === "bn" ? "OTP দিয়ে ফোন যাচাই করে অর্ডার দেখুন" : "Verify your phone with OTP to view orders"}
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
