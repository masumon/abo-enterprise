"use client";

import { FileText, Truck } from "lucide-react";
import type { PublicInvoiceData } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface Props {
  invoice: PublicInvoiceData;
  lang: "en" | "bn";
}

/** Customer-facing invoice, laid out to read well in a screenshot. */
export default function InvoiceCard({ invoice, lang }: Props) {
  const bn = lang === "bn";
  const deliveryCharge = invoice.delivery_charge ?? 0;
  const isPaid = ["paid", "completed"].includes(invoice.payment_status);
  const issued = invoice.issued_date ?? invoice.created_at;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden text-left shadow-sm">
      {/* Header */}
      <div className="bg-brand-600 px-5 py-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-white font-bold text-sm">ABO Enterprise</p>
          <p className="text-brand-100 text-[11px]">{bn ? "ইনভয়েস" : "INVOICE"}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-mono font-bold text-sm">
            {invoice.invoice_number || (bn ? "তৈরি হচ্ছে…" : "Generating…")}
          </p>
          <span
            className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPaid ? "bg-green-400/20 text-green-100" : "bg-amber-400/20 text-amber-100"
            }`}
          >
            {isPaid ? (bn ? "পরিশোধিত" : "PAID") : (bn ? "অপরিশোধিত" : "PENDING")}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Reference numbers */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {invoice.order_number && (
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wide">{bn ? "অর্ডার নম্বর" : "Order #"}</p>
              <p className="font-mono font-semibold text-heading">{invoice.order_number}</p>
            </div>
          )}
          {invoice.booking_number && (
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wide">{bn ? "বুকিং নম্বর" : "Booking #"}</p>
              <p className="font-mono font-semibold text-heading">{invoice.booking_number}</p>
            </div>
          )}
          {issued && (
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wide">{bn ? "তারিখ" : "Date"}</p>
              <p className="font-medium text-heading">
                {new Date(issued).toLocaleDateString(bn ? "bn-BD" : "en-BD", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
          )}
          {invoice.payment_method && (
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wide">{bn ? "পেমেন্ট" : "Payment"}</p>
              <p className="font-medium text-heading capitalize">{invoice.payment_method.replace(/_/g, " ")}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide">{bn ? "গ্রাহক" : "Customer"}</p>
            <p className="font-medium text-heading">{invoice.customer_name}</p>
          </div>
        </div>

        {/* Courier tracking */}
        {invoice.courier_tracking_id && (
          <div className="flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 rounded-xl px-3 py-2">
            <Truck className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <div className="text-sm min-w-0">
              <span className="text-muted">{bn ? "ট্র্যাকিং:" : "Tracking:"} </span>
              <span className="font-mono font-semibold text-heading">{invoice.courier_tracking_id}</span>
              {invoice.courier_provider && (
                <span className="text-muted capitalize"> ({invoice.courier_provider})</span>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-[11px] uppercase tracking-wide text-muted">
                <th className="text-left px-3 py-2 font-semibold">{bn ? "আইটেম" : "Item"}</th>
                <th className="text-center px-2 py-2 font-semibold">{bn ? "পরিমাণ" : "Qty"}</th>
                <th className="text-right px-3 py-2 font-semibold">{bn ? "মূল্য" : "Amount"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-heading">{item.name}</td>
                  <td className="px-2 py-2 text-center text-muted">{item.quantity}</td>
                  <td className="px-3 py-2 text-right font-medium text-heading">
                    {formatPrice(item.subtotal ?? item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted">
            <span>{bn ? "সাবটোটাল" : "Subtotal"}</span>
            <span>{formatPrice(invoice.subtotal)}</span>
          </div>
          {deliveryCharge > 0 && (
            <div className="flex justify-between text-muted">
              <span>{bn ? "ডেলিভারি চার্জ" : "Delivery"}</span>
              <span>{formatPrice(deliveryCharge)}</span>
            </div>
          )}
          {invoice.tax > 0 && (
            <div className="flex justify-between text-muted">
              <span>{bn ? "ট্যাক্স" : "Tax"}</span>
              <span>{formatPrice(invoice.tax)}</span>
            </div>
          )}
          <div className="flex justify-between items-center font-bold text-base pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-heading">{bn ? "সর্বমোট" : "Total"}</span>
            <span className="text-brand-600 dark:text-brand-300">{formatPrice(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-muted flex-shrink-0" />
        <p className="text-[11px] text-muted">
          {bn
            ? "এই ইনভয়েসটি স্বয়ংক্রিয়ভাবে তৈরি হয়েছে — স্ক্রিনশট নিন বা PDF ডাউনলোড করুন।"
            : "This invoice was generated automatically — screenshot it or download the PDF."}
        </p>
      </div>
    </div>
  );
}
