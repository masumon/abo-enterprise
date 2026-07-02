"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, LogOut, Loader2, ChevronRight } from "lucide-react";
import { useCustomerStore } from "@/store/customer";
import { useLanguageStore } from "@/store/language";
import { ordersApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";
import PageHero from "@/components/ui/PageHero";

interface OrderSummary {
  order_number: string;
  order_status: string;
  total: number;
  items_count: number;
  created_at: string;
}

export default function OrdersPage() {
  const { session, logout, isLoggedIn } = useCustomerStore();
  const { lang } = useLanguageStore();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isLoggedIn() || !session?.token) {
      router.replace("/login");
      return;
    }
    ordersApi.byPhone(session.phone, session.token)
      .then((r) => setOrders(r.data.data ?? []))
      .catch((err) => {
        // Expired/invalid OTP token → re-verify
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          logout();
          router.replace("/login");
          return;
        }
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, session, router, logout]);

  const statusLabel = (s: string) => {
    const map: Record<string, { en: string; bn: string }> = {
      pending: { en: "Pending", bn: "অপেক্ষমাণ" },
      confirmed: { en: "Confirmed", bn: "নিশ্চিত" },
      processing: { en: "Processing", bn: "প্রক্রিয়াধীন" },
      shipped: { en: "Shipped", bn: "পাঠানো হয়েছে" },
      delivered: { en: "Delivered", bn: "ডেলিভারি সম্পন্ন" },
      cancelled: { en: "Cancelled", bn: "বাতিল" },
    };
    const l = map[s] ?? { en: s, bn: s };
    return lang === "bn" ? l.bn : l.en;
  };

  return (
    <main className="min-h-screen">
      <PageHero
        pageKey="orders"
        title={lang === "bn" ? "আমার অর্ডার" : "My Orders"}
        subtitle={session ? `${session.name} · ${session.phone}` : undefined}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard", href: "/profile" },
          { label: lang === "bn" ? "অর্ডার" : "Orders" },
        ]}
        variant="light"
      />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="flex justify-end mb-4">
          <button type="button" onClick={() => { logout(); router.push("/login"); }} className="btn btn-ghost btn-sm">
            <LogOut className="w-4 h-4" />
            {lang === "bn" ? "লগআউট" : "Logout"}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
        ) : error ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-500">{lang === "bn" ? "অর্ডার লোড করা যায়নি" : "Could not load orders"}</p>
          </GlassCard>
        ) : orders.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{lang === "bn" ? "কোনো অর্ডার নেই" : "No orders found"}</p>
            <Link href="/products" className="btn btn-brand btn-sm mt-4 inline-flex">{lang === "bn" ? "কেনাকাটা করুন" : "Start Shopping"}</Link>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o.order_number} href={`/orders/${encodeURIComponent(o.order_number)}`}>
                <GlassCard hover className="p-4 flex items-center gap-4">
                  <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{o.order_number}</p>
                    <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB")} · {o.items_count} {lang === "bn" ? "টি" : "items"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent-600">{formatPrice(o.total)}</p>
                    <p className="text-xs text-brand-600">{statusLabel(o.order_status)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
