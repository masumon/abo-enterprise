"use client";

import { useLanguageStore } from "@/store/language";

/**
 * Shows the reference/tracking number returned after a lead or inquiry is
 * submitted, so every form gives the customer something to quote — the same
 * way orders/bookings show an order/booking number.
 */
export default function ReferenceBadge({ reference }: { reference: string }) {
  const { lang } = useLanguageStore();
  return (
    <div className="mt-4 inline-flex flex-col items-center gap-1 rounded-xl border border-brand-100 bg-brand-50/60 px-5 py-3 dark:border-brand-800 dark:bg-brand-900/30">
      <span className="text-[11px] uppercase tracking-wide text-brand-600/80 dark:text-brand-300/80">
        {lang === "bn" ? "রেফারেন্স নম্বর" : "Reference No."}
      </span>
      <span className="font-mono font-bold text-brand-700 dark:text-brand-200 text-lg">{reference}</span>
      <span className="text-[11px] text-gray-500 dark:text-gray-400">
        {lang === "bn" ? "যোগাযোগের সময় এই নম্বরটি বলুন" : "Mention this number when we contact you"}
      </span>
    </div>
  );
}
