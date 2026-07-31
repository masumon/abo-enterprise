"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isQueuedResponse, serviceLeadsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { BD_PHONE_REGEX } from "@/lib/phone";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useLanguageStore } from "@/store/language";
import { useToastStore } from "@/store/toast";
import { useT } from "@/lib/i18n/useT";

const b2bQuotationSchema = z.object({
  company_name: z.string().min(2, "Company name required"),
  contact_name: z.string().min(2, "Contact name required"),
  contact_phone: z.string().regex(BD_PHONE_REGEX, "Invalid Bangladesh phone"),
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  budget_band: z.enum(["starter", "business", "enterprise"], { errorMap: () => ({ message: "Select budget band" }) }),
  company_details: z.string().min(20, "Provide company details (min 20 chars)"),
  requirements: z.string().min(20, "Describe requirements (min 20 chars)"),
});

type B2BFormData = z.infer<typeof b2bQuotationSchema>;

const BUDGET_BANDS = [
  { value: "starter", label: "Starter", desc: "৳৫,০০০ - ৳৫০,০০০", desc_en: "$50 - $600" },
  { value: "business", label: "Business", desc: "৳৫০,০০০ - ৳৫,০০,০০০", desc_en: "$600 - $6,000" },
  { value: "enterprise", label: "Enterprise", desc: "৳৫,০০,০০০+", desc_en: "$6,000+" },
];

interface Props {
  onSuccess?: () => void;
}

export default function B2BQuotationForm({ onSuccess }: Props) {
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [queued, setQueued] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string>("business");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<B2BFormData>({
    resolver: zodResolver(b2bQuotationSchema),
    defaultValues: { budget_band: "business" },
  });

  async function onSubmit(data: B2BFormData) {
    try {
      setSubmitting(true);
      setQueued(false);
      setSubmitError(null);

      const response = await serviceLeadsApi.create({
        lead_type: "b2b_quotation",
        name: data.contact_name,
        phone: data.contact_phone,
        email: data.contact_email?.trim() || undefined,
        company: data.company_name,
        project_description: data.company_details,
        requirements: data.requirements,
      });

      if (response.status === 200 || response.status === 201 || response.status === 202) {
        const wasQueued = isQueuedResponse(response);
        setQueued(wasQueued);
        const created = response.data?.data as { lead_number?: string } | null;
        setReference(created?.lead_number || "confirmed");
        setSuccess(true);
        reset();
        toast("success", lang === "bn" ? "কোটেশন পাঠানো হয়েছে" : "Quotation sent successfully");
        onSuccess?.();
      }
    } catch (err) {
      setSubmitError(apiErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-8 px-4">
        <div className="text-5xl mb-4">✓</div>
        <h3 className="text-xl font-bold mb-2 text-heading">
          {lang === "bn" ? "কোটেশন অনুরোধ পাঠানো হয়েছে" : "Quotation Request Sent"}
        </h3>
        <p className="text-muted mb-4">
          {lang === "bn"
            ? "আমাদের দল শীঘ্রই আপনার সাথে যোগাযোগ করবে"
            : "Our team will contact you shortly"}
        </p>
        {reference && <p className="text-sm text-gray-500">{lang === "bn" ? "রেফারেন্স" : "Reference"}: {reference}</p>}
        {queued && (
          <p className="text-xs text-orange-600 mt-2">
            {lang === "bn" ? "অফলাইন কিউতে রয়েছে, অনলাইন হলে পাঠানো হবে" : "Queued (will send when online)"}
          </p>
        )}
        <button onClick={() => setSuccess(false)} className="btn btn-primary btn-sm mt-4">
          {lang === "bn" ? "নতুন অনুরোধ" : "New Request"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Company Section */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">{lang === "bn" ? "কোম্পানির তথ্য" : "Company Information"}</h3>

        <div>
          <label className="block text-sm font-semibold mb-1">{lang === "bn" ? "কোম্পানির নাম" : "Company Name"}</label>
          <input
            type="text"
            placeholder={lang === "bn" ? "আপনার কোম্পানির নাম" : "Your company name"}
            {...register("company_name")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {errors.company_name && <p className="text-red-500 text-xs mt-1">{errors.company_name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">{lang === "bn" ? "কোম্পানির বিবরণ" : "Company Details"}</label>
          <textarea
            placeholder={lang === "bn" ? "আপনার ব্যবসা সম্পর্কে বলুন" : "Tell us about your business"}
            {...register("company_details")}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
          />
          {errors.company_details && <p className="text-red-500 text-xs mt-1">{errors.company_details.message}</p>}
        </div>
      </div>

      {/* Contact Section */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">{lang === "bn" ? "যোগাযোগ তথ্য" : "Contact Information"}</h3>

        <div>
          <label className="block text-sm font-semibold mb-1">{lang === "bn" ? "যোগাযোগের নাম" : "Contact Name"}</label>
          <input
            type="text"
            placeholder={lang === "bn" ? "আপনার নাম" : "Your name"}
            {...register("contact_name")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {errors.contact_name && <p className="text-red-500 text-xs mt-1">{errors.contact_name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">{lang === "bn" ? "ফোন" : "Phone"}</label>
          <input
            type="tel"
            placeholder="+880 1XX XXXXXXX"
            {...register("contact_phone")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {errors.contact_phone && <p className="text-red-500 text-xs mt-1">{errors.contact_phone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">{lang === "bn" ? "ইমেইল" : "Email"} ({lang === "bn" ? "ঐচ্ছিক" : "Optional"})</label>
          <input
            type="email"
            placeholder="name@company.com"
            {...register("contact_email")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {errors.contact_email && <p className="text-red-500 text-xs mt-1">{errors.contact_email.message}</p>}
        </div>
      </div>

      {/* Budget Band Selection */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">{lang === "bn" ? "বাজেট" : "Budget"}</h3>
        <div className="grid grid-cols-3 gap-2">
          {BUDGET_BANDS.map((band) => (
            <button
              key={band.value}
              type="button"
              onClick={() => setSelectedBudget(band.value)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                selectedBudget === band.value
                  ? "border-brand-600 bg-brand-50 dark:bg-brand-900/30"
                  : "border-gray-200 bg-white dark:bg-white/5"
              }`}
            >
              <div className="font-semibold text-sm">{band.label}</div>
              <div className="text-xs text-gray-500 mt-1">
                {lang === "bn" ? band.desc : band.desc_en}
              </div>
            </button>
          ))}
        </div>
        <input type="hidden" {...register("budget_band")} value={selectedBudget} />
      </div>

      {/* Requirements */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">{lang === "bn" ? "প্রয়োজনীয়তা" : "Requirements"}</h3>

        <div>
          <label className="block text-sm font-semibold mb-1">{lang === "bn" ? "আপনার প্রয়োজন কি?" : "What do you need?"}</label>
          <textarea
            placeholder={lang === "bn" ? "আপনার প্রকল্পের বিবরণ" : "Describe your project needs"}
            {...register("requirements")}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
          />
          {errors.requirements && <p className="text-red-500 text-xs mt-1">{errors.requirements.message}</p>}
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full btn btn-primary btn-lg disabled:opacity-50"
      >
        {submitting ? <LoadingSpinner size={20} /> : (lang === "bn" ? "কোটেশন পাঠান" : "Request Quotation")}
      </button>
    </form>
  );
}
