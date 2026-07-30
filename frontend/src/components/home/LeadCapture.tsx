"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BD_PHONE_REGEX, BD_PHONE_ERROR_BN } from "@/lib/phone";
import { trackEvent } from "@/components/analytics/GoogleAnalytics";
import { Send, CheckCircle, Bot, Code, Cog } from "lucide-react";
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
    <section className="py-16 gradient-brand">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {lang === "bn"
                ? "AI, সফটওয়্যার বা অটোমেশন দরকার?"
                : "Need AI, Software or Automation?"}
            </h2>
            <p className="text-white/70 mb-2">
              {lang === "bn"
                ? "আপনার প্রজেক্টের বিবরণ দিন — ২৪ ঘণ্টার মধ্যে বিস্তারিত প্রস্তাব পাবেন।"
                : "Describe your project and get a detailed proposal within 24 hours."}
            </p>
            <p className="text-white/50 text-sm">
              {lang === "bn"
                ? "✓ বিনামূল্যে পরামর্শ  ✓ কোনো বাধ্যবাধকতা নেই  ✓ ২৪ ঘণ্টার প্রতিশ্রুতি"
                : "✓ Free consultation  ✓ No obligation  ✓ 24-hour response guarantee"}
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-10 text-center text-white">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">
                {queued ? (lang === "bn" ? "অনুরোধ কিউ হয়েছে!" : "Request Queued!") : lang === "bn" ? "আপনার অনুরোধ পেয়েছি!" : "Request Received!"}
              </h3>
              <p className="text-white/70">
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
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 space-y-5"
            >
              {submitError && (
                <p role="alert" className="text-red-200 text-sm bg-red-500/20 border border-red-300/30 rounded-xl px-4 py-2">
                  {submitError}
                </p>
              )}
              {/* Service Type */}
              <fieldset>
                <legend className="block text-sm font-medium text-white mb-3">
                  {lang === "bn" ? "কোন সেবা প্রয়োজন?" : "What service do you need?"}
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LEAD_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <label
                        key={type.value}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all text-sm",
                          selectedType === type.value
                            ? "border-white bg-white text-brand-700 font-semibold"
                            : "border-white/30 text-white hover:border-white/60"
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
                  <label htmlFor="lead-name" className="block text-sm font-medium text-white mb-1">
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
                  {errors.name && <p id="lead-name-error" className="text-red-300 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="lead-company" className="block text-sm font-medium text-white mb-1">
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
                <label htmlFor="lead-phone" className="block text-sm font-medium text-white mb-1">
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
                {errors.phone && <p id="lead-phone-error" className="text-red-300 text-xs mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label htmlFor="lead-email" className="block text-sm font-medium text-white mb-1">
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
                {errors.email && <p id="lead-email-error" className="text-red-300 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="lead-description" className="block text-sm font-medium text-white mb-1">
                  {lang === "bn" ? "প্রজেক্টের বিবরণ *" : "Project Description *"}
                </label>
                <textarea
                  id="lead-description"
                  {...register("project_description")}
                  rows={3}
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
                  <p id="lead-description-error" className="text-red-300 text-xs mt-1">{errors.project_description.message}</p>
                )}
              </div>

              {/* Screen 08b (X2) — bands, not a number, and skippable. */}
              <div>
                <p className="block text-sm font-medium text-white mb-1">
                  {lang === "bn" ? "আনুমানিক বাজেট" : "Approximate budget"}
                  <span className="font-normal text-white/70">
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
                          "px-3 py-2 rounded-full text-xs font-semibold border min-h-[36px]",
                          active
                            ? "bg-accent-500 text-[#14182b] border-accent-500"
                            : "bg-white/10 text-white border-white/25 hover:bg-white/15"
                        )}
                      >
                        {lang === "bn" ? band.bn : band.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* The promise the quote form is really making. */}
              <p className="text-xs text-white/75">
                {lang === "bn"
                  ? "১ কর্মদিবসের মধ্যে কোটেশন পাঠাব — ইমেইলে, যাতে প্রতিষ্ঠানের ভেতরে ফরোয়ার্ড করতে পারেন।"
                  : "We send the quote within 1 working day — by email, so you can forward it inside your organisation."}
              </p>

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
      </div>
    </section>
  );
}
