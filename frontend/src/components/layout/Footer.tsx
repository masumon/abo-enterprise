"use client";

import { useEffect, useState, type ElementType, type JSX } from "react";
import { getBusinessHours } from "@/lib/businessHours";
import Link from "next/link";
import { Facebook, MessageCircle, Mail, MapPin, Phone, Loader2, Instagram, Linkedin, Youtube, ChevronDown, CheckCircle2, BadgeCheck, Clock, Lock } from "lucide-react";
import { VisaMark, MastercardMark, BkashMark, NagadMark, RocketMark, CardMark, PlayStoreMark, AppStoreMark } from "@/components/icons/PaymentIcons";
import TikTokIcon from "@/components/icons/TikTokIcon";
import { useLanguageStore } from "@/store/language";
import DeveloperCredit from "@/components/layout/DeveloperCredit";
import { AponFooterBadge, useAponFooterVisible } from "@/components/apon/AponEntryPoints";
import { useToastStore } from "@/store/toast";
import { publicApi } from "@/lib/api";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { SITE_TRUST_BADGES_KEY, getTrustBadges, SITE_REGISTRATIONS_KEY, getRegistrations } from "@/lib/cmsContent";
import { resolveGoogleMapsLink, resolveAddress } from "@/lib/maps";
import { triggerInstall, isStandalone } from "@/lib/pwaInstall";
import BrandLogo from "@/components/ui/BrandLogo";

const PAY_BRAND: Record<string, { label: string; Mark: (p: { className?: string }) => JSX.Element }> = {
  card: { label: "Visa", Mark: VisaMark }, visa: { label: "Visa", Mark: VisaMark }, mastercard: { label: "Mastercard", Mark: MastercardMark },
  bkash: { label: "bKash", Mark: BkashMark }, nagad: { label: "Nagad", Mark: NagadMark }, rocket: { label: "Rocket", Mark: RocketMark }, sslcommerz: { label: "SSLCommerz", Mark: CardMark },
};
const DEFAULT_PAY = ["visa", "mastercard", "bkash", "nagad", "rocket", "sslcommerz"];
const QUICK_LINKS = [
  { href: "/", label: { en: "Home", bn: "হোম" } }, { href: "/products", label: { en: "Products", bn: "পণ্য" } }, { href: "/services", label: { en: "Services", bn: "সেবা" } },
  { href: "/services/software", label: { en: "Software", bn: "সফটওয়্যার" } }, { href: "/projects", label: { en: "Projects", bn: "প্রকল্প" } }, { href: "/blog", label: { en: "Blog", bn: "ব্লগ" } }, { href: "/about", label: { en: "About", bn: "সম্পর্কে" } },
];
const SERVICES_LINKS = [
  { href: "/services", label: { en: "All Services", bn: "সব সেবা" } }, { href: "/services#web", label: { en: "Web Development", bn: "ওয়েব ডেভেলপমেন্ট" } }, { href: "/services#mobile", label: { en: "Mobile App", bn: "মোবাইল অ্যাপ" }, },
  { href: "/services#software", label: { en: "Software", bn: "সফটওয়্যার" } }, { href: "/services#graphics", label: { en: "Graphics Design", bn: "গ্রাফিক্স ডিজাইন" } }, { href: "/services#ecommerce", label: { en: "E-Commerce", bn: "ই-কমার্স" } },
];
const CUSTOMER_CARE_LINKS = [
  { href: "/faq", label: { en: "FAQ", bn: "সাধারণ প্রশ্ন" } }, { href: "/contact", label: { en: "Contact", bn: "যোগাযোগ করুন" } }, { href: "/contact", label: { en: "Warranty", bn: "ওয়ারেন্টি" } },
  { href: "/legal/refund", label: { en: "Returns", bn: "রিটার্ন নীতি" } }, { href: "/track", label: { en: "Track Order", bn: "অর্ডার ট্র্যাক করুন" } }, { href: "/faq", label: { en: "Support / Support Ticket", bn: "সহায়তা / সাপোর্ট টিকেট" } },
];
const NAV_GROUPS = [
  { id: "quick", title: { en: "Quick Links", bn: "কুইক লিংকস" }, links: QUICK_LINKS }, { id: "services", title: { en: "Our Services", bn: "সেবা সমূহ" }, links: SERVICES_LINKS }, { id: "care", title: { en: "Customer Care", bn: "কাস্টমার সেবা" }, links: CUSTOMER_CARE_LINKS },
];
const TRUST_TILE_STYLES = [
  "bg-accent-50 text-accent-800 dark:bg-accent-500/10 dark:text-accent-300", "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300", "bg-accent-100 text-accent-900 dark:bg-accent-500/15 dark:text-accent-200", "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200",
];
function normalizePhoneDigits(phone: string) { const digits = phone.replace(/\D/g, ""); if (digits.startsWith("880")) return digits; if (digits.startsWith("0")) return `880${digits.slice(1)}`; return digits ? `880${digits}` : ""; }
function formatPhoneDisplay(phone: string) { const digits = normalizePhoneDigits(phone); const local = digits.slice(3); if (local.length >= 10) return `+880 ${local.slice(0, 4)} ${local.slice(4)}`; return phone; }

