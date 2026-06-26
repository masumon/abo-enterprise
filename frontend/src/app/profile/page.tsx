"use client";

import Link from "next/link";
import { ShoppingCart, Calendar, FileText, Phone, Mail, Settings, LogIn } from "lucide-react";

const MENU = [
  { href: "/orders",   icon: ShoppingCart, label: "আমার অর্ডার",   sub: "Order history & tracking" },
  { href: "/bookings", icon: Calendar,     label: "আমার বুকিং",    sub: "Service bookings" },
  { href: "/invoices", icon: FileText,     label: "ইনভয়েস",        sub: "Download invoices" },
  { href: "/contact",  icon: Phone,        label: "সাপোর্ট",       sub: "Get help from us" },
];

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-24">
      <div className="container mx-auto px-4 max-w-md py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white text-center mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">👤</div>
          <h1 className="text-xl font-bold">স্বাগতম!</h1>
          <p className="text-white/70 text-sm mt-1">ABO Enterprise-এ লগইন করুন</p>
          <Link href="/admin/login"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-white text-brand-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            <LogIn className="w-4 h-4" /> Admin Login
          </Link>
        </div>

        {/* Menu */}
        <div className="space-y-3">
          {MENU.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <item.icon className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-6 bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="font-bold text-gray-900 text-sm">দ্রুত যোগাযোগ</h2>
          <a href="tel:+8801825007977" className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-600">
            <Phone className="w-4 h-4 text-brand-500" /> +880 1825 007977
          </a>
          <a href="mailto:abo.enterprise@gmail.com" className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-600">
            <Mail className="w-4 h-4 text-brand-500" /> abo.enterprise@gmail.com
          </a>
          <a href="https://wa.me/8801825007977" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
            💬 WhatsApp-এ মেসেজ করুন
          </a>
        </div>
      </div>
    </div>
  );
}
