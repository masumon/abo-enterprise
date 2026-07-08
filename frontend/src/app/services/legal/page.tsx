"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Scale, CheckCircle, Send, AlertTriangle } from "lucide-react";
import { bookingsApi, isQueuedResponse } from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";
import { BD_PHONE_REGEX } from "@/lib/phone";
import { saveOrderSnapshot } from "@/lib/orderSnapshot";
import PageHero from "@/components/ui/PageHero";

const schema = z.object({
  customer_name: z.string().min(2),
  customer_phone: z.string().regex(BD_PHONE_REGEX, "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন"),
  service_subtype: z.string().min(1),
  station: z.string().optional(),
  details: z.string().min(20),
});

type FormData = z.infer<typeof schema>;

const LEGAL_SERVICES = [
  {
    value: "gd_writing",
    label: { en: "GD (General Diary)", bn: "জিডি (সাধারণ ডায়েরি)" },
    price: { en: "৳500–1,000", bn: "৳৫০০–১,০০০" },
  },
  {
    value: "fir_writing",
    label: { en: "FIR (First Information Report)", bn: "এফআইআর" },
    price: { en: "৳1,000–2,000", bn: "৳১,০০০–২,০০০" },
  },
  {
    value: "legal_application",
    label: { en: "Legal Application / Petition", bn: "আইনি আবেদন / পিটিশন" },
    price: { en: "৳800–1,500", bn: "৳৮০০–১,৫০০" },
  },
  {
    value: "complaint_letter",
    label: { en: "Complaint Letter", bn: "অভিযোগ পত্র" },
    price: { en: "৳500–800", bn: "৳৫০০–৮০০" },
  },
];

