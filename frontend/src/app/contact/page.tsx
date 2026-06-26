"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mail, MapPin, MessageSquare, Send, Loader2, CheckCircle, Clock } from "lucide-react";
import { leadsApi } from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

export default function ContactPage() {
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);

  const schema = z.object({
    name: z.string().min(2, lang === "bn" ? "নাম দিন" : "Name is required"),
    phone: z.string().regex(/^0[13-9]\d{8}$/, lang === "bn" ? "সঠিক নম্বর দিন" : "Enter valid BD phone"),
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
      await leadsApi.create({
        lead_type: "general",
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
    { icon: Phone, label: lang === "bn" ? "ফোন / WhatsApp" : "Phone / WhatsApp", value: "+880 1825-007977", href: "tel:+8801825007977" },
    { icon: Mail, label: lang === "bn" ? "ইমেইল" : "Email", value: "abo.enterprise@gmail.com", href: "mailto:abo.enterprise@gmail.com" },
    { icon: MapPin, label: lang === "bn" ? "ঠিকানা" : "Location", value: lang === "bn" ? "হাজি বাহার উদ্দিন মার্কেট, সিলেট-৩১৭০" : "Hazi Bahar Uddin Market, Sylhet-3170", href: "https://maps.google.com/?q=Sylhet" },
    { icon: MessageSquare, label: "WhatsApp", value: lang === "bn" ? "সরাসরি চ্যাট করুন" : "Chat with us directly", href: "https://wa.me/8801825007977" },
  ];

  return (
    <main className="min-h-screen">
      <section className="gradient-brand text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-3">{t("contact_title")}</h1>
          <p className="text-brand-100 text-lg">{t("contact_sub")}</p>
        </div>
      </section>

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
              <iframe
                title="ABO Enterprise Location"
                src="https://maps.google.com/maps?q=Sylhet%20Bangladesh&output=embed"
                className="w-full h-48 border-0"
                loading="lazy"
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
                  {lang === "bn" ? "২৪ ঘণ্টার মধ্যে যোগাযোগ করা হবে।" : "We'll get back to you within 24 hours."}
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
