"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mail, MapPin, MessageSquare, Send, Loader2, CheckCircle, Clock } from "lucide-react";
import { serviceLeadsApi } from "@/lib/api";
import { toLeadV2Type } from "@/lib/leadTypes";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { BD_PHONE_REGEX } from "@/lib/phone";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { DEFAULT_MAPS_EMBED } from "@/lib/siteDefaults";
import { resolveGoogleMapsEmbed, resolveGoogleMapsLink, DEFAULT_ADDRESS_BN, DEFAULT_ADDRESS_EN } from "@/lib/maps";
import MapEmbed from "@/components/common/MapEmbed";
import PageHero from "@/components/ui/PageHero";

export default function ContactPage() {
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);
  const { settings } = usePublicSettings(["google_maps_embed", "contact_phone", "contact_email", "contact_address"]);
  const mapsEmbed = resolveGoogleMapsEmbed(getSettingValue(settings, "google_maps_embed", DEFAULT_MAPS_EMBED));
  const phone = getSettingValue(settings, "contact_phone", "01825007977");
  const email = getSettingValue(settings, "contact_email", "abo.enterprise@gmail.com");
  const address = getSettingValue(settings, "contact_address", lang === "bn" ? DEFAULT_ADDRESS_BN : DEFAULT_ADDRESS_EN);
  const mapsLink = resolveGoogleMapsLink(getSettingValue(settings, "google_maps_embed"), address);

  const schema = z.object({
    name: z.string().min(2, lang === "bn" ? "নাম দিন" : "Name is required"),
    phone: z.string().regex(BD_PHONE_REGEX, lang === "bn" ? "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন" : "Enter valid 11-digit BD phone"),
    email: z.string().email(lang === "bn" ? "সঠিক ইমেইল দিন" : "Enter valid email").optional().or(z.literal("")),
    project_description: z.string().min(10, lang === "bn" ? "কমপক্ষে ১০ অক্ষর লিখুন" : "Min 10 characters"),
  });
  type FormData = z.infer<typeof schema>;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSubmitError(null);
    try {
      await serviceLeadsApi.create({
        lead_type: toLeadV2Type("general"),
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        project_description: data.project_description,
      });
      setSubmitted(true);
      toast("success", lang === "bn" ? "বার্তা পাঠানো হয়েছে" : "Message sent successfully");
    } catch {
      setSubmitError(t("error_generic"));
      toast("error", t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    { icon: Phone, label: lang === "bn" ? "ফোন / WhatsApp" : "Phone / WhatsApp", value: `+880 ${phone.slice(0, 4)}-${phone.slice(4)}`, href: `tel:+880${phone}` },
    { icon: Mail, label: lang === "bn" ? "ইমেইল" : "Email", value: email, href: `mailto:${email}` },
    { icon: MapPin, label: lang === "bn" ? "ঠিকানা" : "Location", value: address, href: mapsLink },
    { icon: MessageSquare, label: "WhatsApp", value: lang === "bn" ? "সরাসরি চ্যাট করুন" : "Chat with us directly", href: "https://wa.me/8801825007977" },
  ];

  return (
    <main className="min-h-screen">
      <PageHero
        pageKey="contact"
        title={t("contact_title")}
        subtitle={t("contact_sub")}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "যোগাযোগ" : "Contact" },
        ]}
      />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t("contact_get_in_touch")}</h2>
            {contactInfo.map(({ icon: Icon, label, value, href }) => (
              <GlassCard key={label} className="p-4 flex gap-4">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                    className="text-sm font-medium text-brand-600 hover:underline">{value}</a>
                </div>
              </GlassCard>
            ))}
            <GlassCard className="p-4 flex gap-3">
              <Clock className="w-5 h-5 text-brand-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t("contact_hours")}</p>
                <p className="text-sm text-gray-500 mt-1">{t("contact_hours_val")}</p>
              </div>
            </GlassCard>
            <GlassCard className="overflow-hidden p-0">
              <MapEmbed
                embedSrc={mapsEmbed}
                address={address}
                title="ABO Enterprise Location"
                minHeight="14rem"
              />
            </GlassCard>
          </div>

          <GlassCard className="lg:col-span-3 p-6 md:p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-14 h-14 text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {lang === "bn" ? "বার্তা পাঠানো হয়েছে!" : "Message Sent!"}
                </h3>
                <p className="text-gray-500">
                  {lang === "bn" ? "২৪ ঘণ্টার মধ্যে যোগাযোগ করা হবে।" : "We will get back to you within 24 hours."}
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">{t("contact_send_message")}</h2>
                {submitError && <p role="alert" className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{submitError}</p>}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("contact_name")} *</label>
                      <input {...register("name")} className={cn("input", errors.name && "input-error")} />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t("contact_phone")} *</label>
                      <input {...register("phone")} className={cn("input", errors.phone && "input-error")} placeholder="01XXXXXXXXX" />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("contact_email")}</label>
                    <input {...register("email")} type="email" className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("contact_message")} *</label>
                    <textarea {...register("project_description")} rows={5} className={cn("input resize-none", errors.project_description && "input-error")} />
                    {errors.project_description && <p className="text-red-500 text-xs mt-1">{errors.project_description.message}</p>}
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-brand btn-md w-full btn-ripple">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {loading ? t("loading") : t("contact_send")}
                  </button>
                </form>
              </>
            )}
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
