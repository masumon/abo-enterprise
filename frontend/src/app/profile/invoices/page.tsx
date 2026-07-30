"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, ChevronRight } from "lucide-react";
import { useCustomerStore } from "@/store/customer";
import { useLanguageStore } from "@/store/language";
import { ordersApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import PageHero from "@/components/ui/PageHero";
import GlassCard from "@/components/ui/GlassCard";

interface OrderSummary {
  order_number: string;
  order_status: string;
  total: number;
  items_count: number;
  created_at: string;
}

export default function InvoicesPage() {
  const { session } = useCustomerStore();
  const { lang } = useLanguageStore();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.phone || !session?.token) {
      setLoading(false);
      return;
    }
    ordersApi.byPhone(session.phone, session.token)
      .then((r) => setOrders(r.data.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [session?.phone, session?.token]);

  return (
    <main>
      <PageHero
        pageKey="profile"
        title={lang === "bn" ? "ইনভয়েস" : "Invoices"}
        subtitle={lang === "bn" ? "আপনার অর্ডার ও ইনভয়েস" : "Your orders and invoices"}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "প্রোফাইল" : "Profile", href: "/profile" },
          { label: lang === "bn" ? "ইনভয়েস" : "Invoices" },
        ]}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* GAP-05 — with no session token the effect previously set loading
            false with an empty list, so a signed-out customer saw the same
            "No invoices yet" screen as a verified customer with zero orders.
            Three distinct states are now rendered. Server-side gating at the
            destination is unchanged; this is a prompt, not a security gate. */}
        {!session?.token ? (
          <GlassCard className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-brand-600" />
            </div>
            <h2 className="text-lg font-bold text-heading mb-2">
              {lang === "bn" ? "ইনভয়েস দেখতে সাইন ইন করুন" : "Sign in to see your invoices"}
            </h2>
            <p className="text-sm text-muted mb-6">
              {lang === "bn"
                ? "ফোন ও ইমেইল দিন — কোডটি ইমেইলে যাবে। সাইন ইনের পরে সোজা এখানেই ফিরিয়ে আনব।"
                : "Your phone and email — the code arrives by email. We'll bring you straight back here."}
            </p>
            <Link href="/login?redirect=/profile/invoices" className="btn btn-brand btn-md">
              {lang === "bn" ? "সাইন ইন" : "Sign in"}
            </Link>
          </GlassCard>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <GlassCard className="p-8 text-center text-muted">
            {lang === "bn" ? "কোনো ইনভয়েস নেই" : "No invoices yet"}
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o.order_number} href={`/orders/${o.order_number}`}>
                <GlassCard hover className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-heading">{o.order_number}</p>
                    <p className="text-xs text-muted">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-brand-600">{formatPrice(o.total)}</p>
                    <p className="text-xs text-muted capitalize">{o.order_status}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted" />
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
