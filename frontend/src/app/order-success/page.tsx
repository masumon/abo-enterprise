"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";

export default function OrderSuccessPage() {
  const params = useSearchParams();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    setOrderNumber(params.get("order"));
  }, [params]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-5">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
        <p className="text-gray-500 mb-6">
          Thank you for your order. We&apos;ll contact you shortly to confirm.
        </p>

        {orderNumber && (
          <div className="bg-brand-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-brand-600 font-medium mb-1">Order Number</p>
            <p className="text-xl font-bold text-brand-700">{orderNumber}</p>
            <p className="text-xs text-brand-500 mt-1">Save this to track your order</p>
          </div>
        )}

        <div className="space-y-3">
          {orderNumber && (
            <Link
              href={`/track?order=${orderNumber}`}
              className="btn btn-brand btn-md w-full flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              Track Order
            </Link>
          )}
          <Link
            href="/products"
            className="btn btn-outline btn-md w-full flex items-center justify-center gap-2"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