export default function Footer() {
  const aponFooter = useAponFooterVisible();
  // Desktop shows the link groups expanded in columns; mobile keeps the accordion.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const { lang } = useLanguageStore(); const bn = lang === "bn"; const toast = useToastStore((s) => s.push); const [email, setEmail] = useState(""); const [submitting, setSubmitting] = useState(false); const newsletterEnabled = useFeatureFlag("feature_newsletter");
  const { methods } = usePaymentMethods();
  const { settings } = usePublicSettings(["whatsapp_number", "contact_phone", "contact_email", "contact_address", "contact_address_en", "contact_hours_en", "contact_hours_bn", "footer_about_en", "footer_about_bn", "facebook_url", "instagram_url", "linkedin_url", "youtube_url", "tiktok_url", "play_store_url", "app_store_url", "footer_app_title_en", "footer_app_title_bn", "footer_app_subtitle_en", "footer_app_subtitle_bn", "trade_license", "footer_payment_image_url", "site_name", SITE_TRUST_BADGES_KEY, SITE_REGISTRATIONS_KEY]);
  const brandName = getSettingValue(settings, "site_name", "ABO ENTERPRISE");

  const phoneRaw = getSettingValue(settings, "contact_phone");
  const emailAddr = getSettingValue(settings, "contact_email");
  const address = resolveAddress(settings, lang);
  const mapsLink = resolveGoogleMapsLink(getSettingValue(settings, "contact_address"), address);
  const hours = getBusinessHours(settings, bn ? "bn" : "en");
  const aboutText = bn ? getSettingValue(settings, "footer_about_bn") : getSettingValue(settings, "footer_about_en");
  const whatsappDigits = normalizePhoneDigits(getSettingValue(settings, "whatsapp_number") || phoneRaw);
  const phoneDigits = normalizePhoneDigits(phoneRaw);
  const phoneDisplay = formatPhoneDisplay(phoneRaw);
  const phoneConfigured = Boolean(phoneRaw.trim()); const emailConfigured = Boolean(emailAddr.trim());

  const activeKeys = [...new Set(methods.filter((m) => m.is_active).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((m) => m.payment_gateway.toLowerCase()).filter((k) => k in PAY_BRAND))];
  const payKeys = activeKeys.length > 0 ? activeKeys : DEFAULT_PAY;
  const playStoreUrl = getSettingValue(settings, "play_store_url"); const appStoreUrl = getSettingValue(settings, "app_store_url"); const paymentImage = getSettingValue(settings, "footer_payment_image_url");
    // App block copy: Apon is a personal-organiser app, so the default line is about Apon, not shopping.
  const hasStoreApp = Boolean(playStoreUrl || appStoreUrl); const aponOnly = aponFooter && !hasStoreApp;
  const appTitleDefault = aponOnly ? (bn ? "আপন অ্যাপ ডাউনলোড করুন" : "Get the Apon app") : (bn ? "আমাদের অ্যাপ ডাউনলোড করুন" : "Download Our App");
  const appSubDefault = aponOnly ? (bn ? "কাজ, টাকা, ওষুধ — সব এক খাতায়, আপনার ফোনেই।" : "Tasks, money, medicines — one notebook, on your phone.") : aponFooter ? "" : (bn ? "যেকোনো সময় সহজেই কেনাকাটা করুন।" : "Shop anytime, anywhere.");
  const appTitle = getSettingValue(settings, bn ? "footer_app_title_bn" : "footer_app_title_en") || appTitleDefault;
  const appSub = getSettingValue(settings, bn ? "footer_app_subtitle_bn" : "footer_app_subtitle_en") || appSubDefault;
  const appMeta = aponOnly ? (bn ? "ফ্রি · Android · ইন্টারনেট ছাড়াই চলে" : "Free · Android · works offline") : "";
  const trustBadges = getTrustBadges(settings, []); const registrationsList = getRegistrations(settings, []); const legacyTradeLicense = getSettingValue(settings, "trade_license");
  const registrations = registrationsList.length > 0 ? registrationsList : legacyTradeLicense ? [{ label_en: "Trade License", label_bn: "ট্রেড লাইসেন্স", value: legacyTradeLicense }] : [];
  const socialLinks: { href: string; icon: ElementType; label: string; className: string }[] = [
    { href: getSettingValue(settings, "facebook_url"), icon: Facebook, label: "Facebook", className: "bg-[#1877f2]" },
    { href: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "", icon: MessageCircle, label: "WhatsApp", className: "bg-[#25d366]" },
    { href: getSettingValue(settings, "instagram_url"), icon: Instagram, label: "Instagram", className: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" },
    { href: getSettingValue(settings, "linkedin_url"), icon: Linkedin, label: "LinkedIn", className: "bg-[#0a66c2]" },
    { href: getSettingValue(settings, "youtube_url"), icon: Youtube, label: "YouTube", className: "bg-[#ff0000]" },
    { href: getSettingValue(settings, "tiktok_url"), icon: TikTokIcon, label: "TikTok", className: "bg-black" },
  ].filter((item) => item.href);

  const handleNewsletter = async (e: React.FormEvent) => { e.preventDefault(); if (!email.trim()) return; setSubmitting(true); try { await publicApi.newsletter(email.trim()); toast("success", bn ? "সাবস্ক্রাইব হয়েছে!" : "Subscribed successfully!"); setEmail(""); } catch { toast("error", bn ? "সাবস্ক্রাইব করা যায়নি" : "Could not subscribe"); } finally { setSubmitting(false); } };
  const handleAppDownload = async (fallbackUrl: string) => { const outcome = await triggerInstall(); if (outcome !== "unavailable") return; if (isStandalone()) { toast("success", bn ? "অ্যাপটি ইতিমধ্যে ইনস্টল করা আছে" : "The app is already installed"); return; } if (fallbackUrl) window.open(fallbackUrl, "_blank", "noopener,noreferrer"); };

  return (
    <footer className="site-footer relative text-white overflow-hidden bg-gradient-to-b from-brand-700 via-brand-800 to-brand-900">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" aria-hidden /><div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-40 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="relative z-10 mx-auto max-w-3xl lg:max-w-6xl px-4 py-6 md:py-10"><div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start"><div><BrandLogo size="lg" href={false} variant="light" />{aboutText && <p className="text-[13px] text-white/75 mt-3 mb-5 leading-relaxed tracking-[0.01em]">{aboutText}</p>}

        <div className="grid grid-cols-4 gap-2 mb-5">
          {phoneConfigured && <a href={`tel:+${phoneDigits}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 min-h-[64px] py-3 px-1 hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400"><span className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center"><Phone className="w-3.5 h-3.5" aria-hidden /></span><span className="text-[11px] font-bold text-white text-center leading-tight">{bn ? "কল করুন" : "Call"}</span></a>}
          {whatsappDigits && <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 min-h-[64px] py-3 px-1 hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400"><span className="w-8 h-8 rounded-xl bg-green-500/15 text-green-400 flex items-center justify-center"><MessageCircle className="w-3.5 h-3.5" aria-hidden /></span><span className="text-[11px] font-bold text-white text-center leading-tight">WhatsApp</span></a>}
          {emailConfigured && <a href={`mailto:${emailAddr}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 min-h-[64px] py-3 px-1 hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400"><span className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center"><Mail className="w-3.5 h-3.5" aria-hidden /></span><span className="text-[11px] font-bold text-white text-center leading-tight">{bn ? "ইমেইল" : "Email"}</span></a>}
          {mapsLink && <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 min-h-[64px] py-3 px-1 hover:bg-white/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400"><span className="w-8 h-8 rounded-xl bg-accent-500/15 text-accent-300 flex items-center justify-center"><MapPin className="w-3.5 h-3.5" aria-hidden /></span><span className="text-[11px] font-bold text-white text-center leading-tight">{bn ? "ম্যাপ" : "Map"}</span></a>}
        </div>
        </div>
        <div>
        {(hours || address) && <div className="rounded-2xl bg-white/[0.06] p-4 mb-5 space-y-3">
          {hours && <div className="flex items-start gap-3"><span className="w-7 h-7 rounded-lg bg-accent-500/15 text-accent-300 flex items-center justify-center flex-shrink-0"><Clock className="w-3.5 h-3.5" aria-hidden /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-white/70">{bn ? "কার্যসময়" : "Business Hours"}</p><p className="text-xs font-semibold text-white mt-0.5">{hours}</p></div></div>}
          {address && <div className="flex items-start gap-3"><span className="w-7 h-7 rounded-lg bg-accent-500/15 text-accent-300 flex items-center justify-center flex-shrink-0"><MapPin className="w-3.5 h-3.5" aria-hidden /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-white/70">{bn ? "প্রধান কার্যালয়" : "Head Office"}</p>{mapsLink ? <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-white/80 hover:text-white mt-0.5 block">{address}</a> : <span className="text-xs font-semibold text-white/80 mt-0.5 block">{address}</span>}</div></div>}
        </div>}

        {socialLinks.length > 0 && <div className="flex gap-2.5 flex-wrap mb-5">{socialLinks.map(({ href, icon: Icon, label, className }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={`w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white ring-1 ring-white/10 hover:scale-105 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400 ${className}`}><Icon className="w-4 h-4" aria-hidden /></a>)}</div>}
        </div></div>

        <div className="border-t border-white/10 lg:grid lg:grid-cols-3 lg:gap-x-10 lg:pt-4">{NAV_GROUPS.map((group) => <details key={group.id} open={wide} className="group border-b border-white/10 lg:border-b-0"><summary className="flex items-center justify-between py-3.5 px-0.5 text-sm font-bold text-white cursor-pointer list-none [&::-webkit-details-marker]:hidden lg:cursor-default lg:pointer-events-none">{bn ? group.title.bn : group.title.en}<ChevronDown className="w-4 h-4 text-white/75 transition-transform group-open:rotate-180 group-open:text-green-400 lg:hidden" aria-hidden /></summary><ul className="pb-3 px-0.5 space-y-0.5">{group.links.map((link, i) => <li key={`${link.href}-${i}`}><Link href={link.href} className="flex items-center gap-2 min-h-[44px] lg:min-h-0 py-1.5 px-1 rounded-lg text-[13px] text-white/90 hover:text-white hover:bg-white/[0.05] transition-colors"><span className="w-1 h-1 rounded-full bg-white/40" />{bn ? link.label.bn : link.label.en}</Link></li>)}</ul></details>)}</div>

        {trustBadges.length > 0 && <div className="pt-5"><div className="flex items-center gap-2 mb-3"><span className="w-1.5 h-1.5 rounded-full bg-accent-400" /><h2 className="text-sm font-extrabold text-white">{bn ? "আমাদের উপর আস্থা রাখুন" : "Trust Us"}</h2></div><div className="grid grid-cols-2 gap-2">{trustBadges.map((badge, i) => <div key={i} className={`rounded-xl p-3 flex flex-col gap-2 ${TRUST_TILE_STYLES[i % TRUST_TILE_STYLES.length]}`}><span className="w-6 h-6 rounded-lg bg-white/55 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden /></span><span className="text-[10px] font-extrabold leading-tight">{bn ? badge.bn || badge.en : badge.en || badge.bn}</span></div>)}</div></div>}

        <div className="pt-4 lg:max-w-2xl"><h2 className="text-[10px] font-extrabold uppercase tracking-wide text-white/75 mb-2">{bn ? "পেমেন্ট পদ্ধতি সমূহ" : "Payment Methods"}</h2>{paymentImage ? <img src={paymentImage} alt={bn ? "গৃহীত পেমেন্ট পদ্ধতি সমূহ" : "Accepted payment methods"} loading="lazy" className="w-full h-auto max-w-full rounded-xl bg-white p-2 shadow-sm object-contain" /> : <div className="flex items-center gap-1.5 flex-wrap">{payKeys.map((key) => { const brand = PAY_BRAND[key]; if (!brand) return null; return <div key={key} className="rounded-lg bg-white p-1.5 shadow-sm" title={brand.label}><brand.Mark className="h-4 w-auto max-w-full" /></div>; })}</div>}</div>

        {registrations.length > 0 && <div className="pt-4"><h2 className="text-[10px] font-extrabold uppercase tracking-wide text-white/75 mb-2">{bn ? "ব্যবসায়িক তথ্য" : "Business Registrations"}</h2><div className="grid grid-cols-3 gap-2 lg:max-w-xl">{registrations.map((r, i) => <div key={i} className="flex min-w-0 items-start gap-1.5 rounded-xl bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-2"><BadgeCheck className="w-3.5 h-3.5 mt-0.5 text-brand-300 flex-shrink-0" aria-hidden /><div className="min-w-0"><p className="text-[10px] text-white/70 leading-tight">{bn ? r.label_bn || r.label_en : r.label_en || r.label_bn}</p><p className="text-[11px] sm:text-xs font-bold text-white/90 break-all mt-0.5 tabular-nums">{r.value}</p></div></div>)}</div></div>}

        {newsletterEnabled && <div className="mt-5 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 p-4 text-white"><h3 className="text-sm font-extrabold">{bn ? "নিউজলেটারে সাবস্ক্রাইব করুন" : "Subscribe to Newsletter"}</h3><p className="text-[11px] opacity-90 mt-1">{bn ? "নতুন অফার, পণ্য এবং পরিষেবা সম্পর্কে প্রথম জানুন।" : "Get the latest offers, products, and services in your inbox."}</p><form onSubmit={handleNewsletter} className="flex gap-2 mt-3"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={bn ? "আপনার ইমেইল" : "you@email.com"} className="flex-1 min-w-0 h-10 rounded-xl border-0 px-3 text-sm text-[#171923] bg-white/95 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white" aria-label={bn ? "ইমেইল ঠিকানা" : "Email address"} required /><button type="submit" disabled={submitting} className="h-10 px-4 rounded-xl bg-[#171923] text-white font-bold text-xs whitespace-nowrap disabled:opacity-50 flex-shrink-0">{submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" aria-hidden /> : (bn ? "সাবস্ক্রাইব" : "Subscribe")}</button></form><p className="flex items-center gap-1.5 text-[10px] opacity-85 mt-2"><Lock className="w-2.5 h-2.5" aria-hidden />{bn ? "আমরা আপনার ডেটা নিরাপদ রাখি, স্প্যাম করি না।" : "We keep your data safe and never spam."}</p></div>}

        {(playStoreUrl || appStoreUrl || aponFooter) && <div className="pt-6"><h3 className="text-sm font-bold text-white">{appTitle}</h3>{appSub && <p className="text-xs text-white/80 mt-1 leading-relaxed">{appSub}</p>}{appMeta && <p className="text-[11px] font-semibold text-accent-300 mt-1">{appMeta}</p>}<div className="flex flex-col gap-2 mt-3 sm:flex-row lg:max-w-xl"><AponFooterBadge />{playStoreUrl && <button type="button" onClick={() => handleAppDownload(playStoreUrl)} className="flex-1 flex items-center gap-2 min-h-[44px] rounded-xl bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/10 transition-colors px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400"><PlayStoreMark className="w-5 h-5 flex-shrink-0" /><span className="text-left leading-tight"><span className="block text-[8px] uppercase tracking-wide text-white/80">{bn ? "পাওয়া যাচ্ছে" : "Get it on"}</span><span className="block text-[12px] font-extrabold text-white">{bn ? "গুগল প্লে" : "Google Play"}</span></span></button>}{appStoreUrl && <button type="button" onClick={() => handleAppDownload(appStoreUrl)} className="flex-1 flex items-center gap-2 min-h-[44px] rounded-xl bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/10 transition-colors px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400"><AppStoreMark className="w-5 h-5 flex-shrink-0" /><span className="text-left leading-tight"><span className="block text-[8px] uppercase tracking-wide text-white/80">{bn ? "ডাউনলোড করুন" : "Download on the"}</span><span className="block text-[12px] font-extrabold text-white">{bn ? "অ্যাপ স্টোর" : "App Store"}</span></span></button>}</div></div>}

        <div className="border-t border-white/10 mt-6 pt-5 pb-[calc(var(--mobile-chrome-bottom)+0.5rem)] lg:pb-5 text-center space-y-3"><p className="text-xs text-white/85">&copy; {new Date().getFullYear()} {brandName}. {bn ? "সকল অধিকার সংরক্ষিত।" : "All rights reserved."}</p><p className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap text-xs font-semibold text-white/90"><Link href="/legal/terms" className="inline-flex items-center min-h-[44px] sm:min-h-0 hover:text-accent-300 transition-colors">{bn ? "শর্তাবলী" : "Terms & Conditions"}</Link><span className="text-white/30">·</span><Link href="/legal/privacy" className="inline-flex items-center min-h-[44px] sm:min-h-0 hover:text-accent-300 transition-colors">{bn ? "গোপনীয়তা নীতি" : "Privacy Policy"}</Link><span className="text-white/30">·</span><Link href="/legal/cookies" className="inline-flex items-center min-h-[44px] sm:min-h-0 hover:text-accent-300 transition-colors">{bn ? "কুকি নীতি" : "Cookies"}</Link><span className="text-white/30">·</span><Link href="/legal/refund" className="inline-flex items-center min-h-[44px] sm:min-h-0 hover:text-accent-300 transition-colors">{bn ? "রিফান্ড নীতি" : "Refund Policy"}</Link></p><DeveloperCredit /></div>
      </div>
    </footer>
  );
}
