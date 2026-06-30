"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Package, Loader2, ArrowLeft, Printer } from "lucide-react";
import { ordersApi } from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import { formatPrice } from "@/lib/utils";
import PageHero from "@/components/ui/PageHero";
import GlassCard from "@/components/ui/GlassCard";

interface OrderDetail {
  order_number: string;
  order_status: string;
  payment_method: string;
  total: number;
  items_count: number;
  created_at: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;
  const { lang } = useLanguageStore();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    ordersApi.track(orderNumber)
      .then((r) => setOrder(r.data.data as OrderDetail))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  const handlePrint = () => window.print();

  return (
    <main>
      <PageHero
        title={lang === "bn" ? "অর্ডার বিবরণ" : "Order Details"}
        subtitle={orderNumber}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "অর্ডার" : "Orders", href: "/orders" },
          { label: orderNumber },
        ]}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline mb-4 print:hidden">
          <ArrowLeft className="w-4 h-4" />
          {lang === "bn" ? "অর্ডার তালিকা" : "Back to orders"}
        </Link>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
        ) : error || !order ? (
          <GlassCard className="p-8 text-center text-muted">
            <p role="alert">{lang === "bn" ? "অর্ডার পাওয়া যায়নি" : "Order not found"}</p>
          </GlassCard>
        ) : (
          <div id="invoice-print">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-heading">ABO Enterprise</h2>
                <p className="text-sm text-muted">{lang === "bn" ? "ইনভয়েস" : "Invoice"}</p>
              </div>
              <Package className="w-8 h-8 text-brand-600" />
            </div>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <dt className="text-muted">{lang === "bn" ? "অর্ডার নম্বর" : "Order #"}</dt>
                <dd className="font-semibold text-heading">{order.order_number}</dd>
              </div>
              <div>
                <dt className="text-muted">{lang === "bn" ? "তারিখ" : "Date"}</dt>
                <dd className="font-semibold text-heading">{new Date(order.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</dt>
                <dd className="font-semibold capitalize text-heading">{order.order_status}</dd>
              </div>
              <div>
                <dt className="text-muted">{lang === "bn" ? "পেমেন্ট" : "Payment"}</dt>
                <dd className="font-semibold uppercase text-heading">{order.payment_method}</dd>
              </div>
              <div>
                <dt className="text-muted">{lang === "bn" ? "আইটেম" : "Items"}</dt>
                <dd className="font-semibold text-heading">{order.items_count}</dd>
              </div>
              <div>
                <dt className="text-muted">{lang === "bn" ? "মোট" : "Total"}</dt>
                <dd className="text-xl font-bold text-brand-600">{formatPrice(order.total)}</dd>
              </div>
            </dl>
            <button type="button" onClick={handlePrint} className="btn btn-outline btn-md w-full print:hidden">
              <Printer className="w-4 h-4" />
              {lang === "bn" ? "প্রিন্ট / PDF" : "Print / Save PDF"}
            </button>
          </GlassCard>
          </div>
        )}
      </div>
    </main>
  );
}
