"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Printer, CheckCircle, Send } from "lucide-react";
import { bookingsApi, isQueuedResponse } from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";
import { BD_PHONE_REGEX } from "@/lib/phone";
import PageHero from "@/components/ui/PageHero";

const schema = z.object({
  customer_name: z.string().min(2),
  customer_phone: z.string().regex(BD_PHONE_REGEX, "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন"),
  service_subtype: z.string().min(1),
  details: z.string().min(10),
});

type FormData = z.infer<typeof schema>;

const PRINT_SERVICES = [
  { value: "visiting_card", label: { en: "Visiting Card (৳300/100pcs)", bn: "ভিজিটিং কার্ড (৳৩০০/১০০টি)" } },
  { value: "banner", label: { en: "Banner (৳50/sqft)", bn: "ব্যানার (৳৫০/বর্গফুট)" } },
  { value: "brochure", label: { en: "Brochure (৳5/pc)", bn: "ব্রোশিওর (৳৫/পিস)" } },
  { value: "doc_print", label: { en: "Document Print (৳3/page)", bn: "ডকুমেন্ট প্রিন্ট (৳৩/পাতা)" } },
  { value: "sticker", label: { en: "Sticker / Label Print", bn: "স্টিকার / লেবেল" } },
  { value: "letterhead", label: { en: "Letterhead / Invoice", bn: "লেটারহেড / ইনভয়েস" } },
];

export default function PrintingPage() {
  const { lang } = useLanguageStore();
  const [isSuccess, setIsSuccess] = useState(false);
  const [queued, setQueued] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { service_subtype: "visiting_card" },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setQueued(false);
    try {
      const response = await bookingsApi.create({
        service_type: "printing",
        service_subtype: data.service_subtype,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        details: data.details,
      });
      setQueued(isQueuedResponse(response));
      setIsSuccess(true);
    } catch {
      setSubmitError(
        lang === "bn"
          ? "বুকিং জমা দেওয়া যায়নি। আবার চেষ্টা করুন।"
          : "Could not submit booking. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <PageHero
        pageKey="printing"
        align="center"
        title={lang === "bn" ? "প্রিন্টিং সেবা" : "Printing Services"}
        subtitle={
          lang === "bn"
            ? "ভিজিটিং কার্ড, ব্যানার, ব্রোশিওর — সর্বোচ্চ মানে সাশ্রয়ী মূল্যে।"
            : "Visiting cards, banners, brochures — best quality at the best price."
        }
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "সেবা" : "Services", href: "/services" },
          { label: lang === "bn" ? "প্রিন্টিং" : "Printing" },
        ]}
        badge={lang === "bn" ? "দ্রুত ডেলিভারি" : "Fast Turnaround"}
      />

      <div className="container mx-auto px-4 max-w-2xl py-12">
        <div className="card p-6 md:p-8">
          {isSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-heading mb-2">
                {queued ? (lang === "bn" ? "অর্ডার কিউ হয়েছে!" : "Booking Queued!") : lang === "bn" ? "অর্ডার গ্রহণ হয়েছে!" : "Booking Confirmed!"}
              </h2>
              <p className="text-gray-500 mb-6">
                {queued
                  ? lang === "bn"
                    ? "ইন্টারনেট ফিরলে বুকিংটি স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।"
                    : "The booking will sync automatically when your connection returns."
                  : lang === "bn"
                    ? "আপনার অর্ডার জমা হয়েছে। আমরা শীঘ্রই ফোনে যোগাযোগ করব।"
                    : "Your order has been submitted. We'll contact you by phone soon."}
              </p>
              <button onClick={() => setIsSuccess(false)} className="btn btn-brand btn-md">
                {lang === "bn" ? "আরও অর্ডার করুন" : "Place Another Order"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {submitError && (
                <p role="alert" className="alert-error">
                  {submitError}
                </p>
              )}
              <div>
                <label className="form-label mb-2">
                  {lang === "bn" ? "সেবার ধরন *" : "Service Type *"}
                </label>
                <select {...register("service_subtype")} className="input">
                  {PRINT_SERVICES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {lang === "bn" ? s.label.bn : s.label.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  {lang === "bn" ? "আপনার নাম *" : "Full Name *"}
                </label>
                <input
                  {...register("customer_name")}
                  className={cn("input", errors.customer_name && "input-error")}
                  placeholder={lang === "bn" ? "নাম লিখুন" : "Your name"}
                />
              </div>

              <div>
                <label className="form-label">
                  {lang === "bn" ? "মোবাইল নম্বর *" : "Mobile Number *"}
                </label>
                <input
                  {...register("customer_phone")}
                  type="tel"
                  className={cn("input", errors.customer_phone && "input-error")}
                  placeholder="01XXXXXXXXX"
                />
                {errors.customer_phone && (
                  <p className="text-red-500 text-xs mt-1">
                    {lang === "bn" ? "সঠিক নম্বর দিন" : "Enter a valid Bangladesh number"}
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">
                  {lang === "bn" ? "বিস্তারিত তথ্য *" : "Details / Requirements *"}
                </label>
                <textarea
                  {...register("details")}
                  rows={4}
                  className={cn("input resize-none", errors.details && "input-error")}
                  placeholder={
                    lang === "bn"
                      ? "পরিমাণ, সাইজ, ডিজাইন সম্পর্কে বিস্তারিত লিখুন..."
                      : "Quantity, size, design requirements, delivery date..."
                  }
                />
                {errors.details && (
                  <p className="text-red-500 text-xs mt-1">
                    {lang === "bn" ? "কমপক্ষে ১০ অক্ষরে লিখুন" : "Please provide more details"}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-lg w-full"
              >
                <Send className="w-5 h-5" />
                {isSubmitting
                  ? lang === "bn" ? "পাঠানো হচ্ছে..." : "Sending..."
                  : lang === "bn" ? "অর্ডার জমা দিন" : "Place Order"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
