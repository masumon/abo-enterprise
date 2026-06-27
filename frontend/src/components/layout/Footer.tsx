"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Facebook, MessageCircle, Mail, MapPin, Phone, Clock, Send, Loader2 } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import { publicApi } from "@/lib/api";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

const SERVICES = [
  { href: "/products", label: { en: "Mobile Accessories", bn: "মোবাইল এক্সেসরিজ" } },
  { href: "/services/printing", label: { en: "Printing", bn: "প্রিন্টিং" } },
  { href: "/services/legal", label: { en: "Legal", bn: "আইনি" } },
  { href: "/services/software", label: { en: "Software", bn: "সফটওয়্যার" } },
  { href: "/projects", label: { en: "Enterprise Solutions", bn: "এন্টারপ্রাইজ সমাধান" } },
];

const COMPANY = [
  { href: "/about", label: { en: "About Us", bn: "আমাদের সম্পর্কে" } },
  { href: "/projects", label: { en: "Projects", bn: "প্রজেক্ট" } },
  { href: "/contact", label: { en: "Contact", bn: "যোগাযোগ" } },
  { href: "/track", label: { en: "Track Order", bn: "অর্ডার ট্র্যাক" } },
];

const LEGAL = [
  { href: "/legal/privacy", labelKey: "footer_privacy" as const },
  { href: "/legal/terms", labelKey: "footer_terms" as const },
  { href: "/legal/refund", labelKey: "footer_refund" as const },
];

export default function Footer() {
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const newsletterEnabled = useFeatureFlag("feature_newsletter");

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await publicApi.newsletter(email.trim());
      toast("success", lang === "bn" ? "সাবস্ক্রাইব হয়েছে!" : "Subscribed successfully!");
      setEmail("");
    } catch {
      toast("error", lang === "bn" ? "সাবস্ক্রাইব করা যায়নি" : "Could not subscribe");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[var(--navy)] text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center overflow-hidden">
                <Image src="/logo.jpg" alt="ABO Enterprise" width={48} height={48} className="object-cover" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">ABO Enterprise</h3>
                <p className="text-accent-400 text-xs font-medium">
                  {lang === "bn" ? "ডিজিটাল ভবিষ্যৎ গড়ি" : "Powering Digital Future"}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5 max-w-sm">
              {lang === "bn"
                ? "মোবাইল এক্সেসরিজ থেকে AI সমাধান — বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম।"
                : "From mobile accessories to AI solutions — Bangladesh's complete technology ecosystem."}
            </p>
            {newsletterEnabled && (
              <>
                <form onSubmit={handleNewsletter} className="flex gap-2 max-w-sm">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={lang === "bn" ? "আপনার ইমেইল" : "Your email"}
                    className="input flex-1 text-sm py-2.5"
                    aria-label={t("footer_newsletter")}
                    required
                  />
                  <button type="submit" disabled={submitting} className="btn btn-primary btn-sm flex-shrink-0">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t("footer_subscribe")}
                  </button>
                </form>
                <p className="text-xs text-gray-500 mt-2">{t("footer_newsletter_sub")}</p>
              </>
            )}
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {lang === "bn" ? "সেবা" : "Services"}
            </h4>
            <ul className="space-y-2.5">
              {SERVICES.map((s) => (
                <li key={s.href + s.label.en}>
                  <Link href={s.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {lang === "bn" ? s.label.bn : s.label.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t("footer_company")}</h4>
            <ul className="space-y-2.5">
              {COMPANY.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {lang === "bn" ? link.label.bn : link.label.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t("footer_legal")}</h4>
            <ul className="space-y-2.5 mb-6">
              {LEGAL.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-accent-400" /> Sylhet-3170</li>
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-accent-400" /> +880 1825 007977</li>
              <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-accent-400" /> 9AM – 8PM</li>
            </ul>
            <div className="flex gap-2 mt-4">
              <a href="https://www.facebook.com/abo.enterprise" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors" aria-label="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://wa.me/8801825007977" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-green-600 rounded-lg flex items-center justify-center transition-colors" aria-label="WhatsApp">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="mailto:abo.enterprise@gmail.com" className="w-9 h-9 bg-white/10 hover:bg-accent-500 rounded-lg flex items-center justify-center transition-colors" aria-label="Email">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} ABO Enterprise. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
          </p>
          <p className="text-xs text-gray-600">
            {lang === "bn" ? "তৈরি করেছেন" : "Built by"}{" "}
            <a href="https://mumain.dev" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 font-medium">Mumain.dev</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
