"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCustomerStore } from "@/store/customer";
import { useLanguageStore } from "@/store/language";
import AuthSplitLayout from "@/components/layout/AuthSplitLayout";
import CustomerOtpForm from "@/components/auth/CustomerOtpForm";

export default function RegisterPage() {
  const { lang } = useLanguageStore();
  const { isLoggedIn } = useCustomerStore();
  const router = useRouter();

  useEffect(() => {
    useCustomerStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/profile");
  }, [isLoggedIn, router]);

  return (
    <AuthSplitLayout
      title={lang === "bn" ? "রেজিস্ট্রেশন" : "Create Account"}
      subtitle={lang === "bn" ? "ফোন নম্বর OTP দিয়ে যাচাই করুন" : "Verify your phone number with OTP"}
    >
      <CustomerOtpForm redirectTo="/profile" />
      <p className="text-center text-xs text-muted mt-4">
        {lang === "bn" ? "আগে থেকেই অ্যাকাউন্ট আছে? " : "Already have an account? "}
        <Link href="/login" className="text-brand-600 hover:underline font-medium">
          {lang === "bn" ? "লগইন করুন" : "Sign in"}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
