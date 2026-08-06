"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Facebook,
  MessageCircle,
  Mail,
  MapPin,
  Phone,
  Loader2,
  Instagram,
  Linkedin,
  Youtube,
  ChevronDown,
  CheckCircle2,
  BadgeCheck,
  Clock,
  Lock,
  type LucideIcon,
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
  SITE_REGISTRATIONS_KEY,
  getRegistrations,
} from "@/lib/cmsContent";
import { resolveGoogleMapsLink, DEFAULT_ADDRESS_BN, DEFAULT_ADDRESS_EN } from "@/lib/maps";
import { triggerInstall, isStandalone } from "@/lib/pwaInstall";
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
  { href: "/blog", label: { en: "Blog", bn: "ব্লগ" } },
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

// "Support Ticket" (previously its own near-empty desktop-only column) now
// lives here — one home for every customer-care link instead of two.
const CUSTOMER_CARE_LINKS = [
  { href: "/faq", label: { en: "FAQ", bn: "সাধারণ প্রশ্ন" } },
  { href: "/contact", label: { en: "Contact", bn: "যোগাযোগ করুন" } },
  { href: "/contact", label: { en: "Warranty", bn: "ওয়ারেন্টি" } },
  { href: "/legal/refund", label: { en: "Returns", bn: "রিটার্ন নীতি" } },
  { href: "/track", label: { en: "Track Order", bn: "অর্ডার ট্র্যাক করুন" } },
  { href: "/faq", label: { en: "Support / Support Ticket", bn: "সহায়তা / সাপোর্ট টিকেট" } },
];

const NAV_GROUPS = [
  { id: "quick", title: { en: "Quick Links", bn: "কুইক লিংকস" }, links: QUICK_LINKS },
  { id: "services", title: { en: "Our Services", bn: "সেবা সমূহ" }, links: SERVICES_LINKS },
  { id: "care", title: { en: "Customer Care", bn: "কাস্টমার সেবা" }, links: CUSTOMER_CARE_LINKS },
];

