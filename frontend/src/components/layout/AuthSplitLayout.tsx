"use client";

import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { useLanguageStore } from "@/store/language";
import { BRAND_FULL_TITLE, BRAND_NAME, BRAND_TAGLINE_BILINGUAL } from "@/lib/tokens";

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthSplitLayout({ children, title, subtitle }: AuthSplitLayoutProps) {
  const { lang } = useLanguageStore();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 -mt-[var(--navbar-offset)]">
      <div className="hidden lg:flex gradient-brand text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-20 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl" />
        </div>
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <BrandLogo size="md" href={false} variant="light" />
          <div>
            <span className="font-bold text-xl block">{BRAND_NAME}</span>
            <span className="text-white/80 text-xs font-medium mt-0.5 block">: {BRAND_TAGLINE_BILINGUAL}</span>
          </div>
        </Link>
        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{BRAND_FULL_TITLE}</h1>
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

      <div className="flex items-center justify-center p-6 sm:p-10 page-surface">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <BrandLogo size="lg" href={false} variant="brand" className="mx-auto mb-3" />
            <p className="text-sm font-semibold text-heading">{BRAND_FULL_TITLE}</p>
          </div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-heading">{title}</h2>
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          </div>
          <div className="enterprise-card p-6 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
