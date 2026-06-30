"use client";

import { useLanguageStore } from "@/store/language";

const CLIENTS = [
  { name: "Retail POS", abbr: "RP" },
  { name: "Restaurant Pro", abbr: "RP" },
  { name: "School ERP", abbr: "SE" },
  { name: "Hospital MS", abbr: "HM" },
  { name: "ISP Billing", abbr: "IB" },
  { name: "E-Commerce", abbr: "EC" },
];

export default function ClientLogos() {
  const { lang } = useLanguageStore();

  return (
    <section className="enterprise-section-alt">
      <div className="container mx-auto px-4">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted mb-8">
          {lang === "bn" ? "যাদের আমরা সেবা দিয়েছি" : "Trusted by businesses across Bangladesh"}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
          {CLIENTS.map((client) => (
            <div
              key={client.name}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 opacity-70 hover:opacity-100 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold flex items-center justify-center">
                {client.abbr}
              </div>
              <span className="text-sm font-medium text-muted hidden sm:inline">{client.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
