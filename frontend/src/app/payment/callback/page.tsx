"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, Package } from "lucide-react";
import { paymentsApi } from "@/lib/api";
import { useLanguageStore } from "@/store/language";

type Status = "verifying" | "success" | "failed" | "error";

function PaymentCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { lang } = useLanguageStore();

  const [status, setStatus] = useState<Status>("verifying");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const sslStatus = params.get("status");
    const orderNum = params.get("order_number") ?? params.get("order");
    setOrderNumber(orderNum);

    // SSLCommerz redirects with ?status=success|failed|cancelled&order=...
    if (sslStatus) {
      if (sslStatus === "success") {
        setStatus("success");
        setTimeout(() => {
          router.push(`/order-success${orderNum ? `?order=${orderNum}` : ""}`);
        }, 2500);
      } else {
        setStatus("failed");
        if (sslStatus === "cancelled") {
          setErrorMessage(
            lang === "bn" ? "পেমেন্ট বাতিল করা হয়েছে।" : "Payment was cancelled."
          );
        }
      }
      return;
    }

    const gateway = params.get("gateway") as "bkash" | "nagad" | null;
    const paymentId = params.get("payment_id") ?? params.get("paymentID") ?? params.get("session_id");

    if (!gateway || !paymentId) {
      setStatus("error");
      setErrorMessage(lang === "bn" ? "পেমেন্ট তথ্য পাওয়া যায়নি।" : "Payment information not found.");
      return;
    }

    const verify = async () => {
      try {
        const res =
          gateway === "bkash"
            ? await paymentsApi.verifyBkash(paymentId)
            : await paymentsApi.verifyNagad(paymentId);

        const data = res.data.data;
        if (data?.success) {
          setStatus("success");
          setTimeout(() => {
            router.push(`/order-success${orderNum ? `?order=${orderNum}` : ""}`);
          }, 2500);
        } else {
          setStatus("failed");
        }
      } catch {
        setStatus("error");
        setErrorMessage(
          lang === "bn"
            ? "পেমেন্ট যাচাই করা সম্ভব হয়নি। সাপোর্টে যোগাযোগ করুন।"
            : "Could not verify payment. Please contact support."
        );
      }
    };

    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 page-surface pb-mobile-nav lg:pb-0">
      <div className="surface-card rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="w-14 h-14 text-brand-500 mx-auto mb-5 animate-spin" />
            <h1 className="text-xl font-bold text-heading mb-2">
              {lang === "bn" ? "পেমেন্ট যাচাই হচ্ছে..." : "Verifying payment..."}
            </h1>
            <p className="text-muted text-sm">
              {lang === "bn" ? "দয়া করে অপেক্ষা করুন।" : "Please wait a moment."}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-heading mb-2">
              {lang === "bn" ? "পেমেন্ট সফল!" : "Payment Successful!"}
            </h1>
            <p className="text-muted mb-4">
              {lang === "bn"
                ? "আপনার পেমেন্ট নিশ্চিত হয়েছে। রিডাইরেক্ট হচ্ছে..."
                : "Your payment is confirmed. Redirecting..."}
            </p>
            {orderNumber && (
              <div className="bg-brand-50 dark:bg-brand-900/30 rounded-xl p-3">
                <p className="text-xs text-brand-600 dark:text-brand-300 font-medium mb-0.5">
                  {lang === "bn" ? "অর্ডার নম্বর" : "Order Number"}
                </p>
                <p className="text-lg font-bold text-brand-700 dark:text-brand-200">{orderNumber}</p>
              </div>
            )}
          </>
        )}

        {(status === "failed" || status === "error") && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-heading mb-2">
              {status === "failed"
                ? lang === "bn" ? "পেমেন্ট ব্যর্থ" : "Payment Failed"
                : lang === "bn" ? "সমস্যা হয়েছে" : "Something went wrong"}
            </h1>
            <p className="text-muted mb-6">
              {errorMessage ??
                (lang === "bn"
                  ? "পেমেন্ট সম্পন্ন হয়নি। আবার চেষ্টা করুন।"
                  : "Payment was not completed. Please try again.")}
            </p>
            <div className="space-y-3">
              <Link
                href="/checkout"
                className="btn btn-brand btn-md w-full flex items-center justify-center gap-2"
              >
                {lang === "bn" ? "আবার চেষ্টা করুন" : "Try Again"}
              </Link>
              {orderNumber && (
                <Link
                  href={`/track?order=${orderNumber}`}
                  className="btn btn-outline btn-md w-full flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  {lang === "bn" ? "অর্ডার ট্র্যাক করুন" : "Track Order"}
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
