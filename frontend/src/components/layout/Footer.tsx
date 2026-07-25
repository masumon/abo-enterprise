"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Facebook,
  MessageCircle,
  Mail,
  MapPin,
  Phone,
  Send,
  Loader2,
  PackageSearch,
  Store,
  Wrench,
  Laptop,
  Bot,
  CalendarCheck,
  Smartphone,
  Instagram,
  Linkedin,
  Youtube,
  Shield,
  Users,
  CreditCard,
  Headphones,
  Award,
  Globe,
  Truck,
  Clock,
  type LucideIcon,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import {
  VisaMark,
  MastercardMark,
  BkashMark,
  NagadMark,
  RocketMark,
  CardMark,
  CodMark,
  BankMark,
  PlayStoreMark,
  AppStoreMark,
} from "@/components/icons/PaymentIcons";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import { publicApi } from "@/lib/api";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { triggerInstall, isStandalone } from "@/lib/pwaInstall";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import {
  SITE_TRUST_BADGES_KEY,
  SITE_REGISTRATIONS_KEY,
  getTrustBadges,
  getRegistrations,
} from "@/lib/cmsContent";
import { resolveGoogleMapsLink, DEFAULT_ADDRESS_BN, DEFAULT_ADDRESS_EN } from "@/lib/maps";
import BrandLogo from "@/components/ui/BrandLogo";
import { getBrandName, getBrandTagline } from "@/lib/tokens";
import { cn } from "@/lib/utils";

/** One white card per gateway; keys match the Payments module's ids. */
const PAY_BRAND: Record<string, { label: string; Mark: (p: { className?: string }) => JSX.Element }> = {
  card: { label: "Visa", Mark: VisaMark },
  visa: { label: "Visa", Mark: VisaMark },
  mastercard: { label: "Mastercard", Mark: MastercardMark },
  bkash: { label: "bKash", Mark: BkashMark },
  nagad: { label: "Nagad", Mark: NagadMark },
  rocket: { label: "Rocket", Mark: RocketMark },
  sslcommerz: { label: "Cards", Mark: CardMark },
  cod: { label: "Cash on Delivery", Mark: CodMark },
  bank: { label: "Bank Transfer", Mark: BankMark },
};

/** Shown when the Payments module has nothing enabled yet. */
const DEFAULT_PAY = ["visa", "mastercard", "bkash", "nagad", "rocket", "cod", "bank"];

/** Primary business destinations — icon tiles (fast to recognise). */
const DESTINATIONS: { href: string; icon: LucideIcon; label: { en: string; bn: string } }[] = [
  { href: "/products", icon: Store, label: { en: "Tech Store", bn: "টেক স্টোর" } },
  { href: "/services", icon: Wrench, label: { en: "Services", bn: "সেবা" } },
  { href: "/services/software", icon: Laptop, label: { en: "Software", bn: "সফটওয়্যার" } },
  { href: "/services#ai-solutions", icon: Bot, label: { en: "AI Solutions", bn: "AI সমাধান" } },
  { href: "/track", icon: PackageSearch, label: { en: "Track Order", bn: "অর্ডার ট্র্যাক" } },
  { href: "/book", icon: CalendarCheck, label: { en: "Free Consult", bn: "ফ্রি পরামর্শ" } },
];

/** Secondary company links — deliberately no icons (icons on every link add noise). */
const COMPANY = [
  { href: "/about", label: { en: "About Us", bn: "আমাদের সম্পর্কে" } },
  { href: "/projects", label: { en: "Projects", bn: "প্রজেক্ট" } },
  { href: "/gallery", label: { en: "Gallery", bn: "গ্যালারি" } },
  { href: "/testimonials", label: { en: "Reviews", bn: "গ্রাহক পর্যালোচনা" } },
  { href: "/career", label: { en: "Careers", bn: "ক্যারিয়ার" } },
  { href: "/blog", label: { en: "Blog", bn: "ব্লগ" } },
  { href: "/faq", label: { en: "FAQ", bn: "প্রশ্নোত্তর" } },
  { href: "/shipping", label: { en: "Shipping", bn: "শিপিং তথ্য" } },
  { href: "/contact", label: { en: "Contact", bn: "যোগাযোগ" } },
];

