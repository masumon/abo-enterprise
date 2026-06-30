"use client";

import BrandLogo from "@/components/ui/BrandLogo";
import { getBrandName, getBrandTagline } from "@/lib/tokens";
import { formatPrice } from "@/lib/utils";
import { DEFAULT_ADDRESS_EN } from "@/lib/maps";

interface InvoicePreviewCardProps {
  orderNumber: string;
  orderStatus: string;
  paymentMethod: string;
  total: number;
  itemsCount: number;
  createdAt: string;
  lang: "en" | "bn";
  onPrint?: () => void;
}

export default function InvoicePreviewCard({
  orderNumber,
  orderStatus,
  paymentMethod,
  total,
  itemsCount,
  createdAt,
  lang,
  onPrint,
}: InvoicePreviewCardProps) {
  const bn = lang === "bn";

  return (
    <div className="invoice-preview overflow-hidden rounded-2xl border border-brand-100/80 bg-white shadow-lg shadow-brand-900/5 print:shadow-none print:border-gray-200">
      <div className="invoice-preview-header gradient-brand px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo size="md" href={false} variant="light" />
          <div className="min-w-0">
            <p className="font-bold text-white text-lg leading-tight">{getBrandName(lang)}</p>
            <p className="text-white/75 text-xs truncate">: {getBrandTagline(lang)}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-white/90 text-xs font-semibold uppercase tracking-wider">
            {bn ? "ইনভয়েস" : "Invoice"}
          </p>
          <p className="text-white font-bold text-sm">{orderNumber}</p>
        </div>
      </div>

      <div className="p-6">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm mb-6">
          <div>
            <dt className="text-muted text-xs uppercase tracking-wide mb-0.5">{bn ? "তারিখ" : "Date"}</dt>
            <dd className="font-semibold text-heading">{new Date(createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs uppercase tracking-wide mb-0.5">{bn ? "স্ট্যাটাস" : "Status"}</dt>
            <dd className="font-semibold capitalize text-heading">{orderStatus}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs uppercase tracking-wide mb-0.5">{bn ? "পেমেন্ট" : "Payment"}</dt>
            <dd className="font-semibold uppercase text-heading">{paymentMethod}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs uppercase tracking-wide mb-0.5">{bn ? "আইটেম" : "Items"}</dt>
            <dd className="font-semibold text-heading">{itemsCount}</dd>
          </div>
        </dl>

        <div className="rounded-xl bg-brand-50 border border-brand-100 px-5 py-4 flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-brand-800">{bn ? "মোট পরিশোধ" : "Total Due"}</span>
          <span className="text-2xl font-bold text-brand-700">{formatPrice(total)}</span>
        </div>

        {onPrint && (
          <button type="button" onClick={onPrint} className="btn btn-brand btn-md w-full print:hidden">
            {bn ? "প্রিন্ট / PDF" : "Print / Save PDF"}
          </button>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 text-center text-xs text-muted print:bg-white">
        <p className="font-medium text-brand-700 mb-1">
          {bn ? "ABO Enterprise বেছে নেওয়ার জন্য ধন্যবাদ!" : "Thank you for choosing ABO Enterprise!"}
        </p>
        <p>{DEFAULT_ADDRESS_EN}</p>
      </div>
    </div>
  );
}
