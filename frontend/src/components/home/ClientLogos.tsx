"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { CLIENT_LOGOS_KEY, getClientLogos, type CmsClientLogo } from "@/lib/cmsContent";

const FALLBACK: CmsClientLogo[] = [
  { name: "Retail POS", abbr: "RP" },
  { name: "Restaurant Pro", abbr: "REST" },
  { name: "School ERP", abbr: "ERP" },
  { name: "Hospital MS", abbr: "HMS" },
  { name: "ISP Billing", abbr: "ISP" },
  { name: "E-Commerce", abbr: "ECOM" },
];

/** A client is tappable only when it has extra detail to reveal. */
function hasDetail(c: CmsClientLogo) {
  return !!(c.desc_en?.trim() || c.desc_bn?.trim() || c.href?.trim());
}

function ClientBadge({ client }: { client: CmsClientLogo }) {
  return (
    <span className="flex items-center gap-2">
      {client.image ? (
        <span className="w-8 h-8 rounded-lg overflow-hidden relative flex-shrink-0">
          <Image src={client.image} alt={client.name} fill className="object-cover" sizes="32px" />
        </span>
      ) : (
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold flex items-center justify-center">
          {client.abbr}
        </span>
      )}
      <span className="text-sm font-medium text-muted hidden sm:inline">{client.name}</span>
    </span>
  );
}

export default function ClientLogos() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([CLIENT_LOGOS_KEY]);
  const clients = getClientLogos(settings, FALLBACK);
  const [active, setActive] = useState<CmsClientLogo | null>(null);

  // Close on Escape + lock body scroll while the sheet is open.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  const activeDesc = active
    ? (lang === "bn" ? active.desc_bn || active.desc_en : active.desc_en || active.desc_bn) || ""
    : "";

  const baseCls =
    "flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 transition-all";

  return (
    <section className="enterprise-section-alt">
      <div className="container mx-auto px-4">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted mb-8">
          {lang === "bn" ? "যাদের আমরা সেবা দিয়েছি" : "Trusted by businesses across Bangladesh"}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
          {clients.map((client, i) =>
            hasDetail(client) ? (
              <button
                key={`${client.name}-${i}`}
                type="button"
                onClick={() => setActive(client)}
                className={`${baseCls} opacity-90 hover:opacity-100 hover:border-brand-300 dark:hover:border-brand-500/40 hover:-translate-y-0.5 hover:shadow-md cursor-pointer`}
                aria-label={lang === "bn" ? `${client.name} — বিস্তারিত দেখুন` : `${client.name} — view details`}
              >
                <ClientBadge client={client} />
              </button>
            ) : (
              <div
                key={`${client.name}-${i}`}
                className={`${baseCls} opacity-80 hover:opacity-100`}
              >
                <ClientBadge client={client} />
              </div>
            )
          )}
        </div>
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-gray-950/55 backdrop-blur-sm motion-safe:animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={active.name}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-[#0f1a2e] rounded-t-2xl sm:rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl p-5 sm:p-6 motion-safe:animate-[slideUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              {active.image ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden relative flex-shrink-0">
                  <Image src={active.image} alt={active.name} fill className="object-cover" sizes="48px" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {active.abbr}
                </div>
              )}
              <h3 className="text-lg font-bold text-heading flex-1 pt-0.5">{active.name}</h3>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                aria-label={lang === "bn" ? "বন্ধ করুন" : "Close"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeDesc && (
              <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{activeDesc}</p>
            )}

            {active.href?.trim() && (
              <Link
                href={active.href}
                target={active.href.startsWith("http") ? "_blank" : undefined}
                rel={active.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                {lang === "bn" ? "কেস স্টাডি" : "Case study"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
