"use client";

import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { useLanguageStore } from "@/store/language";
import { getBrandFullTitle, getBrandName, getBrandTagline } from "@/lib/tokens";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { isVideoUrl, toPlayableVideoUrl } from "@/lib/media";

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Small pill above the title, e.g. "👤 Customer Dashboard". */
  badge?: string;
}

export default function AuthSplitLayout({ children, title, subtitle, badge }: AuthSplitLayoutProps) {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings(["site_customer_login_bg_url"]);
  const bgUrl = getSettingValue(settings, "site_customer_login_bg_url");
  const bgIsVideo = isVideoUrl(bgUrl);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 -mt-[var(--navbar-offset)] relative overflow-hidden">
      {/* Admin-managed background (image / animated / video). Falls back to the
          brand gradient when unset. Dark overlay keeps the form legible. */}
      {bgUrl && (
        <div className="absolute inset-0 z-0" aria-hidden>
          {bgIsVideo ? (
            <video className="absolute inset-0 w-full h-full object-cover" src={toPlayableVideoUrl(bgUrl)} autoPlay muted loop playsInline />
          ) : (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgUrl})` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950/80 via-brand-950/70 to-gray-950/85" />
        </div>
      )}
      <div className="hidden lg:flex gradient-brand text-white p-12 flex-col justify-between relative overflow-hidden z-10">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-20 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl" />
        </div>
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <BrandLogo size="md" href={false} variant="light" />
          <div>
            <span className="font-bold text-xl block">{getBrandName(lang)}</span>
            <span className="text-white/80 text-xs font-medium mt-0.5 block">: {getBrandTagline(lang)}</span>
          </div>
        </Link>
        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{getBrandFullTitle(lang)}</h1>
          <p className="text-white/80 text-lg max-w-md leading-relaxed">
            {lang === "bn"
              ? "পণ্য, সেবা, সফটওয়্যার ও AI — এক প্ল্যাটফর্মে।"
              : "Products, services, software & AI — in one place."}
          </p>
          <ul className="space-y-3 text-sm text-white/70">
            {[
              lang === "bn" ? "৫০০+ সন্তুষ্ট গ্রাহক" : "500+ happy clients",
              lang === "bn" ? "পণ্য, সেবা ও সফটওয়্যার" : "Products, services & software",
              lang === "bn" ? "২৪/৭ WhatsApp সাপোর্ট" : "24/7 WhatsApp support",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-white/50">© {new Date().getFullYear()} ABO Enterprise</p>
      </div>

      <div className={`flex items-center justify-center p-6 sm:p-10 relative z-10 ${bgUrl ? "" : "page-surface"}`}>
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <BrandLogo size="lg" href={false} variant={bgUrl ? "light" : "brand"} className="mx-auto mb-3" />
            <p className={`text-sm font-semibold ${bgUrl ? "text-white" : "text-heading"}`}>{getBrandFullTitle(lang)}</p>
          </div>
          <div className="mb-6">
            {badge && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-200 mb-2">
                {badge}
              </span>
            )}
            <h2 className={`text-2xl font-bold ${bgUrl ? "text-white" : "text-heading"}`}>{title}</h2>
            {subtitle && <p className={`text-sm mt-1 ${bgUrl ? "text-white/80" : "text-muted"}`}>{subtitle}</p>}
          </div>
          {/* Frosted-glass card over the background image (like the admin login);
              solid elevated card when no background is set. */}
          <div
            className={
              bgUrl
                ? "rounded-2xl p-6 sm:p-8 bg-white/85 dark:bg-[#0f1f38]/80 backdrop-blur-xl border border-white/50 dark:border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
                : "enterprise-card p-6 sm:p-8"
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
