"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { useCustomerStore } from "@/store/customer";
import { useLanguageStore } from "@/store/language";
import { ordersApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import PageHero from "@/components/ui/PageHero";
import GlassCard from "@/components/ui/GlassCard";
import EmptyState from "@/components/ui/EmptyState";
import { ListRowSkeleton } from "@/components/common/Skeletons";

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
          <EmptyState
            icon={FileText}
            title={lang === "bn" ? "ইনভয়েস দেখতে সাইন ইন করুন" : "Sign in to see your invoices"}
            description={lang === "bn"
              ? "ফোন ও ইমেইল দিন — কোডটি ইমেইলে যাবে। সাইন ইনের পরে সোজা এখানেই ফিরিয়ে আনব।"
              : "Your phone and email — the code arrives by email. We'll bring you straight back here."}
            actionLabel={lang === "bn" ? "সাইন ইন" : "Sign in"}
            actionHref="/login?redirect=/profile/invoices"
          />
        ) : loading ? (
          <ListRowSkeleton rows={4} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={lang === "bn" ? "কোনো ইনভয়েস নেই" : "No invoices yet"}
            actionLabel={lang === "bn" ? "কেনাকাটা করুন" : "Start Shopping"}
            actionHref="/products"
          />
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
