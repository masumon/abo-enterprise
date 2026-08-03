"use client";

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

  return (
    <section className="bg-gradient-to-r from-[#0f1a2e] to-[#051529] py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="hidden sm:flex w-11 h-11 rounded-full bg-white/10 items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <p className="text-white/80 text-sm">
                {lang === "bn" ? "যেকোনো প্রশ্নে আমাদের সাথে যোগাযোগ করুন" : "Reach out to us for any question"}
              </p>
              {phoneHref ? (
                <a href={phoneHref} className="text-white text-xl font-bold hover:text-brand-300 transition-colors">
                  {phoneDisplay}
                </a>
              ) : (
                <span className="text-white text-xl font-bold">{phoneDisplay}</span>
              )}
              <p className="text-white/60 text-xs mt-0.5">{hours}</p>
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
                  className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center text-white transition-colors`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