const LEGAL = [
  { href: "/legal/privacy", labelKey: "footer_privacy" as const },
  { href: "/legal/terms", labelKey: "footer_terms" as const },
  { href: "/legal/refund", labelKey: "footer_refund" as const },
  { href: "/legal/cookies", labelKey: "footer_cookies" as const },
];

const TRUST_ICONS: Record<string, LucideIcon> = {
  shield: Shield, users: Users, card: CreditCard, support: Headphones,
  award: Award, globe: Globe, truck: Truck, store: Store, clock: Clock,
};

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

/** Small uppercase section label — the name alone carries the meaning. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="footer-section-label">{children}</p>;
}

export default function Footer() {
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const newsletterEnabled = useFeatureFlag("feature_newsletter");

  const { methods } = usePaymentMethods();
  const { settings } = usePublicSettings([
    "trade_license",
    "whatsapp_number",
    "contact_hours_en",
    "contact_hours_bn",
    "contact_phone",
    "contact_email",
    "contact_address",
    "google_maps_embed",
    "facebook_url",
    "instagram_url",
    "linkedin_url",
    "youtube_url",
    "play_store_url",
    "app_store_url",
    SITE_TRUST_BADGES_KEY,
    SITE_REGISTRATIONS_KEY,
  ]);

  const tradeLicense = getSettingValue(settings, "trade_license");
  const phoneRaw = getSettingValue(settings, "contact_phone", "01825007977");
  const emailAddr = getSettingValue(settings, "contact_email", "info@aboenterprise.com");
  const address = getSettingValue(
    settings,
    "contact_address",
    lang === "bn" ? DEFAULT_ADDRESS_BN : DEFAULT_ADDRESS_EN
  );
  const mapsLink = resolveGoogleMapsLink(getSettingValue(settings, "google_maps_embed"), address);
  const whatsappDigits = normalizePhoneDigits(getSettingValue(settings, "whatsapp_number", phoneRaw));
  const phoneDigits = normalizePhoneDigits(phoneRaw);
  const phoneDisplay = formatPhoneDisplay(phoneRaw);
  const hours = lang === "bn"
    ? getSettingValue(settings, "contact_hours_bn", "শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা")
    : getSettingValue(settings, "contact_hours_en", "Sat–Thu, 9:00 AM – 9:00 PM");

  // Gateways enabled in the Payments module drive the cards; the default set
  // keeps the row populated on a fresh install.
  const activeKeys = methods
    .filter((m) => m.is_active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m) => m.payment_gateway.toLowerCase())
    .filter((k) => k in PAY_BRAND);
  const payKeys = activeKeys.length > 0 ? activeKeys : DEFAULT_PAY;

  const playStoreUrl = getSettingValue(settings, "play_store_url") || "/";
  const appStoreUrl = getSettingValue(settings, "app_store_url") || "/";

  const trustBadges = getTrustBadges(settings, []);
  // Registrations come from the CMS list; the legacy single trade_license key
  // is used as a fallback so existing setups keep showing their licence.
  const registrations = getRegistrations(
    settings,
    tradeLicense ? [{ label_en: "Trade License", label_bn: "ট্রেড লাইসেন্স", value: tradeLicense }] : []
  );

  const socialLinks = [
    {
      href: getSettingValue(settings, "facebook_url", "https://www.facebook.com/abo.enterprise"),
      icon: Facebook,
      label: "Facebook",
    },
    { href: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "", icon: MessageCircle, label: "WhatsApp" },
    { href: emailAddr ? `mailto:${emailAddr}` : "", icon: Mail, label: "Email" },
    { href: getSettingValue(settings, "instagram_url"), icon: Instagram, label: "Instagram" },
    { href: getSettingValue(settings, "linkedin_url"), icon: Linkedin, label: "LinkedIn" },
    { href: getSettingValue(settings, "youtube_url"), icon: Youtube, label: "YouTube" },
  ].filter((item) => item.href);

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

  const handleInstall = async () => {
    if (isStandalone()) {
      toast("info", lang === "bn" ? "অ্যাপটি ইতিমধ্যে ইনস্টল করা আছে।" : "The app is already installed.");
      return;
    }
    const result = await triggerInstall();
    if (result === "accepted") {
      toast("success", lang === "bn" ? "অ্যাপ ইনস্টল হচ্ছে…" : "Installing the app…");
    } else if (result === "unavailable") {
      toast(
        "info",
        lang === "bn"
          ? "ইনস্টল করতে ব্রাউজার মেনু থেকে ‘হোম স্ক্রিনে যোগ করুন’ বেছে নিন।"
          : "To install, use your browser menu → “Add to Home screen”.",
      );
    }
  };

  return (
    <footer className="site-footer relative text-white/85 overflow-hidden">
      <div className="site-footer-accent relative z-10" aria-hidden />
      <div className="footer-glow pointer-events-none" aria-hidden />

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 space-y-6 md:space-y-8">
        {/* ── Get in touch: the highest-intent block, so it leads ── */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {lang === "bn" ? "যোগাযোগ করুন" : "Get in Touch"}
          </h2>
          <p className="text-sm text-white/60 mt-1">
            {lang === "bn"
              ? "সপ্তাহে ৬ দিন আমরা আপনার পাশে আছি।"
              : "We're here to help you 6 days a week."}
          </p>

          {/* One card per row on a phone — each is a tap target with its own
              action, so stacking keeps them comfortably large. */}
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <a href={`tel:+${phoneDigits}`} className="footer-contact-card group">
              <Phone className="w-5 h-5 text-sky-300 flex-none mt-0.5" aria-hidden />
              <span className="min-w-0">
                <span className="footer-contact-title">{lang === "bn" ? "কল করুন" : "Call Us"}</span>
                <span className="footer-contact-sub">{hours}</span>
                <span className="footer-contact-action text-sky-300">{phoneDisplay}</span>
              </span>
            </a>

            {whatsappDigits && (
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-contact-card group"
              >
                <MessageCircle className="w-5 h-5 text-green-400 flex-none mt-0.5" aria-hidden />
                <span className="min-w-0">
                  <span className="footer-contact-title">WhatsApp</span>
                  <span className="footer-contact-sub">{lang === "bn" ? "দ্রুত উত্তর" : "Quick reply"}</span>
                  <span className="footer-contact-action text-green-400">
                    {lang === "bn" ? "চ্যাট করুন" : "Chat Now"} <span aria-hidden>→</span>
                  </span>
                </span>
              </a>
            )}

            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-contact-card group sm:col-span-2 lg:col-span-1"
            >
              <MapPin className="w-5 h-5 text-purple-300 flex-none mt-0.5" aria-hidden />
              <span className="min-w-0">
                <span className="footer-contact-title">{lang === "bn" ? "দোকানে আসুন" : "Visit Store"}</span>
                <span className="footer-contact-sub">{address}</span>
                <span className="footer-contact-action text-purple-300">
                  {lang === "bn" ? "ম্যাপে দেখুন" : "View on map"} <span aria-hidden>→</span>
                </span>
              </span>
            </a>
          </div>
        </section>

        {/* ── Navigation: three equal groups, stacked on a phone ── */}
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 border-t border-white/10 pt-6 md:pt-7">
          <nav aria-label={lang === "bn" ? "কেনাকাটা ও সেবা" : "Shop and services"}>
            <SectionLabel>{lang === "bn" ? "কেনাকাটা ও সেবা" : "Shop & Services"}</SectionLabel>
            {/* Two columns: six destinations fit in three tidy rows. */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {DESTINATIONS.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} className="footer-nav-link group">
                  <Icon className="w-4 h-4 text-white/50 flex-none group-hover:text-brand-200 transition-colors" aria-hidden />
                  <span className="truncate">{lang === "bn" ? label.bn : label.en}</span>
                </Link>
              ))}
            </div>
          </nav>

          <nav aria-label={lang === "bn" ? "কোম্পানি" : "Company"}>
            <SectionLabel>{lang === "bn" ? "কোম্পানি" : "Company"}</SectionLabel>
            {/* Two columns like Shop & Services: nine links become five short
                rows instead of a nine-row column of mostly empty space. */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {COMPANY.map((link) => (
                <Link key={link.href} href={link.href} className="footer-nav-link">
                  {lang === "bn" ? link.label.bn : link.label.en}
                </Link>
              ))}
            </div>
          </nav>

          <div>
            <div>
              <SectionLabel>{lang === "bn" ? "আমাদের অনুসরণ করুন" : "Follow Us"}</SectionLabel>
              <div className="flex flex-wrap gap-2.5">
                {socialLinks.map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith("mailto:") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="footer-social-btn"
                  >
                    <Icon className="w-[18px] h-[18px]" aria-hidden />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Trust badges (admin: Homepage Content) ── */}
        {trustBadges.length > 0 && (
          <div className="border-t border-white/10 pt-6 md:pt-7">
            <SectionLabel>{lang === "bn" ? "কেন আমাদের বিশ্বাস করবেন" : "Why trust us"}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {trustBadges.map((badge, i) => {
                const Icon = TRUST_ICONS[badge.icon ?? ""] ?? Shield;
                return (
                  <span key={i} className="footer-chip">
                    <Icon className="w-3.5 h-3.5 text-amber-300 flex-none" aria-hidden />
                    {lang === "bn" ? badge.bn || badge.en : badge.en || badge.bn}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Secure payments ── */}
        <div className="border-t border-white/10 pt-6 md:pt-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-bold text-white">
              {lang === "bn" ? "নিরাপদ পেমেন্ট" : "Secure Payments"}
            </p>
            <p className="text-xs text-white/60 mt-0.5">
              {lang === "bn" ? "১০০% নিরাপদ ও বিশ্বস্ত লেনদেন" : "100% Secure & Trusted Payments"}
            </p>
          </div>
          {/* Scrolls rather than wraps on a phone, so the cards hold one
              consistent height at every width. */}
          <div className="footer-pay-scroll flex items-center gap-2 overflow-x-auto no-scrollbar lg:overflow-visible lg:flex-wrap -mx-1 px-1 lg:mx-0 lg:px-0">
            {payKeys.map((key) => {
              const brand = PAY_BRAND[key];
              if (!brand) return null;
              return (
                <span key={key} className="footer-pay-card" title={brand.label}>
                  <brand.Mark className="h-5 w-auto max-w-full" />
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Verified & registered business ── */}
        {registrations.length > 0 && (
          <div className="border-t border-white/10 pt-6 md:pt-7 flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex items-center gap-3 lg:pr-6 lg:border-r lg:border-white/10 flex-shrink-0">
              <span className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 bg-gradient-to-br from-brand-500/30 to-brand-700/20 ring-1 ring-inset ring-white/20">
                <ShieldCheck className="w-6 h-6 text-brand-200" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight">
                  {lang === "bn" ? "যাচাইকৃত ও নিবন্ধিত প্রতিষ্ঠান" : "Verified & Registered Business"}
                </p>
                <p className="text-xs text-white/55 mt-0.5">
                  {lang === "bn" ? "হাজারো গ্রাহকের আস্থা" : "Trusted by thousands of customers"}
                </p>
              </div>
            </div>

            {/* Numbers stay whole — a truncated licence number is useless. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 flex-1 min-w-0">
              {registrations.map((r, i) => (
                <div key={i} className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13px] text-white/80">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" aria-hidden />
                    <span>{lang === "bn" ? r.label_bn || r.label_en : r.label_en || r.label_bn}</span>
                  </p>
                  <p className="text-sm font-semibold text-white tabular-nums mt-0.5 pl-[22px] break-all">
                    {r.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Newsletter + app install ── */}
        <div className="border-t border-white/10 pt-6 md:pt-7 grid gap-5 lg:grid-cols-2 lg:items-center">
          {newsletterEnabled && (
            <div className="flex items-start gap-3.5">
              <span className="w-11 h-11 rounded-full grid place-items-center flex-none bg-brand-500/20 ring-1 ring-inset ring-white/15">
                <Mail className="w-5 h-5 text-brand-100" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-white">
                  {lang === "bn" ? "আপডেট পান" : "Stay Updated"}
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  {lang === "bn"
                    ? "নতুন অফার ও খবর পেতে সাবস্ক্রাইব করুন।"
                    : "Subscribe to our newsletter for latest offers and updates."}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {newsletterEnabled && (
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lang === "bn" ? "আপনার ইমেইল ঠিকানা" : "Your email address"}
                  className="footer-newsletter-input flex-1 min-w-0"
                  aria-label={t("footer_newsletter")}
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="footer-newsletter-btn flex-shrink-0"
                  aria-label={t("footer_subscribe")}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 sm:hidden" />}
                  <span className="hidden sm:inline">{t("footer_subscribe")}</span>
                </button>
              </form>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-white/60">
                {lang === "bn" ? "অ্যাপ ইনস্টল করুন" : "Install our app"}
              </span>
              <button type="button" onClick={handleInstall} className="footer-app-btn">
                <Smartphone className="w-4 h-4" aria-hidden />
                {lang === "bn" ? "ইনস্টল" : "Install App"}
              </button>
              {/* Store badges sit beside it — the same install intent, for
                  people who expect to find the app in their store. */}
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Google Play"
                className="footer-store-btn"
              >
                <PlayStoreMark className="w-4 h-4" />
              </a>
              <a
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="App Store"
                className="footer-store-btn text-white"
              >
                <AppStoreMark className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* ── Brand identity ── */}
        <div className="border-t border-white/10 pt-6 md:pt-7 flex flex-col items-center gap-3 text-center">
          <BrandLogo size="lg" href={false} variant="light" />
          <div>
            <h3 className="text-white font-bold text-lg tracking-tight">{getBrandName(lang)}</h3>
            <p className="text-white/60 text-xs mt-0.5">{getBrandTagline(lang)}</p>
          </div>
          {/* Legal sits with the brand line, not in the navigation grid — it is
              the lightest-weight content on the page. */}
          <nav className="flex flex-wrap justify-center gap-x-1 gap-y-0.5 mt-1" aria-label={t("footer_legal")}>
            {LEGAL.map((link, i) => (
              <span key={link.href} className="inline-flex items-center">
                {i > 0 && <span className="footer-dot" aria-hidden />}
                <Link href={link.href} className="footer-legal-link">{t(link.labelKey)}</Link>
              </span>
            ))}
          </nav>
        </div>
      </div>

      <div className="relative z-10 footer-bottom-bar">
        {/* Bottom padding clears the floating mobile bottom-nav (lg:hidden). */}
        <div className="container mx-auto px-4 pt-4 pb-[calc(var(--mobile-chrome-bottom)+0.75rem)] lg:pb-4 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-white/60">
            &copy; {new Date().getFullYear()} ABO Enterprise.{" "}
            {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
          </p>
          <p className="text-xs text-white/55 flex items-center gap-1.5">
            <span>{lang === "bn" ? "তৈরি করেছেন" : "Built by"}</span>
            <a
              href="https://mumainsumon.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold tracking-wide text-white bg-gradient-to-r from-brand-500/90 to-accent-500/90 border border-white/25 shadow-[0_2px_10px_rgba(233,30,99,0.35)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(233,30,99,0.5)] transition-all duration-200"
            >
              <span aria-hidden className="group-hover:scale-110 transition-transform">💻</span>
              SUMON
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
