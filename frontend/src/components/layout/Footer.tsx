"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Facebook,
  MessageCircle,
  Mail,
  MapPin,
  Phone,
  Clock,
  Send,
  Loader2,
  PackageSearch,
  ShoppingBag,
  ArrowUpRight,
  Instagram,
  Linkedin,
  Youtube,
  ChevronDown,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import { publicApi } from "@/lib/api";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { resolveGoogleMapsLink, DEFAULT_ADDRESS_BN, DEFAULT_ADDRESS_EN } from "@/lib/maps";
import BrandLogo from "@/components/ui/BrandLogo";
import { getBrandName, getBrandTagline } from "@/lib/tokens";
import { cn } from "@/lib/utils";

const SERVICES = [
  { href: "/products", label: { en: "Tech Store", bn: "টেক স্টোর" } },
  { href: "/services#digital-services", label: { en: "Digital Services", bn: "ডিজিটাল সেবা" } },
  { href: "/services#software-lab", label: { en: "Software Lab", bn: "সফটওয়্যার ল্যাব" } },
  { href: "/services#business-software", label: { en: "Business Software", bn: "বিজনেস সফটওয়্যার" } },
  { href: "/services#ai-solutions", label: { en: "AI Solutions", bn: "AI সমাধান" } },
  { href: "/contact", label: { en: "Support", bn: "সাপোর্ট" } },
];

const COMPANY = [
  { href: "/about", label: { en: "About Us", bn: "আমাদের সম্পর্কে" } },
  { href: "/projects", label: { en: "Projects", bn: "প্রজেক্ট" } },
  { href: "/gallery", label: { en: "Gallery", bn: "গ্যালারি" } },
  { href: "/testimonials", label: { en: "Testimonials", bn: "পর্যালোচনা" } },
  { href: "/career", label: { en: "Careers", bn: "ক্যারিয়ার" } },
  { href: "/faq", label: { en: "FAQ", bn: "প্রশ্নোত্তর" } },
  { href: "/blog", label: { en: "Blog", bn: "ব্লগ" } },
  { href: "/contact", label: { en: "Contact", bn: "যোগাযোগ" } },
];

const LEGAL = [
  { href: "/legal/privacy", labelKey: "footer_privacy" as const },
  { href: "/legal/terms", labelKey: "footer_terms" as const },
  { href: "/legal/refund", labelKey: "footer_refund" as const },
  { href: "/shipping", label: { en: "Shipping", bn: "শিপিং" } },
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

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "footer-link group inline-flex items-center gap-1.5 text-sm text-white/75 transition-colors duration-200";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-70 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function FooterColumn({
  title,
  children,
  ringDelay = "0s",
}: {
  title: string;
  children: React.ReactNode;
  /** Stagger for the mobile blinking-ring hint so the three columns pulse in sequence. */
  ringDelay?: string;
}) {
  // Collapsible on mobile (keeps the footer short & tidy); always open on sm+.
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 pb-3 sm:border-0 sm:pb-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ animationDelay: ringDelay }}
        className={cn(
          "w-full flex items-center justify-between gap-2 sm:pointer-events-none",
          // Round blinking ring on mobile draws the eye to the tappable header row.
          "footer-acc-ring border-2 border-transparent rounded-xl px-3 py-2 -mx-1",
          "sm:border-0 sm:rounded-none sm:px-0 sm:py-0 sm:mx-0"
        )}
      >
        <h4 className="footer-column-title !mb-0 sm:!mb-4 flex items-center gap-2">
          {/* Pulsing accent dot on mobile draws the eye to the tappable section. */}
          <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse motion-reduce:animate-none" aria-hidden />
          {title}
        </h4>
        <div className="flex items-center gap-1.5 sm:hidden">
          <span className="text-[10px] font-semibold text-amber-300/90 animate-pulse motion-reduce:animate-none" aria-hidden>{open ? "" : "ট্যাপ"}</span>
          <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform duration-200", open ? "rotate-180 text-white/50" : "text-amber-300 animate-pulse motion-reduce:animate-none")} aria-hidden />
        </div>
      </button>
      <div className={cn("grid transition-all duration-300 sm:!grid-rows-[1fr] sm:!opacity-100", open ? "grid-rows-[1fr] opacity-100 mt-3 sm:mt-0" : "grid-rows-[0fr] opacity-0 sm:opacity-100")}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

