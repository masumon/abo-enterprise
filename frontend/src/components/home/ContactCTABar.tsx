"use client";

import { useRef, useState } from "react";
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

  const phone = getSettingValue(settings, "contact_phone", "01825007977");
  const phoneDisplay = formatBdPhoneDisplay(phone);
  const phoneHref = toBdTelHref(phone);
  const whatsappNumber = getSettingValue(settings, "whatsapp_number", phone);
  const hours = lang === "bn"
    ? getSettingValue(settings, "contact_hours_bn", "সকাল ৮টা - রাত ১২টা | ২৪/৭ সাপোর্ট")
    : getSettingValue(settings, "contact_hours_en", "8:00 AM - 12:00 AM | 24/7 Support");

  const links = [
    { href: getSettingValue(settings, "facebook_url", "https://www.facebook.com/abo.enterprise"), icon: Facebook, label: "Facebook", bg: "bg-[#1877F2] hover:bg-[#1568d9]" },
    { href: toBdWhatsappHref(whatsappNumber), icon: MessageCircle, label: "WhatsApp", bg: "bg-[#25D366] hover:bg-[#20bd5a]" },
    { href: getSettingValue(settings, "youtube_url"), icon: Youtube, label: "YouTube", bg: "bg-[#FF0000] hover:bg-[#e60000]" },
    { href: getSettingValue(settings, "instagram_url"), icon: Instagram, label: "Instagram", bg: "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] hover:opacity-90" },
  ].filter((l) => l.href);

  // Mobile-only RTL ticker. A moving phone number/social icons are harder to
  // tap than static ones, so a touch pauses the scroll instead of fighting it —
  // it resumes on its own a couple seconds after the finger lifts.
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTouchStart = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    setPaused(true);
  };
  const handleTouchEnd = () => {
    resumeTimer.current = setTimeout(() => setPaused(false), 2000);
  };

  const contactBlock = (
    <div className="flex items-center gap-6 flex-shrink-0 pr-6">
      <div className="flex items-center gap-2.5">
        <Phone className="w-4 h-4 text-accent-400 flex-shrink-0" aria-hidden />
        <div>
          <p className="text-white/70 text-[11px] leading-tight">
            {lang === "bn" ? "যেকোনো প্রশ্নে আমাদের সাথে যোগাযোগ করুন" : "Reach out to us for any question"}
          </p>
          {phoneHref ? (
            <a href={phoneHref} className="text-white text-lg font-bold hover:text-accent-300 transition-colors">
              {phoneDisplay}
            </a>
          ) : (
            <span className="text-white text-lg font-bold">{phoneDisplay}</span>
          )}
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
              className={`w-10 h-10 rounded-full ${bg} ring-1 ring-white/15 flex items-center justify-center text-white shadow-lg shadow-black/20 flex-shrink-0`}
            >
              <Icon className="w-4 h-4" aria-hidden />
            </a>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#0f1a2e] to-[#051529] py-7">
      <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="container mx-auto px-4 relative">
        {/* Desktop / tablet — static layout, unchanged. */}
        <div className="hidden sm:flex items-center justify-between gap-5">
          <div className="flex items-center gap-3.5">
            <div className="flex w-12 h-12 rounded-full bg-white/10 ring-1 ring-white/15 items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-accent-400" aria-hidden />
            </div>
            <div>
              <p className="text-white/70 text-sm">
                {lang === "bn" ? "যেকোনো প্রশ্নে আমাদের সাথে যোগাযোগ করুন" : "Reach out to us for any question"}
              </p>
              {phoneHref ? (
                <a href={phoneHref} className="text-white text-2xl font-bold hover:text-accent-300 transition-colors">
                  {phoneDisplay}
                </a>
              ) : (
                <span className="text-white text-2xl font-bold">{phoneDisplay}</span>
              )}
              <p className="text-white/50 text-xs mt-0.5">{hours}</p>
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
                  className={`w-11 h-11 rounded-full ${bg} ring-1 ring-white/15 flex items-center justify-center text-white shadow-lg shadow-black/20 hover:-translate-y-0.5 hover:shadow-xl transition-all`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Mobile — right-to-left ticker; a touch pauses it so tapping the
            phone number or an icon never has to chase a moving target. */}
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
              animationPlayState: paused ? "paused" : undefined,
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
