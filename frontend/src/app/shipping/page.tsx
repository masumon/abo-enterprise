"use client";

import Link from "next/link";
import { MapPin, Clock, Truck, Package, MessageCircle } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import Accordion from "@/components/ui/Accordion";
import { FAQ_ITEMS } from "@/lib/data/faq";

const COVERAGE = [
  { region: { en: "Sylhet City", bn: "সিলেট শহর" }, time: { en: "Same day", bn: "একই দিন" }, charge: { en: "Free", bn: "ফ্রি" } },
  { region: { en: "Sylhet District", bn: "সিলেট জেলা" }, time: { en: "1-2 days", bn: "১-২ দিন" }, charge: { en: "From ৳40", bn: "৳৪০ থেকে" } },
  { region: { en: "Nationwide", bn: "সারাদেশ" }, time: { en: "2-3 days", bn: "২-৩ দিন" }, charge: { en: "From ৳60", bn: "৳৬০ থেকে" } },
];

export default function ShippingPage() {
  const { lang } = useLanguageStore();
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  const shippingFaqs = FAQ_ITEMS.filter((f) => f.category === "shipping").map((item, i) => ({
    id: `ship-${i}`,
    question: t(item.q),
    answer: t(item.a),
  }));

  return (
    <main>
      <PageHero
        title={lang === "bn" ? "শিপিং ও ডেলিভারি" : "Shipping & Delivery"}
        subtitle={lang === "bn" ? "কভারেজ, চার্জ ও ডেলিভারি সময়সূচি" : "Coverage, charges and delivery timeline"}
        breadcrumbs={[{ label: lang === "bn" ? "শিপিং" : "Shipping" }]}
      />

      <section className="enterprise-section">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {[
              { icon: MapPin, title: t({ en: "Coverage", bn: "কভারেজ" }), desc: t({ en: "Sylhet & nationwide", bn: "সিলেট ও সারাদেশ" }) },
              { icon: Truck, title: t({ en: "Fast Delivery", bn: "দ্রুত ডেলিভারি" }), desc: t({ en: "Same-day in Sylhet", bn: "সিলেটে একই দিন" }) },
              { icon: Package, title: t({ en: "Safe Packaging", bn: "নিরাপদ প্যাকেজিং" }), desc: t({ en: "Secure product handling", bn: "নিরাপদ পণ্য হ্যান্ডলিং" }) },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="enterprise-card p-5 text-center">
                <Icon className="w-8 h-8 text-brand-600 mx-auto mb-3" />
                <h3 className="font-bold text-heading">{title}</h3>
                <p className="text-sm text-muted mt-1">{desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-bold text-heading mb-4">{t({ en: "Delivery Charges", bn: "ডেলিভারি চার্জ" })}</h2>
          <div className="enterprise-card overflow-hidden mb-12">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>{t({ en: "Region", bn: "অঞ্চল" })}</th>
                  <th>{t({ en: "Timeline", bn: "সময়" })}</th>
                  <th>{t({ en: "Charge", bn: "চার্জ" })}</th>
                </tr>
              </thead>
              <tbody>
                {COVERAGE.map((row) => (
                  <tr key={row.region.en}>
                    <td className="font-medium text-heading">{t(row.region)}</td>
                    <td className="text-muted">{t(row.time)}</td>
                    <td className="text-brand-600 font-semibold">{t(row.charge)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-bold text-heading mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" />
            {t({ en: "Delivery Timeline", bn: "ডেলিভারি টাইমলাইন" })}
          </h2>
          <div className="grid sm:grid-cols-4 gap-3 mb-12">
            {[
              t({ en: "Order Placed", bn: "অর্ডার" }),
              t({ en: "Processing", bn: "প্রসেসিং" }),
              t({ en: "Shipped", bn: "পাঠানো" }),
              t({ en: "Delivered", bn: "ডেলিভারি" }),
            ].map((step, i) => (
              <div key={step} className="enterprise-card p-4 text-center relative">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold inline-flex items-center justify-center mb-2">{i + 1}</span>
                <p className="text-sm font-medium text-heading">{step}</p>
              </div>
            ))}
          </div>

          {shippingFaqs.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-heading mb-4">{t({ en: "Shipping FAQ", bn: "শিপিং FAQ" })}</h2>
              <Accordion items={shippingFaqs} className="mb-10" />
            </>
          )}

          <div className="enterprise-card p-6 text-center">
            <p className="text-sm text-muted mb-4">{t({ en: "Questions about your delivery?", bn: "ডেলিভারি নিয়ে প্রশ্ন?" })}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/track" className="btn btn-brand btn-sm">{t({ en: "Track Order", bn: "অর্ডার ট্র্যাক" })}</Link>
              <a href="https://wa.me/8801825007977" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