export default function Footer() {
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const newsletterEnabled = useFeatureFlag("feature_newsletter");

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

  const quickActions = [
    {
      href: "/track",
      icon: PackageSearch,
      label: lang === "bn" ? "অর্ডার ট্র্যাক" : "Track Order",
    },
    {
      href: "/products",
      icon: ShoppingBag,
      label: lang === "bn" ? "পণ্য দেখুন" : "Shop Products",
    },
    {
      href: "/contact",
      icon: MessageCircle,
      label: lang === "bn" ? "যোগাযোগ" : "Contact Us",
    },
  ];

  const socialLinks = [
    {
      href: getSettingValue(settings, "facebook_url", "https://www.facebook.com/abo.enterprise"),
      icon: Facebook,
      label: "Facebook",
      className: "hover:bg-blue-600 hover:border-blue-500/50 hover:shadow-blue-500/20",
    },
    {
      href: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "",
      icon: MessageCircle,
      label: "WhatsApp",
      className: "hover:bg-green-600 hover:border-green-500/50 hover:shadow-green-500/20",
    },
    {
      href: emailAddr ? `mailto:${emailAddr}` : "",
      icon: Mail,
      label: "Email",
      className: "hover:bg-accent-500 hover:border-accent-400/50 hover:shadow-accent-500/20",
    },
    {
      href: getSettingValue(settings, "instagram_url"),
      icon: Instagram,
      label: "Instagram",
      className: "hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500 hover:border-pink-400/50",
    },
    {
      href: getSettingValue(settings, "linkedin_url"),
      icon: Linkedin,
      label: "LinkedIn",
      className: "hover:bg-blue-700 hover:border-blue-600/50",
    },
    {
      href: getSettingValue(settings, "youtube_url"),
      icon: Youtube,
      label: "YouTube",
      className: "hover:bg-red-600 hover:border-red-500/50 hover:shadow-red-500/20",
    },
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

      <div className="relative z-10 border-b border-white/[0.06]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              {lang === "bn" ? "দ্রুত লিংক" : "Quick links"}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {quickActions.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} className="footer-quick-action">
                  <Icon className="w-4 h-4 text-brand-300" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-10 xl:gap-8">
          <div className="sm:col-span-2 xl:col-span-4">
            <div className="flex items-center gap-3.5 mb-5">
              <BrandLogo size="lg" href={false} variant="light" />
              <div>
                <h3 className="text-white font-bold text-xl tracking-tight">{getBrandName(lang)}</h3>
                <p className="text-brand-100 text-xs font-semibold mt-0.5">: {getBrandTagline(lang)}</p>
              </div>
            </div>

            <p className="text-sm text-white/75 leading-relaxed mb-6 max-w-md">
              {lang === "bn"
                ? "মোবাইল এক্সেসরিজ থেকে AI সমাধান — বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম।"
                : "From mobile accessories to AI solutions — Bangladesh's complete technology ecosystem."}
            </p>

            {newsletterEnabled && (
              <div className="footer-newsletter max-w-md">
                <p className="text-sm font-medium text-white mb-2">{t("footer_newsletter")}</p>
                <form onSubmit={handleNewsletter} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={lang === "bn" ? "আপনার ইমেইল" : "Your email address"}
                    className="footer-newsletter-input flex-1 min-w-0"
                    aria-label={t("footer_newsletter")}
                    required
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="footer-newsletter-btn flex-shrink-0"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{t("footer_subscribe")}</span>
                  </button>
                </form>
                <p className="text-xs text-gray-500 mt-2.5">{t("footer_newsletter_sub")}</p>
              </div>
            )}
          </div>

          <div className="xl:col-span-2">
            <FooterColumn title={lang === "bn" ? "ব্যবসা" : "Business"} ringDelay="0s">
              <ul className="space-y-2.5">
                {SERVICES.map((s) => (
                  <li key={s.href + s.label.en}>
                    <FooterLink href={s.href}>
                      {lang === "bn" ? s.label.bn : s.label.en}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </FooterColumn>
          </div>

          <div className="xl:col-span-2">
            <FooterColumn title={t("footer_company")} ringDelay="0.3s">
              <ul className="space-y-2.5">
                {COMPANY.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>
                      {lang === "bn" ? link.label.bn : link.label.en}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </FooterColumn>
          </div>

          <div className="sm:col-span-2 xl:col-span-4">
            <FooterColumn title={t("footer_legal")} ringDelay="0.6s">
              <ul className="space-y-2.5 mb-6">
                {LEGAL.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>
                      {"labelKey" in link && link.labelKey
                        ? t(link.labelKey)
                        : lang === "bn"
                          ? link.label!.bn
                          : link.label!.en}
                    </FooterLink>
                  </li>
                ))}
              </ul>

              <div className="footer-contact-card">
                <ul className="space-y-3 text-sm">
                  <li>
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 text-white/75 hover:text-white transition-colors group"
                    >
                      <span className="footer-contact-icon">
                        <MapPin className="w-4 h-4" />
                      </span>
                      <span className="pt-0.5 leading-relaxed">{address}</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href={`tel:+${phoneDigits}`}
                      className="flex items-center gap-3 text-white/75 hover:text-white transition-colors"
                    >
                      <span className="footer-contact-icon">
                        <Phone className="w-4 h-4" />
                      </span>
                      {phoneDisplay}
                    </a>
                  </li>
                  <li className="flex items-center gap-3 text-white/75">
                    <span className="footer-contact-icon">
                      <Clock className="w-4 h-4" />
                    </span>
                    {hours}
                  </li>
                </ul>

                <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-white/[0.06]">
                  {socialLinks.map(({ href, icon: Icon, label, className }) => (
                    <a
                      key={label}
                      href={href}
                      target={href.startsWith("mailto:") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      aria-label={label}
                      className={cn("footer-social-btn", className)}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            </FooterColumn>
          </div>
        </div>
      </div>

      <div className="relative z-10 footer-bottom-bar">
        {/* Extra bottom padding below lg keeps the copyright + developer credit
            clear of the floating mobile bottom-nav (which is lg:hidden). */}
        <div className="container mx-auto px-4 pt-5 pb-[calc(76px+env(safe-area-inset-bottom,0px))] lg:pb-5 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="text-xs text-white/60 space-y-1">
            <p>
              &copy; {new Date().getFullYear()} ABO Enterprise.{" "}
              {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
            </p>
            {tradeLicense && (
              <p className="text-white/50">
                {lang === "bn" ? "ট্রেড লাইসেন্স:" : "Trade License:"}{" "}
                <span className="text-white/65">{tradeLicense}</span>
              </p>
            )}
          </div>
          <p className="text-xs text-white/55 flex items-center justify-center md:justify-end gap-1.5">
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
