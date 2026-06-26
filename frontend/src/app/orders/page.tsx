"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Package, Search } from "lucide-react";
import { useLanguageStore } from "@/store/language";

function OrdersContent() {
  const { lang } = useLanguageStore();

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto text-center">
        <Package className="w-12 h-12 text-brand-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {lang === "bn" ? "আমার অর্ডার" : "My Orders"}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {lang === "bn"
            ? "অর্ডার নম্বর দিয়ে স্ট্যাটাস দেখুন। লগইন ছাড়াই ট্র্যাক করা যায়।"
            : "Track your order status with your order number. No login required."}
        </p>
        <Link href="/track" className="btn btn-brand btn-md w-full flex items-center justify-center gap-2">
          <Search className="w-4 h-4" />
          {lang === "bn" ? "অর্ডার ট্র্যাক করুন" : "Track an Order"}
        </Link>
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersContent />
    </Suspense>
  );
}
