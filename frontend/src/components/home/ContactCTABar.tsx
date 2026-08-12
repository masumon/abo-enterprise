"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Facebook, MessageCircle, Youtube, Instagram } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { formatBdPhoneDisplay, toBdTelHref, toBdWhatsappHref } from "@/lib/phone";

export default function ContactCTABar() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([
    "contact_phone",
    "contact_hours_en",
    "contact_hours_bn",
    "facebook_url",
    "whatsapp_number",
    "youtube_url",
    "instagram_url",
  ]);

  const phone = getSettingValue(settings, "contact_phone");
  const phoneDisplay = formatBdPhoneDisplay(phone);
  const phoneHref = toBdTelHref(phone);
  const whatsappNumber = getSettingValue(settings, "whatsapp_number");
  const hours = lang === "bn"
    ? getSettingValue(settings, "contact_hours_bn")
    : getSettingValue(settings, "contact_hours_en");

  const links = [
    { href: getSettingValue(settings, "facebook_url"), icon: Facebook, label: "Facebook", bg: "bg-[#1877F2] hover:bg-[#1568d9]" },
    { href: toBdWhatsappHref(whatsappNumber), icon: MessageCircle, label: "WhatsApp", bg: "bg-[#25D366] hover:bg-[#20bd5a]" },
    { href: getSettingValue(settings, "youtube_url"), icon: Youtube, label: "YouTube", bg: "bg-[#FF0000] hover:bg-[#e60000]" },
    { href: getSettingValue(settings, "instagram_url"), icon: Instagram, label: "Instagram", bg: "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] hover:opacity-90" },
  ].filter((l) => l.href);

  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const handleTouchStart = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    setPaused(true);
  };
  const handleTouchEnd = () => {
    if (reduceMotion) return;
    resumeTimer.current = setTimeout(() => setPaused(false), 2000);
  };

  const contactBlock = (
    <div className="flex items-center gap-6 flex-shrink-0 pr-6">
      {phoneDisplay && (
        <div className="flex items-center gap-2.5">
          <span className="flex w-8 h-8 rounded-full bg-gradient-to-br from-[#f4dfa0] via-[#d4af37] to-[#a3801f] ring-1 ring-white/50 shadow-sm shadow-amber-500/20 items-center justify-center flex-shrink-0">
            <Phone className="w-4 h-4 text-black/80" aria-hidden />
          </span>
          <div>
            <p className="text-[9px] font-bold tracking-[0.12em] uppercase bg-gradient-to-r from-brand-600 via-fuchsia-600 to-amber-600 bg-clip-text text-transparent leading-tight">
              {lang === "bn" ? "যেকোনো প্রশ্নে আমাদের সাথে যোগাযোগ করুন" : "Reach out to us for any question"}
            </p>
            {phoneHref ? (
              <a href={phoneHref} className="text-heading text-lg font-extrabold tracking-tight hover:text-brand-600 transition-colors">
                {phoneDisplay}
              </a>
            ) : (
              <span className="text-heading text-lg font-extrabold tracking-tight">{phoneDisplay}</span>
            )}
          </div>
        </div>
      )}
      {links.length > 0 && (
        <div className="flex items-center gap-3">
          {links.map(({ href, icon: Icon, label, bg }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={`w-10 h-10 rounded-full ${bg} ring-1 ring-black/5 flex items-center justify-center text-white shadow-md shadow-black/10 flex-shrink-0`}
            >
              <Icon className="w-4 h-4" aria-hidden />
            </a>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-amber-50/70 dark:from-[var(--surface)] dark:via-[var(--surface)] dark:to-[var(--surface)] border-y border-[var(--line)] py-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" aria-hidden />
      <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-brand-400/15 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute -bottom-12 right-0 w-52 h-52 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" aria-hidden />
      <div className="container mx-auto px-4 relative">
        <div className="hidden sm:flex items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="flex w-12 h-12 rounded-full bg-gradient-to-br from-[#f4dfa0] via-[#d4af37] to-[#a3801f] ring-1 ring-white/50 shadow-lg shadow-amber-500/25 items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-black/80" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase bg-gradient-to-r from-brand-600 via-fuchsia-600 to-amber-600 bg-clip-text text-transparent">
                {lang === "bn" ? "যেকোনো প্রশ্নে আমাদের সাথে যোগাযোগ করুন" : "Reach out to us for any question"}
              </p>
              {phoneDisplay ? (
                phoneHref ? (
                  <a href={phoneHref} className="text-heading text-2xl font-extrabold tracking-tight hover:text-brand-600 transition-colors">
                    {phoneDisplay}
                  </a>
                ) : (
                  <span className="text-heading text-2xl font-extrabold tracking-tight">{phoneDisplay}</span>
                )
              ) : (
                <p className="text-[var(--ink-muted)] text-sm">{lang === "bn" ? "ফোন নম্বর সেট করা নেই" : "Phone number is not configured"}</p>
              )}
              {hours && <p className="text-[var(--ink-muted)] text-xs mt-0.5">{hours}</p>}
            </div>
          </div>

          {links.length > 0 && (
            <div className="flex items-center gap-3">
              {links.map(({ href, icon: Icon, label, bg }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`w-11 h-11 rounded-full ${bg} ring-1 ring-black/5 flex items-center justify-center text-white shadow-md shadow-black/10 hover:-translate-y-0.5 hover:shadow-lg transition-all`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>

        <div
          className="marquee-viewport sm:hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div
            className="marquee-track"
            style={{
              ["--marquee-duration" as string]: "18s",
              animationPlayState: paused || reduceMotion ? "paused" : undefined,
            }}
          >
            {contactBlock}
            {contactBlock}
          </div>
        </div>
      </div>
    </section>
  );
}
