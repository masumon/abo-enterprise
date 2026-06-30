"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { ordersApi } from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import InvoicePreviewCard from "@/components/invoice/InvoicePreviewCard";

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
        pageKey="orders"
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
          <div className="p-8 text-center text-muted rounded-2xl border border-gray-100 bg-white">
            <p role="alert">{lang === "bn" ? "অর্ডার পাওয়া যায়নি" : "Order not found"}</p>
          </div>
        ) : (
          <div id="invoice-print">
            <InvoicePreviewCard
              orderNumber={order.order_number}
              orderStatus={order.order_status}
              paymentMethod={order.payment_method}
              total={order.total}
              itemsCount={order.items_count}
              createdAt={order.created_at}
              lang={lang}
              onPrint={handlePrint}
            />
          </div>
        )}
      </div>
    </main>
  );
}