export default function LegalPage() {
  const { lang } = useLanguageStore();
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);
  const [queued, setQueued] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { service_subtype: "gd_writing" },
  });

  const selectedService = watch("service_subtype");
  const selectedPrice = LEGAL_SERVICES.find((s) => s.value === selectedService)?.price;

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setQueued(false);
    setSubmitError(null);
    try {
      const details = data.station
        ? `থানা/অফিস: ${data.station}\n\n${data.details}`
        : data.details;

      const selected = LEGAL_SERVICES.find((s) => s.value === data.service_subtype);
      const response = await bookingsApi.create({
        service_type: "legal",
        service_subtype: data.service_subtype,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        details,
        estimated_price: selected?.price.en,
      });
      const wasQueued = isQueuedResponse(response);
      setQueued(wasQueued);

      // Same as an order: show the invoice/receipt page with the booking
      // (reference) number, downloadable invoice and status.
      const created = response.data?.data as { booking_id?: string; booking_number?: string } | null;
      if (!wasQueued && created?.booking_id) {
        // Mirror the backend's price parse (first number of the range) so the
        // instant snapshot matches the invoice the API returns.
        const amount = Number((selected?.price.en ?? "").replace(/,/g, "").match(/[\d.]+/)?.[0] ?? 0) || 0;
        saveOrderSnapshot({
          kind: "booking",
          reference: created.booking_id,
          phone: data.customer_phone,
          customer_name: data.customer_name,
          payment_method: "pending",
          items: [{ name: selected?.label.en ?? data.service_subtype, quantity: 1, price: amount, subtotal: amount }],
          subtotal: amount,
          delivery_charge: 0,
          total: amount,
          booking_number: created.booking_number,
          service_name: "Legal Service",
          created_at: new Date().toISOString(),
        });
        router.push(`/booking-success?booking=${created.booking_id}&phone=${encodeURIComponent(data.customer_phone)}`);
        return;
      }
      setIsSuccess(true);
    } catch {
      setSubmitError(lang === "bn" ? "বুকিং জমা দেওয়া যায়নি। আবার চেষ্টা করুন।" : "Could not submit booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <PageHero
        pageKey="legal"
        align="center"
        title={lang === "bn" ? "আইনি কেস রাইটিং" : "Legal Case Writing"}
        subtitle={
          lang === "bn"
            ? "পেশাদার সহায়তায় জিডি, এফআইআর ও আইনি আবেদন লেখার সেবা।"
            : "Professional GD, FIR, and legal application writing service."
        }
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "সেবা" : "Services", href: "/services" },
          { label: lang === "bn" ? "আইনি" : "Legal" },
        ]}
        badge={lang === "bn" ? "বিশ্বস্ত সহায়তা" : "Trusted Support"}
      />

      <div className="container mx-auto px-4 max-w-2xl py-12">
        {/* Disclaimer */}
        <div className="alert-warning flex gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            {lang === "bn"
              ? "এই সেবা শুধু ডকুমেন্ট লেখার সহায়তা প্রদান করে। আইনি পরামর্শের জন্য একজন আইনজীবীর সাথে পরামর্শ করুন।"
              : "This service provides document writing assistance only. For legal advice, consult a qualified lawyer."}
          </p>
        </div>

        <div className="card p-6 md:p-8">
          {isSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-heading mb-2">
                {queued ? (lang === "bn" ? "অনুরোধ কিউ হয়েছে!" : "Request Queued!") : lang === "bn" ? "অনুরোধ গ্রহণ হয়েছে!" : "Request Received!"}
              </h2>
              <p className="text-gray-500 mb-6">
                {queued
                  ? lang === "bn"
                    ? "ইন্টারনেট ফিরলে অনুরোধটি স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।"
                    : "The request will sync automatically when your connection returns."
                  : lang === "bn"
                    ? "আপনার অনুরোধ জমা হয়েছে। আমরা শীঘ্রই ফোনে যোগাযোগ করব।"
                    : "Your request has been submitted. We'll contact you by phone soon."}
              </p>
              <button onClick={() => setIsSuccess(false)} className="btn btn-brand btn-md">
                {lang === "bn" ? "আরেকটি অনুরোধ করুন" : "New Request"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Service Selector */}
              <div>
                <label className="form-label mb-2">
                  {lang === "bn" ? "সেবার ধরন *" : "Service Type *"}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {LEGAL_SERVICES.map((s) => (
                    <label
                      key={s.value}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all",
                        selectedService === s.value
                          ? "border-brand-500 bg-brand-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <input type="radio" value={s.value} {...register("service_subtype")} className="sr-only" />
                      <span className="font-medium text-sm text-heading">
                        {lang === "bn" ? s.label.bn : s.label.en}
                      </span>
                      <span className="text-accent-500 font-semibold text-sm">
                        {lang === "bn" ? s.price.bn : s.price.en}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {lang === "bn" ? "মোবাইল নম্বর *" : "Mobile *"}
                  </label>
                  <input
                    {...register("customer_phone")}
                    type="tel"
                    className={cn("input", errors.customer_phone && "input-error")}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  {lang === "bn" ? "থানা / অফিস (যদি প্রযোজ্য)" : "Police Station / Office (if applicable)"}
                </label>
                <input
                  {...register("station")}
                  className="input"
                  placeholder={lang === "bn" ? "থানার নাম" : "Station name"}
                />
              </div>

              <div>
                <label className="form-label">
                  {lang === "bn" ? "ঘটনার বিবরণ *" : "Incident Details *"}
                </label>
                <textarea
                  {...register("details")}
                  rows={5}
                  className={cn("input resize-none", errors.details && "input-error")}
                  placeholder={
                    lang === "bn"
                      ? "ঘটনার তারিখ, সময়, স্থান ও বিস্তারিত বর্ণনা দিন..."
                      : "Date, time, location, and full description of the incident..."
                  }
                />
                {errors.details && (
                  <p className="text-red-500 text-xs mt-1">
                    {lang === "bn" ? "কমপক্ষে ২০ অক্ষরে বিবরণ দিন" : "Please provide more details"}
                  </p>
                )}
              </div>

              {submitError && (
                <p role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  {submitError}
                </p>
              )}

              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg w-full">
                <Send className="w-5 h-5" />
                {isSubmitting
                  ? lang === "bn" ? "পাঠানো হচ্ছে..." : "Sending..."
                  : lang === "bn" ? "অনুরোধ জমা দিন" : "Submit Request"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
