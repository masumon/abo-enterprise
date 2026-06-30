"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Package, ArrowRight, Share2, Download, Loader2 } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { trackPurchase } from "@/components/analytics/FacebookPixel";
import { downloadPublicOrderInvoice } from "@/lib/api";
import PageHero from "@/components/ui/PageHero";

function ConfettiBurst() {
  useEffect(() => {
    const colors = ["#1e5ba8", "#e91e63", "#16a34a", "#f59e0b", "#8b5cf6"];
    const pieces = Array.from({ length: 40 }, (_, i) => {
      const el = document.createElement("div");
      el.style.cssText = `
        position:fixed; width:8px; height:8px; border-radius:2px; pointer-events:none; z-index:9999;
        left:${Math.random() * 100}vw; top:-10px;
        background:${colors[i % colors.length]};
        animation:confetti-fall ${1.2 + Math.random()}s ease-out forwards;
        transform:rotate(${Math.random() * 360}deg);
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
      return el;
    });
    return () => pieces.forEach((p) => p.remove());
  }, []);
  return (
    <style jsx global>{`
      @keyframes confetti-fall {
        to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `}</style>
  );
}

function OrderSuccessContent() {
  const params = useSearchParams();
  const { lang } = useLanguageStore();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const order = params.get("order");
    const ph = params.get("phone");
    setOrderNumber(order);
    setPhone(ph);
    if (order) trackPurchase(0, order);
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, [params]);

  const shareText = orderNumber
    ? encodeURIComponent(lang === "bn" ? `আমার ABO অর্ডার: ${orderNumber}` : `My ABO order: ${orderNumber}`)
    : null;

  const handleDownloadInvoice = async () => {
    if (!orderNumber || !phone) return;
    setPdfLoading(true);
    try {
      await downloadPublicOrderInvoice(orderNumber, phone);
    } catch {
      /* user can retry */
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShare = async () => {
    const text = orderNumber
      ? (lang === "bn" ? `আমার ABO অর্ডার: ${orderNumber}` : `My ABO order: ${orderNumber}`)
      : window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "ABO Enterprise", text });
    }
  };

  return (
    <main className="min-h-screen page-surface pb-mobile-nav lg:pb-0">
      {showConfetti && <ConfettiBurst />}
      <PageHero
        title={lang === "bn" ? "অর্ডার হয়েছে!" : "Order Placed!"}
        subtitle={
          lang === "bn"
            ? "আপনার অর্ডারের জন্য ধন্যবাদ"
            : "Thank you for your order"
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
            ? "আপনার অর্ডারের জন্য ধন্যবাদ। নিশ্চিত করতে আমরা শীঘ্রই যোগাযোগ করব।"
            : "Thank you for your order. We'll contact you shortly to confirm."}
        </p>

        {orderNumber && (
          <div className="bg-brand-50 dark:bg-brand-900/30 rounded-xl p-4 mb-6">
            <p className="text-xs text-brand-600 dark:text-brand-300 font-medium mb-1">
              {lang === "bn" ? "অর্ডার নম্বর" : "Order Number"}
            </p>
            <p className="text-xl font-bold text-brand-700 dark:text-brand-200 font-mono">{orderNumber}</p>
            <p className="text-xs text-brand-500 dark:text-brand-400 mt-1">
              {lang === "bn" ? "ট্র্যাক করতে সংরক্ষণ করুন" : "Save this to track your order"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {orderNumber && phone && (
            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={pdfLoading}
              className="btn btn-brand btn-md w-full flex items-center justify-center gap-2"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {lang === "bn" ? "ইনভয়েস PDF ডাউনলোড" : "Download Invoice PDF"}
            </button>
          )}
          {orderNumber && (
            <Link
              href={`/track?order=${orderNumber}`}
              className="btn btn-brand btn-md w-full flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              {lang === "bn" ? "অর্ডার ট্র্যাক করুন" : "Track Order"}
            </Link>
          )}
          <button type="button" onClick={handleShare} className="btn btn-outline btn-md w-full flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            {lang === "bn" ? "শেয়ার করুন" : "Share"}
          </button>
          <Link
            href="/products"
            className="btn btn-ghost btn-md w-full flex items-center justify-center gap-2"
          >
            {lang === "bn" ? "কেনাকাটা চালিয়ে যান" : "Continue Shopping"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
