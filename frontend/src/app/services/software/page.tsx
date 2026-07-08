"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle } from "lucide-react";
import { isQueuedResponse, serviceLeadsApi } from "@/lib/api";
import { toLeadV2Type } from "@/lib/leadTypes";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";
import { BD_PHONE_REGEX } from "@/lib/phone";
import PageHero from "@/components/ui/PageHero";
import ReferenceBadge from "@/components/ui/ReferenceBadge";
import Image from "next/image";
import { useShowcaseContent } from "@/hooks/useShowcaseContent";
import { resolveServiceIcon } from "@/lib/showcaseContent";

const schema = z.object({
  name: z.string().min(2),
  company: z.string().optional(),
  phone: z.string().regex(BD_PHONE_REGEX, "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন"),
  email: z.string().email().optional().or(z.literal("")),
  lead_type: z.enum(["software_development", "ai_solutions", "automation", "erp", "general"]),
  budget_range: z.string().optional(),
  project_description: z.string().min(20),
});

type FormData = z.infer<typeof schema>;

const BUDGET_OPTIONS = [
  { value: "under_10k", label: { en: "Under ৳10,000", bn: "৳১০,০০০ এর নিচে" } },
  { value: "10k_50k", label: { en: "৳10,000–50,000", bn: "৳১০,০০০–৫০,০০০" } },
  { value: "50k_150k", label: { en: "৳50,000–1,50,000", bn: "৳৫০,০০০–১,৫০,০০০" } },
  { value: "above_150k", label: { en: "Above ৳1,50,000", bn: "৳১,৫০,০০০ এর উপরে" } },
  { value: "discuss", label: { en: "Let's discuss", bn: "আলোচনা করব" } },
];

