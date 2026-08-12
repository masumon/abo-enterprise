"use client";

import Link from "next/link";
import { MapPin, Clock, Truck, Package, MessageCircle } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import Accordion from "@/components/ui/Accordion";
import { FAQ_ITEMS } from "@/lib/data/faq";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { toBdWhatsappHref } from "@/lib/phone";

const COVERAGE_TIMES = [
  { key: "sylhet", region: { en: "Sylhet City", bn: "সিলেট শহর" }, time: { en: "Same day", bn: "একই দিন" } },
  { key: "dhaka", region: { en: "Dhaka", bn: "ঢাকা" }, time: { en: "1-2 days", bn: "১-২ দিন" } },
  { key: "outside", region: { en: "Nationwide", bn: "সারাদেশ" }, time: { en: "2-3 days", bn: "২-৩ দিন" } },
] as const;

const CHARGE_KEYS: Record<string, string> = {
  sylhet: "delivery_charge_sylhet",
  dhaka: "delivery_charge_dhaka",
  outside: "delivery_charge_outside",
};

export default function ShippingPage() {
  const { lang } = useLanguageStore();
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);
  const { settings } = usePublicSettings();

  const freeMin = getSettingValue(settings, "free_delivery_min_amount");
  const whatsappHref = toBdWhatsappHref(
    getSettingValue(settings, "whatsapp_number") || getSettingValue(settings, "contact_phone")
  );
  const chargeFor = (key: string) => {
    const value = getSettingValue(settings, CHARGE_KEYS[key]);
    if (!value) return lang === "bn" ? "সেট করা নেই" : "Not configured";
    if (key === "sylhet") {
      if (!freeMin) return lang === "bn" ? `৳${value}` : `৳${value}`;
      return lang === "bn"
        ? `৳${freeMin}+ অর্ডারে ফ্রি · নইলে ৳${value}`
        : `Free over ৳${freeMin} · otherwise ৳${value}`;
    }
    return lang === "bn" ? `৳${value} থেকে` : `From ৳${value}`;
  };

  const shippingFaqs = FAQ_ITEMS.filter((f) => f.category === "shipping").map((item, i) => ({
    id: `ship-${i}`,
    question: t(item.q),
    answer: t(item.a),
  }));

  return (
    <main>
      <PageHero
        pageKey="shipping"
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
                {COVERAGE_TIMES.map((row) => (
                  <tr key={row.key}>
                    <td className="font-medium text-heading">{t(row.region)}</td>
                    <td className="text-muted">{t(row.time)}</td>
                    <td className="text-brand-600 font-semibold">{chargeFor(row.key)}</td>
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
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
