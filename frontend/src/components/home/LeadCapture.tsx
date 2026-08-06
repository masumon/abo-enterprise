"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BD_PHONE_REGEX, BD_PHONE_ERROR_BN } from "@/lib/phone";
import { trackEvent } from "@/components/analytics/GoogleAnalytics";
import { Send, CheckCircle, Bot, Code, Cog, ChevronDown } from "lucide-react";
import { isQueuedResponse, serviceLeadsApi } from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";
import ReferenceBadge from "@/components/ui/ReferenceBadge";

const schema = z.object({
  name: z.string().min(2, "নাম দিন"),
  company: z.string().optional(),
  phone: z.string().regex(BD_PHONE_REGEX, BD_PHONE_ERROR_BN),
  email: z.string().email("সঠিক ইমেইল দিন").optional().or(z.literal("")),
  lead_type: z.enum(["software_development", "ai_solutions", "automation", "erp", "general"]),
  project_description: z.string().min(20, "কমপক্ষে ২০ অক্ষরে প্রজেক্ট বর্ণনা করুন"),
  // Screen 08b (X2) — a band, and optional. A buyer who is asked for an exact
  // figure before they have a quote either guesses low to stay safe or leaves;
  // "I'm not sure yet" is a real answer and it still tells sales something.
  budget_range: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

/**
 * Bands the sales desk can act on, including the honest one. Values are stored
 * verbatim on LeadV2.budget_range, which is a free-text column, so no schema
 * change is involved.
 */
const BUDGET_BANDS = [
  { value: "under_50k", en: "Under ৳50k", bn: "৳৫০ হাজারের নিচে" },
  { value: "50k_2l", en: "৳50k – ৳2L", bn: "৳৫০ হাজার–২ লাখ" },
  { value: "2l_5l", en: "৳2L – ৳5L", bn: "৳২–৫ লাখ" },
  { value: "5l_plus", en: "৳5L+", bn: "৳৫ লাখ+" },
  { value: "not_sure", en: "Not sure yet", bn: "জানি না" },
];

import { toLeadV2Type } from "@/lib/leadTypes";

const LEAD_TYPES = [
  { value: "software_development", label: { en: "Custom Software", bn: "কাস্টম সফটওয়্যার" }, icon: Code },
  { value: "ai_solutions", label: { en: "AI Solutions", bn: "AI সমাধান" }, icon: Bot },
  { value: "automation", label: { en: "Automation", bn: "অটোমেশন" }, icon: Cog },
  { value: "erp", label: { en: "ERP / POS / CRM", bn: "ERP / POS / CRM" }, icon: Code },
  { value: "general", label: { en: "General Inquiry", bn: "সাধারণ জিজ্ঞাসা" }, icon: Send },
] as const;

export default function LeadCapture() {
  const { lang } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [queued, setQueued] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { lead_type: "software_development" },
  });

  const selectedType = watch("lead_type");
  const selectedBudget = watch("budget_range");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setQueued(false);
    try {
      const response = await serviceLeadsApi.create({
        lead_type: toLeadV2Type(data.lead_type),
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        company: data.company || undefined,
        project_description: data.project_description,
        budget_range: data.budget_range || undefined,
      });
      const wasQueued = isQueuedResponse(response);
      setQueued(wasQueued);
      const created = response.data?.data as { lead_number?: string } | null;
      setReference(!wasQueued ? created?.lead_number ?? null : null);
      setIsSubmitted(true);
      trackEvent("generate_lead", { lead_type: data.lead_type });
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
    <section id="consultation" className="py-8 lg:py-10 bg-gradient-to-br from-brand-50 to-accent-50 dark:from-brand-900/20 dark:to-accent-900/10">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Form */}
          <div>
            <div className="mb-10">
              <div className="inline-block mb-3">
                <span className="text-sm font-semibold text-accent-700 dark:text-accent-300 bg-accent-100 dark:bg-accent-500/20 px-4 py-1.5 rounded-full">
                  ⚡ {lang === "bn" ? "AI কনসালটেশন" : "AI Consultation"}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-heading mb-3">
                {lang === "bn"
                  ? "আপনার ব্যবসার জন্য সেরা AI সলিউশন খুঁজে নিন"
                  : "Find the Perfect AI Solution for Your Business"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base mb-4">
                {lang === "bn"
                  ? "আপনার প্রজেক্টের বিবরণ দিন এবং ২৪ ঘণ্টার মধ্যে কাস্টমাইজড সমাধান পান।"
                  : "Describe your project and get a customized solution within 24 hours."}
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  {lang === "bn" ? "ফ্রি পরামর্শ" : "Free consultation"}
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  {lang === "bn" ? "দ্রুত সাপোর্ট" : "Fast support"}
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  {lang === "bn" ? "কোনো বাধ্যবাধকতা নেই" : "No obligation"}
                </div>
              </div>
            </div>

            {isSubmitted ? (
              <div className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-2xl p-8 lg:p-10 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-heading mb-2">
                  {queued ? (lang === "bn" ? "অনুরোধ কিউ হয়েছে!" : "Request Queued!") : lang === "bn" ? "আপনার অনুরোধ পেয়েছি!" : "Request Received!"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {queued
                    ? lang === "bn"
                      ? "ইন্টারনেট ফিরলে অনুরোধটি স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।"
                      : "The request will sync automatically when your connection returns."
                    : lang === "bn"
                      ? "২৪ ঘণ্টার মধ্যে WhatsApp বা ফোনে যোগাযোগ করা হবে।"
                      : "We'll contact you via WhatsApp or phone within 24 hours."}
                </p>
                {!queued && reference && <ReferenceBadge reference={reference} />}
              </div>
            ) : !isOpen ? (
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-between gap-4 bg-white dark:bg-white/10 backdrop-blur-sm rounded-2xl p-6 lg:p-8 text-left hover:shadow-lg transition-shadow"
              >
                <span>
                  <span className="block text-base font-bold text-heading">
                    {lang === "bn" ? "বিনামূল্যে পরামর্শ পান" : "Get Free Consultation"}
                  </span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {lang === "bn" ? "ফর্মটি খুলতে ক্লিক করুন — ১ মিনিট সময় লাগবে" : "Tap to open the form — takes about a minute"}
                  </span>
                </span>
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-500/20 flex items-center justify-center">
                  <ChevronDown className="w-5 h-5 text-brand-600 dark:text-brand-300" aria-hidden />
                </span>
              </button>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="bg-white dark:bg-white/10 backdrop-blur-sm rounded-2xl p-6 lg:p-8 space-y-5"
              >
              {submitError && (
                <p role="alert" className="text-red-600 dark:text-red-400 text-sm bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-300/30 rounded-xl px-4 py-2">
                  {submitError}
                </p>
              )}
              {/* Service Type */}
              <fieldset>
                <legend className="block text-sm font-medium text-heading mb-3">
                  {lang === "bn" ? "কোন সেবা প্রয়োজন?" : "What service do you need?"}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {LEAD_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <label
                        key={type.value}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                          selectedType === type.value
                            ? "border-brand-600 bg-brand-50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-semibold"
                            : "border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-brand-300"
                        )}
                      >
                        <input
                          type="radio"
                          value={type.value}
                          {...register("lead_type")}
                          className="sr-only"
                        />
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {lang === "bn" ? type.label.bn : type.label.en}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lead-name" className="block text-sm font-medium text-heading mb-1">
                    {lang === "bn" ? "আপনার নাম *" : "Your Name *"}
                  </label>
                  <input
                    id="lead-name"
                    {...register("name")}
                    className={cn("input", errors.name && "input-error")}
                    placeholder={lang === "bn" ? "নাম লিখুন" : "Full name"}
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? "lead-name-error" : undefined}
                  />
                  {errors.name && <p id="lead-name-error" className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="lead-company" className="block text-sm font-medium text-heading mb-1">
                    {lang === "bn" ? "কোম্পানি" : "Company (optional)"}
                  </label>
                  <input
                    id="lead-company"
                    {...register("company")}
                    className="input"
                    placeholder={lang === "bn" ? "কোম্পানির নাম" : "Company name"}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lead-phone" className="block text-sm font-medium text-heading mb-1">
                  {lang === "bn" ? "মোবাইল নম্বর *" : "Mobile Number *"}
                </label>
                <input
                  id="lead-phone"
                  {...register("phone")}
                  type="tel"
                  className={cn("input", errors.phone && "input-error")}
                  placeholder="01XXXXXXXXX"
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? "lead-phone-error" : undefined}
                />
                {errors.phone && <p id="lead-phone-error" className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label htmlFor="lead-email" className="block text-sm font-medium text-heading mb-1">
                  {lang === "bn" ? "ইমেইল (ঐচ্ছিক)" : "Email (optional)"}
                </label>
                <input
                  id="lead-email"
                  {...register("email")}
                  type="email"
                  className={cn("input", errors.email && "input-error")}
                  placeholder="your@email.com"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "lead-email-error" : undefined}
                />
                {errors.email && <p id="lead-email-error" className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="lead-description" className="block text-sm font-medium text-heading mb-1">
                  {lang === "bn" ? "প্রজেক্টের বিবরণ *" : "Project Description *"}
                </label>
                <textarea
                  id="lead-description"
                  {...register("project_description")}
                  rows={4}
                  className={cn("input resize-none", errors.project_description && "input-error")}
                  placeholder={
                    lang === "bn"
                      ? "আপনার প্রজেক্ট সম্পর্কে বিস্তারিত লিখুন..."
                      : "Describe your project requirements in detail..."
                  }
                  aria-invalid={errors.project_description ? true : undefined}
                  aria-describedby={errors.project_description ? "lead-description-error" : undefined}
                />
                {errors.project_description && (
                  <p id="lead-description-error" className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.project_description.message}</p>
                )}
              </div>

              {/* Budget Selection */}
              <div>
                <p className="block text-sm font-medium text-heading mb-2">
                  {lang === "bn" ? "আনুমানিক বাজেট" : "Approximate budget"}
                  <span className="font-normal text-gray-500 dark:text-gray-400">
                    {lang === "bn" ? " — ঐচ্ছিক" : " — optional"}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_BANDS.map((band) => {
                    const active = selectedBudget === band.value;
                    return (
                      <button
                        key={band.value}
                        type="button"
                        onClick={() => setValue("budget_range", active ? "" : band.value)}
                        aria-pressed={active}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-semibold border transition-all min-h-[36px]",
                          active
                            ? "bg-brand-600 text-white border-brand-600"
                            : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-brand-300"
                        )}
                      >
                        {lang === "bn" ? band.bn : band.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-lg w-full shadow-lg"
              >
                <Send className="w-5 h-5" />
                {isSubmitting
                  ? lang === "bn" ? "পাঠানো হচ্ছে..." : "Sending..."
                  : lang === "bn" ? "বিনামূল্যে পরামর্শ পান" : "Get Free Consultation"}
              </button>
            </form>
            )}
          </div>

          {/* Right side - AI Illustration (hidden on mobile) */}
          <div className="hidden lg:flex items-center justify-center relative h-[500px]">
            <div className="relative w-full h-full bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 rounded-3xl p-8 flex items-center justify-center overflow-hidden">
              {/* AI Illustration - Placeholder */}
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6" aria-hidden>🤖</div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {lang === "bn" ? "AI সহায়ক" : "AI Assistant"}
                </h3>
                <p className="text-white/80 text-sm max-w-xs">
                  {lang === "bn"
                    ? "আমাদের AI সমাধান আপনার ব্যবসা স্বয়ংক্রিয় করতে সাহায্য করে"
                    : "Our AI solutions help automate your business"}
                </p>
              </div>
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" aria-hidden />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
