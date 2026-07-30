"use client";

import Link from "next/link";
import { MapPin, Clock, CheckCircle, Navigation } from "lucide-react";
import type { Service } from "@/types";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { DEFAULT_ADDRESS_EN, DEFAULT_ADDRESS_BN } from "@/lib/maps";
import { fulfilmentDetail } from "@/lib/fulfilment";

/**
 * Screen 08b, pattern ঘ — a service that can only be completed at the counter
 * does not need a longer booking form. It needs four answers: why it cannot be
 * done remotely, what to bring, where to come, and whether the shop is open
 * right now.
 *
 * Turning up without the right paper is the single largest cause of a wasted
 * visit, so the checklist comes before the booking button, not after it.
 *
 * Everything here is real data: the fulfilment classification from screen 15,
 * the service's own required_documents, and the address and hours the rest of
 * the site already publishes. Nothing is asserted that an admin has not set.
 */
export default function VisitRequiredPanel({ service }: { service: Service }) {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings();
  const bn = lang === "bn";

  const documents = (service.required_documents ?? []).filter(Boolean);
  const note = fulfilmentDetail(service.fulfilment, lang);
  // Same keys the footer and contact page publish, so the shop cannot end up
  // with two addresses or two sets of hours.
  const address =
    getSettingValue(settings, "contact_address") ||
    (bn ? DEFAULT_ADDRESS_BN : DEFAULT_ADDRESS_EN);
  const hours = getSettingValue(settings, bn ? "contact_hours_bn" : "contact_hours_en");

  return (
    <section className="enterprise-card p-6 border-l-4 border-l-accent-500">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-5 h-5 text-accent-700" aria-hidden />
        <h2 className="text-lg font-bold text-heading">
          {bn ? "এই সেবা দোকানে এসে করতে হয়" : "This one happens at the counter"}
        </h2>
      </div>
      {note && <p className="text-sm text-muted mb-4">{note}</p>}

      {documents.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-2">
            {bn ? "কী নিয়ে আসবেন" : "What to bring"}
          </p>
          <ul className="space-y-1.5">
            {documents.map((doc, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-heading">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" aria-hidden />
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-2">
          {bn ? "কোথায় আসবেন" : "Where to come"}
        </p>
        <p className="text-sm text-heading">{address}</p>
        {hours && (
          <p className="text-xs text-muted mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" aria-hidden />
            {hours}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/book?service=${service.slug}`} className="btn btn-primary btn-md">
          {bn ? "সময় নিন" : "Book a time"}
        </Link>
        <Link href="/contact" className="btn btn-outline btn-md">
          <Navigation className="w-4 h-4" aria-hidden />
          {bn ? "দিকনির্দেশ" : "Directions"}
        </Link>
      </div>
    </section>
  );
}
