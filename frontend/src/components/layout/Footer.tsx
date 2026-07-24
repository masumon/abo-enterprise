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
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import { publicApi } from "@/lib/api";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
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
];

const TRUST_ICONS: Record<string, LucideIcon> = {
  shield: Shield, users: Users, card: CreditCard, support: Headphones,
  award: Award, globe: Globe, truck: Truck, store: Store, clock: Clock,
};

/** Payment gateway wordmark styling — brand colour on a white chip. */
const PAY_BRAND: Record<string, { label: string; className: string }> = {
  bkash: { label: "bKash", className: "text-[#e2136e]" },
  nagad: { label: "Nagad", className: "text-[#ec1c24]" },
  rocket: { label: "Rocket", className: "text-[#8b1a9b]" },
  sslcommerz: { label: "SSLCOMMERZ", className: "text-[#1e5ba8]" },
  card: { label: "Visa · Mastercard", className: "text-[#1a1f71]" },
  cod: { label: "ক্যাশ অন ডেলিভারি", className: "text-[#0f766e]" },
  bank: { label: "Bank Transfer", className: "text-[#0f172a]" },
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

  const trustBadges = getTrustBadges(settings, []);
  // Registrations come from the CMS list; the legacy single trade_license key
  // is used as a fallback so existing setups keep showing their licence.
  const registrations = getRegistrations(
    settings,
    tradeLicense ? [{ label_en: "Trade License", label_bn: "ট্রেড লাইসেন্স", value: tradeLicense }] : []
  );
  const payments = methods
    .filter((m) => m.is_active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

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

  return (
    <footer className="site-footer relative text-white/85 overflow-hidden">
      <div className="site-footer-accent relative z-10" aria-hidden />
      <div className="footer-glow pointer-events-none" aria-hidden />

      <div className="relative z-10 container mx-auto px-4 py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          {/* ── Contact: the highest-intent block, so it leads ── */}
          <section className="lg:col-span-5 xl:col-span-4">
            <SectionLabel>{lang === "bn" ? "যোগাযোগ করুন" : "Get in touch"}</SectionLabel>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <a href={`tel:+${phoneDigits}`} className="footer-action">
                <Phone className="w-[18px] h-[18px] text-sky-300" aria-hidden />
                <span className="footer-action-sub">{hours}</span>
                <span className="footer-action-value">{phoneDisplay}</span>
              </a>
              {whatsappDigits && (
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-action"
                >
                  <MessageCircle className="w-[18px] h-[18px] text-sky-300" aria-hidden />
                  <span className="footer-action-sub">{lang === "bn" ? "দ্রুত উত্তর" : "Quick reply"}</span>
                  <span className="footer-action-value">WhatsApp</span>
                </a>
              )}
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-action col-span-2 flex-row items-center gap-3"
              >
                <MapPin className="w-[18px] h-[18px] text-sky-300 flex-none" aria-hidden />
                <span className="flex flex-col min-w-0">
                  <span className="footer-action-sub">{address}</span>
                  <span className="text-[13px] font-semibold text-white">
                    {lang === "bn" ? "ম্যাপে দেখুন →" : "View on map →"}
                  </span>
                </span>
              </a>
            </div>
          </section>

          {/* ── Destinations: icon tiles for the six real business paths ── */}
          <nav className="lg:col-span-4" aria-label={lang === "bn" ? "কেনাকাটা ও সেবা" : "Shop and services"}>
            <SectionLabel>{lang === "bn" ? "কেনাকাটা ও সেবা" : "Shop & services"}</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {DESTINATIONS.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} className="footer-tile">
                  <Icon className="w-4 h-4 text-white/70 flex-none" aria-hidden />
                  <span className="truncate">{lang === "bn" ? label.bn : label.en}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* ── Company: secondary, inline-wrapped so nine links take two rows ── */}
          <nav className="lg:col-span-3 xl:col-span-4" aria-label={lang === "bn" ? "কোম্পানি" : "Company"}>
            <SectionLabel>{lang === "bn" ? "কোম্পানি" : "Company"}</SectionLabel>
            <div className="flex flex-wrap gap-y-0.5">
              {COMPANY.map((link, i) => (
                <span key={link.href} className="inline-flex items-center">
                  {i > 0 && <span className="footer-dot" aria-hidden />}
                  <Link href={link.href} className="footer-inline-link">
                    {lang === "bn" ? link.label.bn : link.label.en}
                  </Link>
                </span>
              ))}
            </div>
          </nav>
        </div>

        {/* ── Trust badges (admin: Homepage Content) ── */}
        {trustBadges.length > 0 && (
          <div className="mt-8">
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

        {/* ── Payment gateways (admin: Payments module) ── */}
        {payments.length > 0 && (
          <div className="mt-8">
            <SectionLabel>{lang === "bn" ? "নিরাপদ লেনদেন" : "Secure payments"}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {payments.map((m) => {
                const brand = PAY_BRAND[m.payment_gateway.toLowerCase()];
                return (
                  <span key={m.id} className={cn("footer-pay", brand?.className ?? "text-gray-900")}>
                    {brand?.label ?? m.payment_gateway}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Registrations (admin: Settings) ── */}
        {registrations.length > 0 && (
          <div className="mt-8">
            <SectionLabel>{lang === "bn" ? "স্বীকৃতি ও নিবন্ধন" : "Registrations"}</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {registrations.map((r, i) => (
                <div key={i} className="footer-reg">
                  <span className="footer-reg-label">{lang === "bn" ? r.label_bn || r.label_en : r.label_en || r.label_bn}</span>
                  <span className="footer-reg-value">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Brand card: identity, newsletter, app install, social ── */}
        <div className="footer-brand-card mt-8">
          <div className="flex items-center gap-3.5">
            <BrandLogo size="lg" href={false} variant="light" />
            <div className="min-w-0">
              <h3 className="text-white font-bold text-lg tracking-tight truncate">{getBrandName(lang)}</h3>
              <p className="text-brand-100 text-xs font-semibold mt-0.5 truncate">: {getBrandTagline(lang)}</p>
            </div>
          </div>

          {newsletterEnabled && (
            <form onSubmit={handleNewsletter} className="flex gap-2 sm:max-w-md">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={lang === "bn" ? "নিউজলেটার — আপনার ইমেইল" : "Newsletter — your email"}
                className="footer-newsletter-input flex-1 min-w-0"
                aria-label={t("footer_newsletter")}
                required
              />
              <button type="submit" disabled={submitting} className="footer-newsletter-btn flex-shrink-0" aria-label={t("footer_subscribe")}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">{t("footer_subscribe")}</span>
              </button>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/products" className="footer-app-btn">
              <Smartphone className="w-4 h-4" aria-hidden />
              {lang === "bn" ? "অ্যাপের মতো ব্যবহার করুন" : "Use as an app"}
            </Link>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="footer-social-btn"
                >
                  <Icon className="w-4 h-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Legal: the lightest weight on the page ── */}
        <nav className="mt-7 flex flex-wrap justify-center gap-y-0.5" aria-label={t("footer_legal")}>
          {LEGAL.map((link, i) => (
            <span key={link.href} className="inline-flex items-center">
              {i > 0 && <span className="footer-dot" aria-hidden />}
              <Link href={link.href} className="footer-legal-link">{t(link.labelKey)}</Link>
            </span>
          ))}
        </nav>
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