// Cycles the CMS-driven trust badges through 4 accent tiles.
const TRUST_TILE_STYLES = [
  "bg-accent-50 text-accent-800 dark:bg-accent-500/10 dark:text-accent-300",
  "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
  "bg-accent-100 text-accent-900 dark:bg-accent-500/15 dark:text-accent-200",
  "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200",
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
  const bn = lang === "bn";
  const toast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const newsletterEnabled = useFeatureFlag("feature_newsletter");

  const { methods } = usePaymentMethods();
  const { settings } = usePublicSettings([
    "whatsapp_number",
    "contact_phone",
    "contact_email",
    "contact_address",
    "contact_hours_en",
    "contact_hours_bn",
    "footer_about_en",
    "footer_about_bn",
    "facebook_url",
    "instagram_url",
    "linkedin_url",
    "youtube_url",
    "play_store_url",
    "app_store_url",
    "trade_license",
    "footer_payment_image_url",
    SITE_TRUST_BADGES_KEY,
    SITE_REGISTRATIONS_KEY,
  ]);

  const phoneRaw = getSettingValue(settings, "contact_phone", "01825007977");
  const emailAddr = getSettingValue(settings, "contact_email", "info@aboenterprise.com");
  const address = getSettingValue(
    settings,
    "contact_address",
    bn ? DEFAULT_ADDRESS_BN : DEFAULT_ADDRESS_EN
  );
  const mapsLink = resolveGoogleMapsLink(getSettingValue(settings, "contact_address"), address);
  const hours = bn
    ? getSettingValue(settings, "contact_hours_bn", "শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা")
    : getSettingValue(settings, "contact_hours_en", "Sat–Thu, 9:00 AM – 9:00 PM");
  const aboutText = bn
    ? getSettingValue(settings, "footer_about_bn", "ডিজিটাল যুগের সব ধরনের সমাধান আমরা সরবরাহ করি। আপনার ব্যবসা, ঘর এবং নিরাপত্তার সব কিছু আমরা আপনার সাথে।")
    : getSettingValue(settings, "footer_about_en", "We provide solutions for every need in the digital age. Your business, home, and security are in good hands with us.");
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
  // Admin-uploaded "Pay With" strip (Admin → Settings → Contact & Location).
  // When set it replaces the built-in payment-brand marks and scales to fit
  // any screen; empty falls back to the marks so nothing ever goes blank.
  const paymentImage = getSettingValue(settings, "footer_payment_image_url");

  const trustBadges = getTrustBadges(settings, []);
  const registrationsList = getRegistrations(settings, []);
  const legacyTradeLicense = getSettingValue(settings, "trade_license");
  const registrations = registrationsList.length > 0
    ? registrationsList
    : legacyTradeLicense
      ? [{ label_en: "Trade License", label_bn: "ট্রেড লাইসেন্স", value: legacyTradeLicense }]
      : [];

  const socialLinks: { href: string; icon: LucideIcon; label: string; className: string }[] = [
    {
      href: getSettingValue(settings, "facebook_url", "https://www.facebook.com/abo.enterprise"),
      icon: Facebook,
      label: "Facebook",
      className: "bg-[#1877f2]",
    },
    {
      href: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "",
      icon: MessageCircle,
      label: "WhatsApp",
      className: "bg-[#25d366]",
    },
    {
      href: getSettingValue(settings, "instagram_url"),
      icon: Instagram,
      label: "Instagram",
      className: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]",
    },
    {
      href: getSettingValue(settings, "linkedin_url"),
      icon: Linkedin,
      label: "LinkedIn",
      className: "bg-[#0a66c2]",
    },
    {
      href: getSettingValue(settings, "youtube_url"),
      icon: Youtube,
      label: "YouTube",
      className: "bg-[#ff0000]",
    },
  ].filter((item) => item.href);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await publicApi.newsletter(email.trim());
      toast("success", bn ? "সাবস্ক্রাইব হয়েছে!" : "Subscribed successfully!");
      setEmail("");
    } catch {
      toast("error", bn ? "সাবস্ক্রাইব করা যায়নি" : "Could not subscribe");
    } finally {
      setSubmitting(false);
    }
  };

  // Tries the native PWA install dialog first (this IS the "app"); only
  // falls back to the admin-configured store URL when no prompt is available
  // (already installed, iOS, or a browser without install support).
  const handleAppDownload = async (fallbackUrl: string) => {
    const outcome = await triggerInstall();
    if (outcome !== "unavailable") return;
    if (isStandalone()) {
      toast("success", bn ? "অ্যাপটি ইতিমধ্যে ইনস্টল করা আছে" : "The app is already installed");
      return;
    }
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <footer className="site-footer relative text-white overflow-hidden bg-gradient-to-b from-brand-900 via-[#0b1024] to-[#070b1a]">
      {/* Brand + gold hairline so the footer reads as part of the site rather
          than a detached dark block. */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" aria-hidden />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-40 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-6 md:py-10">

        {/* Brand + about */}
        <BrandLogo size="lg" href={false} variant="light" />
        <p className="text-[13px] text-white/75 mt-3 mb-5 leading-relaxed tracking-[0.01em]">{aboutText}</p>

        {/* Quick-action tiles */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <a href={`tel:+${phoneDigits}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] py-3 px-1 hover:bg-white/10 transition-colors">
            <span className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
              <Phone className="w-3.5 h-3.5" aria-hidden />
            </span>
            <span className="text-[10px] font-bold text-white text-center leading-tight">{bn ? "কল করুন" : "Call"}</span>
          </a>
          {whatsappDigits && (
            <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] py-3 px-1 hover:bg-white/10 transition-colors">
              <span className="w-8 h-8 rounded-xl bg-green-500/15 text-green-400 flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5" aria-hidden />
              </span>
              <span className="text-[10px] font-bold text-white text-center leading-tight">WhatsApp</span>
            </a>
          )}
          <a href={`mailto:${emailAddr}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] py-3 px-1 hover:bg-white/10 transition-colors">
            <span className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
              <Mail className="w-3.5 h-3.5" aria-hidden />
            </span>
            <span className="text-[10px] font-bold text-white text-center leading-tight">{bn ? "ইমেইল" : "Email"}</span>
          </a>
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] py-3 px-1 hover:bg-white/10 transition-colors">
            <span className="w-8 h-8 rounded-xl bg-accent-500/15 text-accent-300 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
            </span>
            <span className="text-[10px] font-bold text-white text-center leading-tight">{bn ? "ম্যাপ" : "Map"}</span>
          </a>
        </div>

        {/* Business hours + address card */}
        <div className="rounded-2xl bg-white/[0.06] p-4 mb-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-lg bg-accent-500/15 text-accent-300 flex items-center justify-center flex-shrink-0">
              <Clock className="w-3.5 h-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">
                {bn ? "কার্যসময়" : "Business Hours"}
              </p>
              <p className="text-xs font-semibold text-white mt-0.5">{hours}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-lg bg-accent-500/15 text-accent-300 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">
                {bn ? "প্রধান কার্যালয়" : "Head Office"}
              </p>
              <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-white/80 hover:text-white mt-0.5 block">
                {address}
              </a>
            </div>
          </div>
        </div>

        {/* Social */}
        <div className="flex gap-2 flex-wrap mb-5">
          {socialLinks.map(({ href, icon: Icon, label, className }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white hover:scale-105 transition-transform ${className}`}
            >
              <Icon className="w-4 h-4" aria-hidden />
            </a>
          ))}
        </div>

        {/* Nav accordions */}
        <div className="border-t border-white/10">
          {NAV_GROUPS.map((group) => (
            <details key={group.id} className="group border-b border-white/10">
              <summary className="flex items-center justify-between py-3.5 px-0.5 text-sm font-bold text-white cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                {bn ? group.title.bn : group.title.en}
                <ChevronDown className="w-4 h-4 text-white/40 transition-transform group-open:rotate-180 group-open:text-green-400" aria-hidden />
              </summary>
              <ul className="pb-3 px-0.5 space-y-0.5">
                {group.links.map((link, i) => (
                  <li key={`${link.href}-${i}`}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-2 py-1.5 px-1 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
                    >
                      <span className="w-1 h-1 rounded-full bg-white/40" />
                      {bn ? link.label.bn : link.label.en}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        {/* Trust band */}
        {trustBadges.length > 0 && (
          <div className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
              <h2 className="text-sm font-extrabold text-white">
                {bn ? "আমাদের উপর আস্থা রাখুন" : "Trust Us"}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {trustBadges.map((badge, i) => (
                <div key={i} className={`rounded-xl p-3 flex flex-col gap-2 ${TRUST_TILE_STYLES[i % TRUST_TILE_STYLES.length]}`}>
                  <span className="w-6 h-6 rounded-lg bg-white/55 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
                  </span>
                  <span className="text-[10px] font-extrabold leading-tight">
                    {bn ? badge.bn || badge.en : badge.en || badge.bn}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment methods */}
        <div className="pt-4">
          <h2 className="text-[10px] font-extrabold uppercase tracking-wide text-white/40 mb-2">
            {bn ? "পেমেন্ট পদ্ধতি সমূহ" : "Payment Methods"}
          </h2>
          {paymentImage ? (
            // Admin-uploaded strip: full-width, aspect kept, fits every screen
            // (especially mobile). White plate so logos on transparent art stay
            // visible on the dark footer.
            // eslint-disable-next-line @next/next/no-img-element -- admin-supplied strip at arbitrary size
            <img
              src={paymentImage}
              alt={bn ? "গৃহীত পেমেন্ট পদ্ধতি সমূহ" : "Accepted payment methods"}
              loading="lazy"
              className="w-full h-auto max-w-full rounded-xl bg-white p-2 shadow-sm object-contain"
            />
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {payKeys.map((key) => {
                const brand = PAY_BRAND[key];
                if (!brand) return null;
                return (
                  <div key={key} className="rounded-lg bg-white p-1.5 shadow-sm" title={brand.label}>
                    <brand.Mark className="h-4 w-auto max-w-full" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Business registrations */}
        {registrations.length > 0 && (
          <div className="pt-4">
            <h2 className="text-[10px] font-extrabold uppercase tracking-wide text-white/40 mb-2">
              {bn ? "ব্যবসায়িক তথ্য" : "Business Registrations"}
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              {registrations.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1.5">
                  <BadgeCheck className="w-3 h-3 text-brand-300 flex-shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[9.5px] text-white/50 leading-none">
                      {bn ? r.label_bn || r.label_en : r.label_en || r.label_bn}
                    </p>
                    <p className="text-[11px] font-bold text-white/90 truncate mt-0.5">{r.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter */}
        {newsletterEnabled && (
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 p-4 text-white">
            <h3 className="text-sm font-extrabold">
              {bn ? "নিউজলেটারে সাবস্ক্রাইব করুন" : "Subscribe to Newsletter"}
            </h3>
            <p className="text-[11px] opacity-90 mt-1">
              {bn
                ? "নতুন অফার, পণ্য এবং পরিষেবা সম্পর্কে প্রথম জানুন।"
                : "Get the latest offers, products, and services in your inbox."}
            </p>
            <form onSubmit={handleNewsletter} className="flex gap-2 mt-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={bn ? "আপনার ইমেইল" : "you@email.com"}
                className="flex-1 min-w-0 h-10 rounded-xl border-0 px-3 text-sm text-[#171923] bg-white/95 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={bn ? "ইমেইল ঠিকানা" : "Email address"}
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="h-10 px-4 rounded-xl bg-[#171923] text-white font-bold text-xs whitespace-nowrap disabled:opacity-50 flex-shrink-0"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" aria-hidden /> : (bn ? "সাবস্ক্রাইব" : "Subscribe")}
              </button>
            </form>
            <p className="flex items-center gap-1.5 text-[10px] opacity-85 mt-2">
              <Lock className="w-2.5 h-2.5" aria-hidden />
              {bn ? "আমরা আপনার ডেটা নিরাপদ রাখি, স্প্যাম করি না।" : "We keep your data safe and never spam."}
            </p>
          </div>
        )}

        {/* App download — triggers the PWA install prompt */}
        <div className="pt-5">
          <h3 className="text-sm font-bold text-white">
            {bn ? "আমাদের অ্যাপ ডাউনলোড করুন" : "Download Our App"}
          </h3>
          <p className="text-[11px] text-white/60 mt-0.5">
            {bn ? "যেকোনো সময় সহজেই কেনাকাটা করুন।" : "Shop anytime, anywhere."}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => handleAppDownload(playStoreUrl)}
              className="flex-1 flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/10 transition-colors px-3 py-2"
            >
              <PlayStoreMark className="w-5 h-5 flex-shrink-0" />
              <span className="text-left leading-tight">
                <span className="block text-[8px] uppercase tracking-wide text-white/55">
                  {bn ? "পাওয়া যাচ্ছে" : "Get it on"}
                </span>
                <span className="block text-[12px] font-extrabold text-white">
                  {bn ? "গুগল প্লে" : "Google Play"}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleAppDownload(appStoreUrl)}
              className="flex-1 flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/10 transition-colors px-3 py-2"
            >
              <AppStoreMark className="w-5 h-5 flex-shrink-0" />
              <span className="text-left leading-tight">
                <span className="block text-[8px] uppercase tracking-wide text-white/55">
                  {bn ? "ডাউনলোড করুন" : "Download on the"}
                </span>
                <span className="block text-[12px] font-extrabold text-white">
                  {bn ? "অ্যাপ স্টোর" : "App Store"}
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Legal */}
        <div className="border-t border-white/10 mt-6 pt-5 pb-[calc(var(--mobile-chrome-bottom)+0.5rem)] lg:pb-5 text-center space-y-2.5">
          <p className="text-xs text-white/70">
            &copy; {new Date().getFullYear()} ABO ENTERPRISE. {bn ? "সকল অধিকার সংরক্ষিত।" : "All rights reserved."}
          </p>
          <p className="flex items-center justify-center gap-2 flex-wrap text-xs font-semibold text-white/70">
            <Link href="/legal/terms" className="hover:text-accent-400 transition-colors">
              {bn ? "শর্তাবলী" : "Terms & Conditions"}
            </Link>
            <span className="text-white/30">·</span>
            <Link href="/legal/privacy" className="hover:text-accent-400 transition-colors">
              {bn ? "গোপনীয়তা নীতি" : "Privacy Policy"}
            </Link>
            <span className="text-white/30">·</span>
            <Link href="/legal/cookies" className="hover:text-accent-400 transition-colors">
              {bn ? "কুকি নীতি" : "Cookies"}
            </Link>
          </p>
          <p className="text-xs text-white/60">
            <span>{bn ? "তৈরি করেছেন" : "Developed with"}</span>
            {" ❤️ "}
            <span>{bn ? "দ্বারা" : "by"}</span>
            {" "}
            <a href="https://mumainsumon.netlify.app" target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:text-accent-400 transition-colors">
              SUMON
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
