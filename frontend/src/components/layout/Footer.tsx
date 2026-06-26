"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, MessageCircle, Mail, MapPin, Phone, Clock } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const SERVICES = [
  { href: "/products", label: { en: "Mobile Accessories", bn: "মোবাইল এক্সেসরিজ" } },
  { href: "/services/printing", label: { en: "Printing Services", bn: "প্রিন্টিং সেবা" } },
  { href: "/services/legal", label: { en: "Legal Case Writing", bn: "আইনি সেবা" } },
  { href: "/services/software", label: { en: "Website Development", bn: "ওয়েবসাইট ডেভেলপমেন্ট" } },
  { href: "/services/software", label: { en: "AI Solutions", bn: "AI সমাধান" } },
  { href: "/services/software", label: { en: "Custom Software", bn: "কাস্টম সফটওয়্যার" } },
];

export default function Footer() {
  const { lang } = useLanguageStore();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center overflow-hidden">
                <Image
                  src="https://i.ibb.co.com/pjY3wvG9/1769284089412.png"
                  alt="ABO Enterprise"
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg leading-tight">ABO Enterprise</h3>
                <p className="text-accent-400 text-xs font-medium">
                  {lang === "bn" ? "ডিজিটাল ভবিষ্যৎ গড়ি" : "Powering Digital Future"}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              {lang === "bn"
                ? "মোবাইল এক্সেসরিজ থেকে AI সমাধান — বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম।"
                : "From mobile accessories to AI solutions — Bangladesh's complete technology ecosystem."}
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/abo.enterprise"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/8801825007977"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-green-600 rounded-lg flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="mailto:abo.enterprise@gmail.com"
                className="w-9 h-9 bg-white/10 hover:bg-accent-500 rounded-lg flex items-center justify-center transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {lang === "bn" ? "আমাদের সেবা" : "Our Services"}
            </h4>
            <ul className="space-y-2.5">
              {SERVICES.map((s, i) => (
                <li key={i}>
                  <Link
                    href={s.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors hover:translate-x-1 inline-block"
                  >
                    {lang === "bn" ? s.label.bn : s.label.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {lang === "bn" ? "দ্রুত লিংক" : "Quick Links"}
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/", label: { en: "Home", bn: "হোম" } },
                { href: "/products", label: { en: "Products", bn: "পণ্য" } },
                { href: "/track", label: { en: "Track Order", bn: "অর্ডার ট্র্যাক" } },
                { href: "/about", label: { en: "About Us", bn: "আমাদের সম্পর্কে" } },
                { href: "/contact", label: { en: "Contact", bn: "যোগাযোগ" } },
                { href: "/admin/login", label: { en: "Admin", bn: "এডমিন" } },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {lang === "bn" ? link.label.bn : link.label.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {lang === "bn" ? "যোগাযোগ" : "Contact"}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-accent-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-400">
                  {lang === "bn"
                    ? "হাজি বাহার উদ্দিন মার্কেট, সিলেট-৩১৭০"
                    : "Hazi Bahar Uddin Market, Sylhet-3170"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-accent-400 flex-shrink-0" />
                <a
                  href="tel:+8801825007977"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  +880 1825 007977
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-accent-400 flex-shrink-0" />
                <a
                  href="mailto:abo.enterprise@gmail.com"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  abo.enterprise@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-accent-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">
                  {lang === "bn" ? "শনি–বৃহঃ, সকাল ৯টা–রাত ৮টা" : "Sat–Thu, 9AM–8PM"}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} ABO Enterprise.{" "}
            {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
          </p>
          <p className="text-xs text-gray-600">
            {lang === "bn" ? "তৈরি করেছেন" : "Built by"}{" "}
            <a
              href="https://mumain.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:text-brand-300 transition-colors font-medium"
            >
              Mumain.dev
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
