"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Package, Loader2, CheckCircle2, Truck, Clock, XCircle } from "lucide-react";
import { ordersApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface TrackResult {
  order_number: string;
  order_status: string;
  payment_method: string;
  total: number;
  items_count: number;
  created_at: string;
}

const STATUS_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-5 h-5" />,
  confirmed: <CheckCircle2 className="w-5 h-5" />,
  processing: <Package className="w-5 h-5" />,
  shipped: <Truck className="w-5 h-5" />,
  delivered: <CheckCircle2 className="w-5 h-5" />,
  cancelled: <XCircle className="w-5 h-5" />,
};

export default function TrackPage() {
  const params = useSearchParams();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const orderParam = params.get("order");
    if (orderParam) {
      setInput(orderParam);
      handleTrack(orderParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrack = async (orderNumber?: string) => {
    const num = (orderNumber ?? input).trim();
    if (!num) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await ordersApi.track(num);
      setResult(r.data.data as TrackResult);
    } catch {
      setError("Order not found. Please check the order number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = result ? STATUS_STEPS.indexOf(result.order_status) : -1;
  const isCancelled = result?.order_status === "cancelled";

  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-100 rounded-2xl mb-4">
            <Package className="w-7 h-7 text-brand-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-gray-500">Enter your order number to see the current status</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              placeholder="e.g. ABO-20240101-0001"
              className="input flex-1"
            />
            <button
              onClick={() => handleTrack()}
              disabled={loading || !input.trim()}
              className="btn btn-brand btn-md px-5 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Track
            </button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
          )}
        </div>

        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Order Number</p>
                <p className="text-lg font-bold text-gray-900">{result.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total</p>
                <p className="text-lg font-bold text-brand-600">{formatPrice(result.total)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Items</p>
                <p className="font-semibold text-gray-800">{result.items_count}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Payment</p>
                <p className="font-semibold text-gray-800 capitalize">{result.payment_method}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Date</p>
                <p className="font-semibold text-gray-800">{new Date(result.created_at).toLocaleDateString("en-BD")}</p>
              </div>
            </div>

            {isCancelled ? (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700">Order Cancelled</p>
                  <p className="text-sm text-red-500">This order has been cancelled.</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Order Progress</p>
                <div className="relative">
                  <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-100" />
                  <div className="space-y-4">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i <= stepIndex;
                      const active = i === stepIndex;
                      return (
                        <div key={step} className="relative flex items-center gap-4">
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            done
                              ? active
                                ? "bg-brand-600 text-white"
                                : "bg-green-500 text-white"
                              : "bg-gray-100 text-gray-300"
                          }`}>
                            {STATUS_ICON[step]}
                          </div>
                          <div>
                            <p className={`text-sm font-medium capitalize ${done ? "text-gray-900" : "text-gray-400"}`}>
                              {step}
                            </p>
                            {active && (
                              <p className="text-xs text-brand-500">Current status</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
