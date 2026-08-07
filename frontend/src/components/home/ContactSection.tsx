"use client";

import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { DEFAULT_MAPS_EMBED } from "@/lib/siteDefaults";
import { resolveGoogleMapsEmbed, resolveGoogleMapsLink, resolveAddress } from "@/lib/maps";
import { formatBdPhoneDisplay, toBdTelHref } from "@/lib/phone";
import MapEmbed from "@/components/common/MapEmbed";
import { SocialMediaLinks } from "@/components/ui/SocialMediaLinks";

export default function ContactSection() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings(["google_maps_embed", "contact_phone", "contact_email", "contact_address", "contact_address_en", "contact_hours_en", "contact_hours_bn", "facebook_url", "whatsapp_number"]);
  const mapsEmbed = resolveGoogleMapsEmbed(getSettingValue(settings, "google_maps_embed", DEFAULT_MAPS_EMBED));
  const phone = getSettingValue(settings, "contact_phone", "01825007977");
  const phoneDisplay = formatBdPhoneDisplay(phone);
  const phoneHref = toBdTelHref(phone);
  const email = getSettingValue(settings, "contact_email", "info@aboenterprise.com");
  const address = resolveAddress(settings, lang);
  const mapsLink = resolveGoogleMapsLink(getSettingValue(settings, "google_maps_embed"), address);
  const hours = lang === "bn"
    ? getSettingValue(settings, "contact_hours_bn", "শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা")
    : getSettingValue(settings, "contact_hours_en", "Sat–Thu, 9:00 AM – 9:00 PM");

  return (
    <section id="contact" className="py-5 lg:py-7 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-heading mb-2">
            {lang === "bn" ? "যোগাযোগ করুন" : "Get In Touch"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            {lang === "bn" ? "আমাদের সাথে সরাসরি যোগাযোগ করুন" : "Contact us directly"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <GlassCard className="p-6 space-y-4 lg:col-span-1">
            <h3 className="font-bold text-heading text-lg">
              {lang === "bn" ? "আমাদের তথ্য" : "Our Information"}
            </h3>
            <div className="space-y-3">
              {[
                { icon: MapPin, label: address, href: mapsLink },
                { icon: Phone, label: phoneDisplay, href: phoneHref },
                { icon: Mail, label: email, href: `mailto:${email}` },
                { icon: Clock, label: hours, href: null },
              ].map(({ icon: Icon, label, href }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-accent-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-accent-500" />
                  </div>
                  {href ? (
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-brand-600 transition-colors pt-2">{label}</a>
                  ) : (
                    <span className="text-sm text-gray-600 pt-2">{label}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-2">
              <SocialMediaLinks
                facebookUrl={getSettingValue(settings, "facebook_url", "https://www.facebook.com/abo.enterprise")}
                whatsappNumber={getSettingValue(settings, "whatsapp_number", "8801825007977")}
              />
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden p-0 lg:col-span-2">
            <MapEmbed
              embedSrc={mapsEmbed}
              address={address}
              title="ABO Enterprise Map"
              minHeight="16rem"
              className="lg:min-h-[18rem]"
            />
          </GlassCard>
        </div>

        <div className="text-center mt-8">
          <Link href="/contact" className="btn btn-brand btn-md btn-ripple">
            {lang === "bn" ? "সম্পূর্ণ যোগাযোগ পেজ" : "Full Contact Page"}
          </Link>
        </div>
      </div>
    </section>
  );
}
