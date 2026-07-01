"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Download, Loader2, X, FileText, Wrench } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { downloadPublicBookingInvoice, publicInvoicesApi, type PublicInvoiceData } from "@/lib/api";
import PageHero from "@/components/ui/PageHero";
import InvoiceCard from "@/components/invoice/InvoiceCard";

function BookingSuccessContent() {
  const params = useSearchParams();
  const { lang } = useLanguageStore();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(true);
  const [invoice, setInvoice] = useState<PublicInvoiceData | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    setBookingId(params.get("booking"));
    setPhone(params.get("phone"));
  }, [params]);

  // Auto-load the invoice so the customer sees it on this page
  useEffect(() => {
    if (!bookingId || !phone) return;
    let cancelled = false;
    setInvoiceLoading(true);
    publicInvoicesApi
      .bookingInvoice(bookingId, phone)
      .then((r) => {
        if (!cancelled && r.data?.data) setInvoice(r.data.data);
      })
      .catch(() => {
        /* PDF button still works as fallback */
      })
      .finally(() => {
        if (!cancelled) setInvoiceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, phone]);

  const handleDownloadInvoice = async () => {
    if (!bookingId || !phone) return;
    setPdfLoading(true);
    try {
      await downloadPublicBookingInvoice(bookingId, phone);
    } catch {
      /* user can retry */
    } finally {
      setPdfLoading(false);
    }
  };

  const canDownload = Boolean(bookingId && phone);

  return (
    <main className="min-h-screen page-surface pb-mobile-nav lg:pb-0">
      <PageHero
        pageKey="book"
        title={lang === "bn" ? "বুকিং সম্পন্ন!" : "Booking Confirmed!"}
        subtitle={
          lang === "bn"
            ? "আপনার বুকিংয়ের জন্য ধন্যবাদ"
            : "Thank you for your booking"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "সফল" : "Success" },
        ]}
        variant="light"
      />
      <div className="flex items-center justify-center px-4 pb-12">
        <div className="surface-card rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <p className="text-muted mb-6">
            {lang === "bn"
              ? "আপনার বুকিং গ্রহণ করা হয়েছে। ইনভয়েস নিচে দেখুন — চাইলে ডাউনলোড বা স্ক্রিনশট নিন। আমরা শীঘ্রই যোগাযোগ করব।"
              : "Your booking has been received. Your invoice is below — download or screenshot it if you like. We'll contact you shortly."}
          </p>

          {invoice?.booking_number && (
            <div className="bg-brand-50 dark:bg-brand-900/30 rounded-xl p-4 mb-6">
              <p className="text-xs text-brand-600 dark:text-brand-300 font-medium mb-1">
                {lang === "bn" ? "বুকিং নম্বর" : "Booking Number"}
              </p>
              <p className="text-xl font-bold text-brand-700 dark:text-brand-200 font-mono">{invoice.booking_number}</p>
            </div>
          )}

          {canDownload && showInvoice && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-500" />
                  <p className="text-sm font-semibold text-heading">
                    {lang === "bn" ? "আপনার ইনভয়েস" : "Your Invoice"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvoice(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label={lang === "bn" ? "বন্ধ করুন" : "Dismiss"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {invoiceLoading ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex items-center justify-center gap-2 text-sm text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {lang === "bn" ? "ইনভয়েস তৈরি হচ্ছে…" : "Preparing your invoice…"}
                </div>
              ) : invoice ? (
                <InvoiceCard invoice={invoice} lang={lang} />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-muted text-left">
                  {lang === "bn"
                    ? "ইনভয়েস প্রিভিউ লোড করা যায়নি — নিচের বাটন দিয়ে PDF ডাউনলোড করুন।"
                    : "Couldn't load the invoice preview — use the button below to download the PDF."}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  disabled={pdfLoading}
                  className="btn btn-brand btn-sm flex-1 flex items-center justify-center gap-2"
                >
                  {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {lang === "bn" ? "PDF ডাউনলোড" : "Download PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoice(false)}
                  className="btn btn-ghost btn-sm flex-1"
                >
                  {lang === "bn" ? "এড়িয়ে যান" : "Skip"}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/services"
              className="btn btn-brand btn-md w-full flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              {lang === "bn" ? "আরও সেবা দেখুন" : "Browse More Services"}
            </Link>
            <Link
              href="/"
              className="btn btn-ghost btn-md w-full flex items-center justify-center gap-2"
            >
              {lang === "bn" ? "হোমে ফিরে যান" : "Back to Home"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}>
      <BookingSuccessContent />
    </Suspense>
  );
}
