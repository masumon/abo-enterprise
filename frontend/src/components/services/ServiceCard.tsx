import Link from "next/link";
import Image from "next/image";
import type { Service } from "@/types";
import type { Language } from "@/types";
import { ArrowRight, Star, MapPin, Wifi, Clock, Wrench } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { fulfilmentLabel, isFulfilment, turnaroundLabel } from "@/lib/fulfilment";

interface ServiceCardProps {
  service: Service;
  lang?: Language;
  /** Taxonomy category name for the tag; falls back to the legacy flat
   * service.category string when not provided (unassigned services). */
  categoryLabel?: string;
}

export default function ServiceCard({ service, lang = "en", categoryLabel }: ServiceCardProps) {
  const tag = categoryLabel ?? service.category;
  const name = lang === "bn" && service.name_bn ? service.name_bn : service.name_en;
  const description =
    (lang === "bn" ? service.short_description_bn || service.description_bn : null) ||
    service.short_description_en ||
    service.description_en;

  // Only a real, admin-set photo is shown. When none exists we render a branded
  // panel below instead of a mismatched stock/demo image.
  const hasImage = Boolean(service.featured_image_url?.trim());
  /* GAP-15 — an at-shop service looked identical to a remote one, so a
     customer could book a biometric capture and wait at home. Unclassified
     services show nothing rather than a guessed promise. */
  const fulfilment = fulfilmentLabel(service.fulfilment, lang);
  const needsVisit = service.fulfilment === "at_shop" || service.fulfilment === "hybrid";
  /* Screen 08c — for an application the customer cannot chase themselves, the
     wait is the product. Unset stays silent rather than guessing. */
  const turnaround = turnaroundLabel(service.turnaround_days_min, service.turnaround_days_max, lang);

  return (
    <Link href={`/services/${service.slug}`} className="block h-full group">
      <article className="h-full enterprise-card-hover overflow-hidden hover:border-brand-100 dark:hover:border-brand-400/30">
        <div className="relative h-36 sm:h-44 bg-brand-50 dark:bg-white/5 overflow-hidden">
          {hasImage ? (
            <>
              <Image
                src={service.featured_image_url!}
                alt={name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              {/* Subtle scrim adds depth and premium contrast at the image base. */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
            </>
          ) : (
            /* No real photo yet → an on-brand navy→gold panel (glow, faint
               initial, gold icon) so the card reads as intentional rather than
               showing a mismatched stock image. */
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex items-center justify-center overflow-hidden">
              <span aria-hidden className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-accent-500/15 blur-2xl" />
              <span aria-hidden className="absolute -bottom-5 -left-3 text-white/[0.06] font-black text-[6.5rem] leading-none select-none">
                {name.charAt(0)}
              </span>
              <span className="relative w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                <Wrench className="w-7 h-7 text-accent-400" aria-hidden />
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {tag && (
              <span className="inline-block px-2.5 py-0.5 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-xs font-semibold rounded-full">
                {tag}
              </span>
            )}
            {turnaround && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200">
                <Clock aria-hidden className="w-3 h-3" />
                {turnaround}
              </span>
            )}
            {fulfilment && isFulfilment(service.fulfilment) && (
              <span
                className={
                  needsVisit
                    ? "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-50 text-accent-800 dark:bg-accent-500/20 dark:text-accent-200"
                    : "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                }
              >
                {needsVisit ? <MapPin aria-hidden className="w-3 h-3" /> : <Wifi aria-hidden className="w-3 h-3" />}
                {fulfilment}
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-heading mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
            {name}
          </h3>

          {description && (
            <p className="text-sm text-muted mb-4 line-clamp-2">{description}</p>
          )}

          <div className="mb-4">
            {service.pricing_type === "fixed" && service.base_price != null && (
              <div className="text-xl font-bold text-brand-600">{formatPrice(service.base_price)}</div>
            )}
            {service.pricing_type === "hourly" && service.hourly_rate != null && (
              <div className="text-sm text-muted">
                {lang === "bn" ? "শুরু " : "From "}
                <span className="text-lg font-bold text-brand-600">{formatPrice(service.hourly_rate)}</span>
                {lang === "bn" ? "/ঘণ্টা" : "/hr"}
              </div>
            )}
            {service.pricing_type === "package" &&
              (service.min_price != null && service.max_price != null ? (
                <div className="text-lg font-bold text-brand-600">
                  {formatPrice(service.min_price)} – {formatPrice(service.max_price)}
                </div>
              ) : (service.base_price ?? service.min_price) != null ? (
                <div className="text-sm text-muted">
                  {lang === "bn" ? "শুরু " : "From "}
                  <span className="text-lg font-bold text-brand-600">
                    {formatPrice((service.base_price ?? service.min_price)!)}
                  </span>
                </div>
              ) : (
                <div className="text-sm font-semibold text-muted">
                  {lang === "bn" ? "কাস্টম কোট" : "Custom Quote"}
                </div>
              ))}
            {(service.pricing_type === "custom_quote" || service.pricing_type === "custom") && (
              <div className="text-sm font-semibold text-muted">
                {lang === "bn" ? "কাস্টম কোট" : "Custom Quote"}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10">
            <span className="text-sm font-semibold text-brand-600 flex items-center gap-1 group-hover:gap-2 transition-all">
              {/* The card navigates to the detail page, so its label must
                  promise navigation — the CTA button lives on the detail page. */}
              {lang === "bn" ? "বিস্তারিত" : "Learn More"} <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </span>
            {service.is_featured && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" aria-hidden />}
          </div>
        </div>
      </article>
    </Link>
  );
}
