"use client";

import { Truck, Phone, Mail, MapPin, CheckCircle2, Clock } from "lucide-react";
import type { PublicInvoiceData } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import BrandLogo from "@/components/ui/BrandLogo";
import { getBrandTagline } from "@/lib/tokens";
import {
  DEFAULT_ADDRESS_EN,
  DEFAULT_ADDRESS_BN,
  DEFAULT_BUSINESS_PHONE,
  DEFAULT_BUSINESS_EMAIL,
} from "@/lib/maps";

interface Props {
  invoice: PublicInvoiceData;
  lang: "en" | "bn";
}

/** Customer-facing invoice — premium, screenshot-ready, bilingual, dark-aware. */
export default function InvoiceCard({ invoice, lang }: Props) {
  const bn = lang === "bn";
  const deliveryCharge = invoice.delivery_charge ?? 0;
  const isPaid = ["paid", "completed"].includes(invoice.payment_status);
  const issued = invoice.issued_date ?? invoice.created_at;
  const reference = invoice.order_number || invoice.booking_number;
  const refLabel = invoice.order_number
    ? bn ? "অর্ডার নম্বর" : "Order No."
    : bn ? "বুকিং নম্বর" : "Booking No.";

  return (
    <div className="relative bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700 rounded-2xl overflow-hidden text-left shadow-xl shadow-brand-900/[0.07]">
      {/* ── Header ── */}
      <div className="gradient-brand relative px-5 sm:px-6 py-5 overflow-hidden">
        {/* decorative sheen */}
        <div
          aria-hidden
          className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 blur-2xl pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -left-8 w-44 h-44 rounded-full bg-white/[0.06] blur-2xl pointer-events-none"
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="md" href={false} variant="light" />
            <div className="min-w-0">
              <p className="font-bold text-white text-base leading-tight tracking-tight">
                ABO Enterprise
              </p>
              <p className="text-white/70 text-[11px] truncate">{getBrandTagline(lang)}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white/80 text-[10px] font-semibold uppercase tracking-[0.2em]">
              {bn ? "ইনভয়েস" : "Invoice"}
            </p>
            <p className="text-white font-mono font-bold text-sm mt-0.5">
              {invoice.invoice_number || (bn ? "তৈরি হচ্ছে…" : "Generating…")}
            </p>
            <span
              className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${
                isPaid
                  ? "bg-green-400/15 text-green-50 ring-green-300/40"
                  : "bg-amber-400/15 text-amber-50 ring-amber-300/40"
              }`}
            >
              {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {isPaid ? (bn ? "পরিশোধিত" : "PAID") : (bn ? "অপরিশোধিত" : "PENDING")}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-5">
        {/* ── Bill-to + meta ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
              {bn ? "গ্রাহক" : "Billed To"}
            </p>
            <p className="font-semibold text-heading leading-tight">{invoice.customer_name}</p>
            {invoice.customer_phone && (
              <p className="text-xs text-muted mt-0.5 font-mono">{invoice.customer_phone}</p>
            )}
            {invoice.service_name && (
              <p className="text-xs text-brand-600 dark:text-brand-300 mt-1 font-medium">
                {invoice.service_name}
              </p>
            )}
          </div>
          <div className="text-right space-y-1.5">
            {reference && (
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">{refLabel}</p>
                <p className="font-mono font-semibold text-heading text-sm">{reference}</p>
              </div>
            )}
            {issued && (
              <p className="text-xs text-muted">
                {new Date(issued).toLocaleDateString(bn ? "bn-BD" : "en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
            {invoice.payment_method && (
              <p className="text-xs text-muted capitalize">
                {bn ? "পেমেন্ট: " : "Paid via "}
                {invoice.payment_method.replace(/_/g, " ")}
              </p>
            )}
          </div>
        </div>

        {/* ── Courier tracking ── */}
        {invoice.courier_tracking_id && (
          <div className="flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 rounded-xl px-3 py-2">
            <Truck className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <div className="text-sm min-w-0">
              <span className="text-muted">{bn ? "ট্র্যাকিং: " : "Tracking: "}</span>
              <span className="font-mono font-semibold text-heading">{invoice.courier_tracking_id}</span>
              {invoice.courier_provider && (
                <span className="text-muted capitalize"> ({invoice.courier_provider})</span>
              )}
            </div>
          </div>
        )}

        {/* ── Items ── */}
        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-[10px] uppercase tracking-wider text-muted">
                <th className="text-left px-3.5 py-2.5 font-semibold">{bn ? "আইটেম" : "Item"}</th>
                <th className="text-center px-2 py-2.5 font-semibold w-14">{bn ? "পরিমাণ" : "Qty"}</th>
                <th className="text-right px-3.5 py-2.5 font-semibold">{bn ? "মূল্য" : "Amount"}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr
                  key={i}
                  className="border-t border-gray-100 dark:border-gray-800 odd:bg-white even:bg-gray-50/40 dark:odd:bg-transparent dark:even:bg-gray-800/20"
                >
                  <td className="px-3.5 py-2.5 text-heading">{item.name}</td>
                  <td className="px-2 py-2.5 text-center text-muted">{item.quantity}</td>
                  <td className="px-3.5 py-2.5 text-right font-medium text-heading whitespace-nowrap">
                    {formatPrice(item.subtotal ?? item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Totals ── */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted">
            <span>{bn ? "সাবটোটাল" : "Subtotal"}</span>
            <span className="tabular-nums">{formatPrice(invoice.subtotal)}</span>
          </div>
          {deliveryCharge > 0 && (
            <div className="flex justify-between text-muted">
              <span>{bn ? "ডেলিভারি চার্জ" : "Delivery"}</span>
              <span className="tabular-nums">{formatPrice(deliveryCharge)}</span>
            </div>
          )}
          {invoice.tax > 0 && (
            <div className="flex justify-between text-muted">
              <span>{bn ? "ট্যাক্স" : "Tax"}</span>
              <span className="tabular-nums">{formatPrice(invoice.tax)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between items-center rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 px-4 py-3">
            <span className="font-semibold text-brand-800 dark:text-brand-100">
              {bn ? "সর্বমোট" : "Total"}
            </span>
            <span className="text-xl font-bold text-brand-700 dark:text-brand-200 tabular-nums">
              {formatPrice(invoice.total)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-5 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <p className="text-center text-sm font-semibold text-brand-700 dark:text-brand-300 mb-2">
          {bn ? "ABO Enterprise বেছে নেওয়ার জন্য ধন্যবাদ!" : "Thank you for choosing ABO Enterprise!"}
        </p>
        <div className="flex flex-col items-center gap-1 text-[11px] text-muted">
          <span className="flex items-center gap-1.5 text-center">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {bn ? DEFAULT_ADDRESS_BN : DEFAULT_ADDRESS_EN}
          </span>
          <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {DEFAULT_BUSINESS_PHONE}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {DEFAULT_BUSINESS_EMAIL}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
