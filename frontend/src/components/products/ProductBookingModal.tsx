"use client";

import { useState } from "react";
import { X, CheckCircle, Send, Loader2 } from "lucide-react";
import { bookingsApi, isQueuedResponse } from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import { BD_PHONE_REGEX } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface Props {
  product: Product;
  open: boolean;
  onClose: () => void;
}

/**
 * Booking request for a product an admin marked "Also bookable" (e.g. a device
 * that needs installation/setup). Creates a real v1 booking via the same
 * `bookingsApi` the Printing/Legal pages use — so the request is tracked in
 * Admin → Bookings. No cart, checkout or payment code is involved.
 */
export default function ProductBookingModal({ product, open, onClose }: Props) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const productName = bn ? product.name_bn || product.name_en : product.name_en;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | "ok" | "queued">(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError(bn ? "নাম দিন" : "Enter your name");
      return;
    }
    if (!BD_PHONE_REGEX.test(phone)) {
      setError(bn ? "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন" : "Enter a valid Bangladesh number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await bookingsApi.create({
        service_type: "product_service",
        service_subtype: product.slug,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        details:
          `${bn ? "পণ্য" : "Product"}: ${productName}` +
          (details.trim() ? `\n${details.trim()}` : ""),
      });
      setDone(isQueuedResponse(res) ? "queued" : "ok");
    } catch {
      setError(bn ? "পাঠানো যায়নি। আবার চেষ্টা করুন।" : "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-[#0f1a2e] rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-heading">
            {bn ? "সেবা / ইনস্টলেশন বুক করুন" : "Book a service / installation"}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
            <p className="font-bold text-heading mb-1">
              {done === "queued"
                ? bn ? "অনুরোধ কিউ হয়েছে!" : "Request queued!"
                : bn ? "অনুরোধ পেয়েছি!" : "Request received!"}
            </p>
            <p className="text-sm text-gray-500">
              {done === "queued"
                ? bn ? "ইন্টারনেট ফিরলে স্বয়ংক্রিয়ভাবে যাবে।" : "It will sync automatically when you're back online."
                : bn ? "২৪ ঘণ্টার মধ্যে যোগাযোগ করব।" : "We'll contact you within 24 hours."}
            </p>
            <button type="button" onClick={onClose} className="btn btn-brand btn-sm mt-4">
              {bn ? "ঠিক আছে" : "Done"}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-muted">{productName}</p>
            {error && <p role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{bn ? "আপনার নাম *" : "Your name *"}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={bn ? "নাম" : "Full name"} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{bn ? "মোবাইল নম্বর *" : "Mobile number *"}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="input" placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{bn ? "বিস্তারিত (ঐচ্ছিক)" : "Details (optional)"}</label>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="input resize-none"
                placeholder={bn ? "আপনার প্রয়োজন লিখুন..." : "What do you need?"} />
            </div>
            <button type="submit" disabled={submitting} className={cn("btn btn-primary btn-md w-full")}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {submitting ? (bn ? "পাঠানো হচ্ছে..." : "Sending...") : bn ? "অনুরোধ পাঠান" : "Send request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
