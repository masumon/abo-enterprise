"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Facebook,
  MessageCircle,
  Mail,
  MapPin,
  Phone,
  Send,
  Loader2,
  Smartphone,
  Instagram,
  Linkedin,
  Youtube,
  ArrowUp,
  type LucideIcon,
  TrendingUp,
} from "lucide-react";
import {
  VisaMark,
  MastercardMark,
  BkashMark,
  NagadMark,
  RocketMark,
  CardMark,
  PlayStoreMark,
  AppStoreMark,
} from "@/components/icons/PaymentIcons";
import { useLanguageStore } from "@/store/language";
import { useToastStore } from "@/store/toast";
import { publicApi } from "@/lib/api";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import {
  SITE_TRUST_BADGES_KEY,
  getTrustBadges,
} from "@/lib/cmsContent";
import { resolveGoogleMapsLink, DEFAULT_ADDRESS_BN, DEFAULT_ADDRESS_EN } from "@/lib/maps";
import BrandLogo from "@/components/ui/BrandLogo";

const PAY_BRAND: Record<string, { label: string; Mark: (p: { className?: string }) => JSX.Element }> = {
  card: { label: "Visa", Mark: VisaMark },
  visa: { label: "Visa", Mark: VisaMark },
  mastercard: { label: "Mastercard", Mark: MastercardMark },
  bkash: { label: "bKash", Mark: BkashMark },
  nagad: { label: "Nagad", Mark: NagadMark },
  rocket: { label: "Rocket", Mark: RocketMark },
  sslcommerz: { label: "SSLCommerz", Mark: CardMark },
};

const DEFAULT_PAY = ["visa", "mastercard", "bkash", "nagad", "rocket", "sslcommerz"];

const QUICK_LINKS = [
  { href: "/", label: { en: "Home", bn: "হোম" } },
  { href: "/products", label: { en: "Products", bn: "পণ্য" } },
  { href: "/services", label: { en: "Services", bn: "সেবা" } },
  { href: "/services/software", label: { en: "Software", bn: "সফটওয়্যার" } },
  { href: "/projects", label: { en: "Projects", bn: "প্রকল্প" } },
  { href: "/about", label: { en: "About", bn: "সম্পর্কে" } },
];

const SERVICES_LINKS = [
  { href: "/services", label: { en: "All Services", bn: "সব সেবা" } },
  { href: "/services#web", label: { en: "Web Development", bn: "ওয়েব ডেভেলপমেন্ট" } },
  { href: "/services#mobile", label: { en: "Mobile App", bn: "মোবাইল অ্যাপ" } },
  { href: "/services#software", label: { en: "Software", bn: "সফটওয়্যার" } },
  { href: "/services#graphics", label: { en: "Graphics Design", bn: "গ্রাফিক্স ডিজাইন" } },
  { href: "/services#ecommerce", label: { en: "E-Commerce", bn: "ই-কমার্স" } },
];

const CUSTOMER_CARE_LINKS = [
  { href: "/faq", label: { en: "FAQ", bn: "সাধারণ প্রশ্ন" } },
  { href: "/contact", label: { en: "Contact", bn: "যোগাযোগ করুন" } },
  { href: "/contact", label: { en: "Warranty", bn: "ওয়ারেন্টি" } },
  { href: "/legal/refund", label: { en: "Returns", bn: "রিটার্ন নীতি" } },
  { href: "/track", label: { en: "Track Order", bn: "অর্ডার ট্র্যাক করুন" } },
  { href: "/faq", label: { en: "Support", bn: "সহায়তা" } },
];

function normalizePhoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `880${digits.slice(1)}`;
  return digits ? `880${digits}` : "";
}

function formatPhoneDisplay(phone: string) {
  const digits = normalizePhoneDigits(phone);
  const local = digits.slice(3);
  if (local.length >= 10) return `+880 ${local.slice(0, 4)} ${local.slice(4)}`;
  return phone;
}

