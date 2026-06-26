"use client";

import Link from "next/link";
import { Package, Phone, MessageCircle, LogIn } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const MENU = [
  { href: "/orders", icon: Package, label: { bn: "আমার অর্ডার", en: "My Orders" }, sub: { bn: "অর্ডার ট্র্যাক করুন", en: "Track your orders" } },
  { href: "/track", icon: Package, label: { bn: "অর্ডার ট্র্যাক", en: "Track Order" }, sub: { bn: "অর্ডার নম্বর দিয়ে স্ট্যাটাস", en: "Status by order number" } },
  { href: "/services", icon: Package, label: { bn: "আমার বুকিং", en: "My Bookings" }, sub: { bn: "নতুন সেবা বুক করুন", en: "Book a new service" } },
  { href: "/contact", icon: Phone, label: { bn: "সাপোর্ট", en: "Support" }, sub: { bn: "আমাদের সাথে যোগাযোগ করুন", en: "Get help from us" } },
];

export default function ProfilePage() {
  const { lang } = useLanguageStore();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-md py-8">
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white text-center mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">👤</div>
          <h1 className="text-xl font-bold">{lang === "bn" ? "স্বাগতম!" : "Welcome!"}</h1>
          <p className="text-white/70 text-sm mt-1">
            {lang === "bn" ? "ABO Enterprise গ্রাহক সেন্টার" : "ABO Enterprise Customer Hub"}
          </p>
        </div>

        <div className="space-y-3">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <item.icon className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{lang === "bn" ? item.label.bn : item.label.en}</p>
                <p className="text-xs text-gray-500">{lang === "bn" ? item.sub.bn : item.sub.en}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm">{lang === "bn" ? "দ্রুত যোগাযোগ" : "Quick Contact"}</h2>
          <a href="tel:+8801825007977" className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-600">
            <Phone className="w-4 h-4 text-brand-500" /> +880 1825 007977
          </a>
          <a href="https://wa.me/8801825007977" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
            <MessageCircle className="w-4 h-4" />
            {lang === "bn" ? "WhatsApp-এ মেসেজ করুন" : "Message on WhatsApp"}
          </a>
          <Link href="/admin/login"
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-brand-200 text-brand-700 rounded-xl text-sm font-medium hover:bg-brand-50 transition-colors">
            <LogIn className="w-4 h-4" />
            {lang === "bn" ? "এডমিন লগইন" : "Admin Login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