export default function SoftwarePage() {
  const { lang } = useLanguageStore();
  const { serviceCards } = useShowcaseContent();
  const [isSuccess, setIsSuccess] = useState(false);
  const [queued, setQueued] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { lead_type: "software_development" },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setQueued(false);
    setSubmitError(null);
    try {
      const response = await serviceLeadsApi.create({
        lead_type: toLeadV2Type(data.lead_type),
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        company: data.company || undefined,
        project_description: data.project_description,
        budget_range: data.budget_range,
      });
      const wasQueued = isQueuedResponse(response);
      setQueued(wasQueued);
      const created = response.data?.data as { lead_number?: string } | null;
      setReference(!wasQueued ? created?.lead_number ?? null : null);
      setIsSuccess(true);
    } catch {
      setSubmitError(
        lang === "bn"
          ? "পাঠানো যায়নি। আবার চেষ্টা করুন বা WhatsApp-এ যোগাযোগ করুন।"
          : "Could not submit. Please try again or contact us on WhatsApp."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <PageHero
        pageKey="software"
        align="center"
        title={lang === "bn" ? "সফটওয়্যার, AI ও অটোমেশন" : "Software, AI & Automation"}
        subtitle={
          lang === "bn"
            ? "ছোট ব্যবসা থেকে বড় প্রতিষ্ঠান — আপনার ব্যবসার জন্য কাস্টম প্রযুক্তি সমাধান।"
            : "From small businesses to enterprises — custom technology solutions for your needs."
        }
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "সেবা" : "Services", href: "/services" },
          { label: lang === "bn" ? "সফটওয়্যার" : "Software" },
        ]}
        badge={lang === "bn" ? "কাস্টম ডেভেলপমেন্ট" : "Custom Development"}
      />

      <div className="container mx-auto px-4 py-12">
        {/* Service Cards */}
        <div className="section-title text-center mb-8">
          <h2>{lang === "bn" ? "আমরা যা তৈরি করি" : "What We Build"}</h2>
          <div className="section-divider" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {serviceCards.map(({ id, icon, color, title, items, image }) => {
            const Icon = resolveServiceIcon(icon);
            return (
              <div key={id} className="card overflow-hidden">
                {image && (
                  <div className="relative h-36">
                    <Image src={image} alt={lang === "bn" ? title.bn : title.en} fill className="object-cover" sizes="(max-width:640px) 100vw, 33vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}
                <div className="p-5">
                  <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-3 shadow-md", color, image && "-mt-8 relative z-10")}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-heading mb-3 text-sm">
                    {lang === "bn" ? title.bn : title.en}
                  </h3>
                  <ul className="space-y-1.5">
                    {items.map((item) => (
                      <li key={item.en} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0" />
                        {lang === "bn" ? item.bn : item.en}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lead Form */}
        <div className="max-w-2xl mx-auto">
          <div className="card p-6 md:p-8">
            <h2 className="text-xl font-bold text-heading mb-6 text-center">
              {lang === "bn" ? "বিনামূল্যে পরামর্শ পান" : "Get a Free Consultation"}
            </h2>

            {isSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-heading mb-2">
                  {queued ? (lang === "bn" ? "অনুরোধ কিউ হয়েছে!" : "Request Queued!") : lang === "bn" ? "আপনার বার্তা পেয়েছি!" : "Message Received!"}
                </h3>
                <p className="text-gray-500">
                  {queued
                    ? lang === "bn"
                      ? "ইন্টারনেট ফিরলে অনুরোধটি স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।"
                      : "The request will sync automatically when your connection returns."
                    : lang === "bn"
                      ? "২৪ ঘণ্টার মধ্যে WhatsApp বা ফোনে যোগাযোগ করব।"
                      : "We'll contact you within 24 hours via WhatsApp or phone."}
                </p>
                {!queued && reference && <ReferenceBadge reference={reference} />}
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      {lang === "bn" ? "নাম *" : "Name *"}
                    </label>
                    <input {...register("name")} className={cn("input", errors.name && "input-error")}
                      placeholder={lang === "bn" ? "আপনার নাম" : "Your name"} />
                  </div>
                  <div>
                    <label className="form-label">
                      {lang === "bn" ? "কোম্পানি" : "Company"}
                    </label>
                    <input {...register("company")} className="input"
                      placeholder={lang === "bn" ? "কোম্পানির নাম" : "Company name"} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      {lang === "bn" ? "মোবাইল *" : "Mobile *"}
                    </label>
                    <input {...register("phone")} type="tel" className={cn("input", errors.phone && "input-error")}
                      placeholder="01XXXXXXXXX" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">সঠিক নম্বর দিন</p>}
                  </div>
                  <div>
                    <label className="form-label">
                      Email
                    </label>
                    <input {...register("email")} type="email" className="input"
                      placeholder="email@example.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      {lang === "bn" ? "সেবার ধরন *" : "Service Type *"}
                    </label>
                    <select {...register("lead_type")} className="input">
                      <option value="software_development">{lang === "bn" ? "কাস্টম সফটওয়্যার" : "Custom Software"}</option>
                      <option value="ai_solutions">{lang === "bn" ? "AI সমাধান" : "AI Solutions"}</option>
                      <option value="automation">{lang === "bn" ? "অটোমেশন" : "Automation"}</option>
                      <option value="erp">ERP / POS / CRM</option>
                      <option value="general">{lang === "bn" ? "সাধারণ" : "General Inquiry"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">
                      {lang === "bn" ? "বাজেট" : "Budget Range"}
                    </label>
                    <select {...register("budget_range")} className="input">
                      <option value="">{lang === "bn" ? "বাজেট বেছে নিন" : "Select budget"}</option>
                      {BUDGET_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>
                          {lang === "bn" ? b.label.bn : b.label.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    {lang === "bn" ? "প্রজেক্টের বিবরণ *" : "Project Description *"}
                  </label>
                  <textarea {...register("project_description")} rows={4} className={cn("input resize-none", errors.project_description && "input-error")}
                    placeholder={lang === "bn" ? "আপনার প্রজেক্ট সম্পর্কে বিস্তারিত লিখুন..." : "Describe your project in detail..."} />
                  {errors.project_description && (
                    <p className="text-red-500 text-xs mt-1">{lang === "bn" ? "কমপক্ষে ২০ অক্ষর লিখুন" : "Please provide more details"}</p>
                  )}
                </div>

                {submitError && (
                  <p role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                    {submitError}
                  </p>
                )}

                <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg w-full">
                  {isSubmitting
                    ? lang === "bn" ? "পাঠানো হচ্ছে..." : "Sending..."
                    : lang === "bn" ? "বিনামূল্যে পরামর্শের জন্য আবেদন করুন" : "Request Free Consultation"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