export default function Footer() {
  const { lang } = useLanguageStore();
  const toast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const newsletterEnabled = useFeatureFlag("feature_newsletter");

  const { methods } = usePaymentMethods();
  const { settings } = usePublicSettings([
    "whatsapp_number",
    "contact_phone",
    "contact_email",
    "contact_address",
    "facebook_url",
    "instagram_url",
    "linkedin_url",
    "youtube_url",
    "play_store_url",
    "app_store_url",
    SITE_TRUST_BADGES_KEY,
  ]);

  const phoneRaw = getSettingValue(settings, "contact_phone", "01825007977");
  const emailAddr = getSettingValue(settings, "contact_email", "info@aboenterprise.com");
  const address = getSettingValue(
    settings,
    "contact_address",
    lang === "bn" ? DEFAULT_ADDRESS_BN : DEFAULT_ADDRESS_EN
  );
  const mapsLink = resolveGoogleMapsLink(getSettingValue(settings, "contact_address"), address);
  const whatsappDigits = normalizePhoneDigits(getSettingValue(settings, "whatsapp_number", phoneRaw));
  const phoneDigits = normalizePhoneDigits(phoneRaw);
  const phoneDisplay = formatPhoneDisplay(phoneRaw);

  const activeKeys = [
    ...new Set(
      methods
        .filter((m) => m.is_active)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((m) => m.payment_gateway.toLowerCase())
        .filter((k) => k in PAY_BRAND)
    ),
  ];
  const payKeys = activeKeys.length > 0 ? activeKeys : DEFAULT_PAY;

  const playStoreUrl = getSettingValue(settings, "play_store_url") || "/";
  const appStoreUrl = getSettingValue(settings, "app_store_url") || "/";

  const trustBadges = getTrustBadges(settings, []);

  const socialLinks = [
    {
      href: getSettingValue(settings, "facebook_url", "https://www.facebook.com/abo.enterprise"),
      icon: Facebook,
      label: "Facebook",
    },
    { href: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "", icon: MessageCircle, label: "WhatsApp" },
    { href: getSettingValue(settings, "instagram_url"), icon: Instagram, label: "Instagram" },
    { href: getSettingValue(settings, "linkedin_url"), icon: Linkedin, label: "LinkedIn" },
    { href: getSettingValue(settings, "youtube_url"), icon: Youtube, label: "YouTube" },
  ].filter((item) => item.href);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    <footer className="site-footer relative text-white overflow-hidden bg-gradient-to-b from-[#0f1a2e] to-[#051529]">
      <div className="relative z-10 container mx-auto px-4 py-6 md:py-14 space-y-5 md:space-y-10">
        <div className="grid gap-8 md:gap-10 md:grid-cols-[1fr_1.5fr]">
          <div className="space-y-6">
            <div>
              <BrandLogo size="lg" href={false} variant="light" />
              <p className="text-xs md:text-sm text-white/70 mt-3 leading-relaxed">
                {lang === "bn"
                  ? "ডিজিটাল যুগের সব ধরনের সমাধান আমরা সরবরাহ করি। আপনার ব্যবসা, ঘর এবং নিরাপত্তার সব কিছু আমরা আপনার সাথে।"
                  : "We provide solutions for every need in the digital age. Your business, home, and security are in good hands with us."}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-white">
                    {lang === "bn" ? "প্রধান কার্যালয়" : "Head Office"}
                  </p>
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs md:text-sm text-white/70 hover:text-green-400 transition-colors"
                  >
                    {address}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-white">
                    {lang === "bn" ? "কল করুন" : "Call Us"}
                  </p>
                  <a href={`tel:+${phoneDigits}`} className="text-xs md:text-sm text-white/70 hover:text-blue-400 transition-colors">
                    {phoneDisplay}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-white">
                    {lang === "bn" ? "ইমেইল" : "Email"}
                  </p>
                  <a href={`mailto:${emailAddr}`} className="text-xs md:text-sm text-white/70 hover:text-red-400 transition-colors break-all">
                    {emailAddr}
                  </a>
                </div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap pt-2">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white hover:scale-110 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-6 lg:grid-cols-4">
            <nav>
              <h3 className="text-sm md:text-base font-bold text-white mb-3">
                {lang === "bn" ? "কুইক লিংকস" : "Quick Links"}
              </h3>
              <ul className="space-y-2">
                {QUICK_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs md:text-sm text-white/70 hover:text-white transition-colors flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-green-400 transition-colors" />
                      {lang === "bn" ? link.label.bn : link.label.en}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav>
              <h3 className="text-sm md:text-base font-bold text-white mb-3">
                {lang === "bn" ? "সেবা সমূহ" : "Our Services"}
              </h3>
              <ul className="space-y-2">
                {SERVICES_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs md:text-sm text-white/70 hover:text-white transition-colors flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-green-400 transition-colors" />
                      {lang === "bn" ? link.label.bn : link.label.en}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav>
              <h3 className="text-sm md:text-base font-bold text-white mb-3">
                {lang === "bn" ? "কাস্টমার সেবা" : "Customer Care"}
              </h3>
              <ul className="space-y-2">
                {CUSTOMER_CARE_LINKS.map((link) => (
                  <li key={link.label.en}>
                    <Link
                      href={link.href}
                      className="text-xs md:text-sm text-white/70 hover:text-white transition-colors flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-green-400 transition-colors" />
                      {lang === "bn" ? link.label.bn : link.label.en}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="hidden lg:block">
              <h3 className="text-sm md:text-base font-bold text-white mb-3">
                {lang === "bn" ? "সাপোর্ট" : "Support"}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/faq"
                    className="text-xs md:text-sm text-white/70 hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-green-400 transition-colors" />
                    {lang === "bn" ? "সাপোর্ট টিকেট" : "Support Ticket"}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {trustBadges.length > 0 && (
          <div className="border-t border-white/10 pt-5 md:pt-8 space-y-4 md:space-y-6">
            <div className="flex items-center gap-3 justify-center">
              <div className="w-1 h-1 rounded-full bg-green-400" />
              <h2 className="text-lg md:text-xl font-bold text-white text-center">
                {lang === "bn" ? "আমাদের উপর আস্থা রাখুন" : "Trust Us"}
              </h2>
              <div className="w-1 h-1 rounded-full bg-green-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trustBadges.map((badge, i) => (
                <div
                  key={i}
                  className="border border-green-500/50 rounded-xl p-4 hover:border-green-400 hover:bg-green-500/5 transition-all text-center"
                >
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-400" aria-hidden />
                    </div>
                  </div>
                  <p className="text-sm md:text-base font-bold text-white">
                    {lang === "bn" ? badge.bn || badge.en : badge.en || badge.bn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-5 md:pt-8 space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-1 h-1 rounded-full bg-green-400" />
            <h2 className="text-lg md:text-xl font-bold text-white text-center">
              {lang === "bn" ? "পেমেন্ট পদ্ধতি সমূহ" : "Payment Methods"}
            </h2>
            <div className="w-1 h-1 rounded-full bg-green-400" />
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {payKeys.map((key) => {
              const brand = PAY_BRAND[key];
              if (!brand) return null;
              return (
                <div
                  key={key}
                  className="border border-white/10 rounded-lg p-2 md:p-3 hover:border-white/30 transition-colors bg-white/5"
                  title={brand.label}
                >
                  <brand.Mark className="h-5 md:h-6 w-auto max-w-full" />
                </div>
              );
            })}
          </div>
        </div>

        {newsletterEnabled && (
          <div className="border-t border-white/10 pt-5 md:pt-8 space-y-4 md:space-y-6">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 md:w-7 md:h-7 text-white" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-bold text-white">
                  {lang === "bn" ? "নিউজলেটারের সাবস্ক্রাইব করুন" : "Subscribe to Newsletter"}
                </h3>
                <p className="text-sm text-white/70 mt-1">
                  {lang === "bn"
                    ? "নতুন অফার, পণ্য এবং পরিষেবা সম্পর্কে প্রথম জানুন।"
                    : "Get the latest offers, products, and services delivered to your inbox."}
                </p>

                <form onSubmit={handleNewsletter} className="mt-4 flex gap-2 max-w-md">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={lang === "bn" ? "আপনার ইমেইল" : "Your email"}
                    className="flex-1 px-4 py-2 md:py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all text-sm md:text-base"
                    aria-label={lang === "bn" ? "ইমেইল ঠিকানা" : "Email address"}
                    required
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 md:px-6 py-2 md:py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 flex-shrink-0 text-sm md:text-base"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (lang === "bn" ? "সাবস্ক্রাইব" : "Subscribe")}
                  </button>
                </form>

                <p className="text-xs text-white/60 mt-3 flex items-center gap-1">
                  <span>🔒</span>
                  {lang === "bn" ? "আমরা আপনার ডেটা নিরাপদ রাখি এবং কখনও স্প্যাম করি না।" : "We keep your data safe and never spam."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-5 md:pt-8 space-y-4 md:space-y-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white">
              {lang === "bn" ? "আমাদের অ্যাপ ডাউনলোড করুন" : "Download Our App"}
            </h3>
            <p className="text-sm text-white/70 mt-2">
              {lang === "bn"
                ? "যেকোনো সময় সহজেই কেনাকাটা করুন আমাদের মোবাইল অ্যাপ থেকে।"
                : "Shop anytime, anywhere with our mobile app."}
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <a
              href={playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 md:px-6 py-2 md:py-3 rounded-lg border border-white/30 hover:border-white/50 hover:bg-white/5 transition-all flex items-center gap-2 text-sm md:text-base font-semibold text-white"
            >
              <PlayStoreMark className="w-5 h-5" />
              <span>{lang === "bn" ? "গুগল প্লে" : "Google Play"}</span>
            </a>

            <a
              href={appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 md:px-6 py-2 md:py-3 rounded-lg border border-white/30 hover:border-white/50 hover:bg-white/5 transition-all flex items-center gap-2 text-sm md:text-base font-semibold text-white"
            >
              <AppStoreMark className="w-5 h-5" />
              <span>{lang === "bn" ? "অ্যাপ স্টোর" : "App Store"}</span>
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center space-y-4">
          <p className="text-sm text-white/70">
            &copy; {new Date().getFullYear()} ABO ENTERPRISE. {lang === "bn" ? "সকল অধ্যকার সংরক্ষিত।" : "All rights reserved."}
          </p>
          <p className="text-xs text-white/60 flex items-center justify-center gap-1 flex-wrap justify-center">
            <span>{lang === "bn" ? "সেরা সার্ভিস" : "Best Services"}</span>
            <span>•</span>
            <span>{lang === "bn" ? "সেরা সমাধান" : "Best Solutions"}</span>
            <span>•</span>
            <span>{lang === "bn" ? "আমাদের সম্পদ আমাদের লক্ষ্য" : "Our Assets Our Goals"}</span>
            <span>❤️</span>
          </p>
          <p className="text-xs text-white/60">
            <span>{lang === "bn" ? "তৈরি করেছেন" : "Developed with"}</span>
            {" ❤️ "}
            <span>{lang === "bn" ? "দ্বারা" : "by"}</span>
            {" "}
            <a href="https://sumonix.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:text-green-400 transition-colors">
              SUMONIX
            </a>
          </p>
        </div>
      </div>

      {whatsappDigits && (
        <a
          href={`https://wa.me/${whatsappDigits}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 left-4 lg:bottom-6 w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 z-40"
          aria-label="WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      )}

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 z-40"
          aria-label={lang === "bn" ? "উপরে যান" : "Back to top"}
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </footer>
  );
}
