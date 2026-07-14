"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  MessageCircle,
  Package,
  Tag,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { formatPrice } from "@/lib/utils";
import { WHATSAPP_NUMBER } from "@/lib/utils";
import type { Service } from "@/types";
import { cn } from "@/lib/utils";
import PageHero from "@/components/ui/PageHero";
import { resolveServiceImage } from "@/lib/demoImages";

interface Props {
  service: Service;
}

function PricingBadge({ service, lang }: { service: Service; lang: string }) {
  const t = (en: string, bn: string) => (lang === "bn" ? bn : en);

  if (service.pricing_type === "fixed" && service.base_price) {
    return (
      <div className="inline-flex items-center gap-2 bg-accent-50 border border-accent-200 rounded-full px-4 py-2">
        <Tag className="w-4 h-4 text-accent-600" />
        <span className="font-bold text-accent-700 text-lg">{formatPrice(service.base_price)}</span>
      </div>
    );
  }
  if (service.pricing_type === "hourly" && service.hourly_rate) {
    return (
      <div className="inline-flex items-center gap-2 bg-accent-50 border border-accent-200 rounded-full px-4 py-2">
        <Clock className="w-4 h-4 text-accent-600" />
        <span className="font-bold text-accent-700 text-lg">
          {formatPrice(service.hourly_rate)}/{t("hr", "ঘণ্টা")}
        </span>
      </div>
    );
  }
  if (service.pricing_type === "package" && service.min_price && service.max_price) {
    return (
      <div className="inline-flex items-center gap-2 bg-accent-50 border border-accent-200 rounded-full px-4 py-2">
        <Package className="w-4 h-4 text-accent-600" />
        <span className="font-bold text-accent-700 text-lg">
          {formatPrice(service.min_price)} – {formatPrice(service.max_price)}
        </span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-2">
      <MessageCircle className="w-4 h-4 text-brand-600" />
      <span className="font-semibold text-brand-700">{t("Custom Quote", "কাস্টম মূল্য")}</span>
    </div>
  );
}

export default function ServiceDetailClient({ service }: Props) {
  const { lang } = useLanguageStore();
  const [activeTier, setActiveTier] = useState<string | null>(
    service.pricing_tiers?.[0]?.id ?? null
  );
  const t = (en: string, bn: string) => (lang === "bn" ? bn : en);

  const name = lang === "bn" && service.name_bn ? service.name_bn : service.name_en;
  const description =
    lang === "bn" && service.long_description_bn
      ? service.long_description_bn
      : lang === "bn" && service.description_bn
      ? service.description_bn
      : service.long_description_en ?? service.description_en ?? "";
  const shortDesc =
    lang === "bn" && service.short_description_bn
      ? service.short_description_bn
      : service.short_description_en ?? "";

  const waMsg = encodeURIComponent(
    t(
      `Hello! I'm interested in your ${service.name_en} service. Please send me more details.`,
      `আমি ${service.name_bn || service.name_en} সেবায় আগ্রহী। দয়া করে বিস্তারিত জানান।`
    )
  );

  const hasTiers =
    service.pricing_tiers && service.pricing_tiers.length > 0;
  const activeTierData = hasTiers
    ? service.pricing_tiers!.find((t) => t.id === activeTier) ?? service.pricing_tiers![0]
    : null;

  return (
    <div>
      <PageHero
        pageKey="services"
        imageUrl={service.featured_image_url || undefined}
        title={name}
        subtitle={shortDesc}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "সেবা" : "Services", href: "/services" },
          { label: name },
        ]}
      >
        <div className="flex flex-wrap gap-4 items-center mt-4">
          {service.category && (
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium capitalize">
              {service.category.replace(/_/g, " ")}
            </span>
          )}
          <PricingBadge service={service} lang={lang} />
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-md bg-white text-brand-700 hover:bg-brand-50 font-bold gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            {t("Chat on WhatsApp", "WhatsApp-এ কথা বলুন")}
          </a>
          <Link
            href={`/book?service=${service.slug}`}
            className="btn btn-md btn-outline text-white border-white/60 hover:bg-white/10 gap-2"
          >
            {t("Book Now", "বুকিং করুন")}
            <ArrowRight className="w-5 h-5" />
          </Link>
          {/* Cross-capability: a service an admin marked "Also orderable" can be
              purchased at its fixed price via the same booking flow. */}
          {service.is_orderable && (
            <Link
              href={`/book?service=${service.slug}&mode=order`}
              className="btn btn-md bg-white text-brand-700 hover:bg-brand-50 font-bold gap-2"
            >
              {t("Order Now", "এখনই অর্ডার করুন")}
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </PageHero>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-video">
          <Image
            src={resolveServiceImage(service.featured_image_url, service.slug)}
              alt={name}
              fill
              className="object-cover"
            sizes="(max-width: 1024px) 100vw, 896px"
          />
        </div>

        {/* Description */}
        {description && (
          <section>
            <h2 className="text-2xl font-bold text-heading mb-4">
              {t("About This Service", "এই সেবা সম্পর্কে")}
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none text-muted leading-relaxed whitespace-pre-line">
              {description}
            </div>
          </section>
        )}

        {/* Pricing tiers */}
        {hasTiers && service.pricing_tiers!.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-heading mb-6">
              {t("Pricing Plans", "মূল্য পরিকল্পনা")}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {service.pricing_tiers!.map((tier) => {
                const tierDesc =
                  lang === "bn" && tier.description_bn
                    ? tier.description_bn
                    : tier.description_en ?? "";
                const isActive = activeTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setActiveTier(tier.id)}
                    className={cn(
                      "text-left p-6 rounded-2xl border-2 transition-all",
                      isActive
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 shadow-md"
                        : "border-gray-200 dark:border-white/10 bg-white dark:bg-[var(--surface-card)] hover:border-brand-300 dark:hover:border-brand-500/40"
                    )}
                  >
                    <p className="font-bold text-heading text-lg mb-1">{tier.tier_name}</p>
                    <p className="text-2xl font-bold text-accent-600 mb-2">
                      {formatPrice(tier.price)}
                    </p>
                    {tier.duration_days && (
                      <p className="text-xs text-muted mb-2">
                        {tier.duration_days} {t("days delivery", "দিনের মধ্যে ডেলিভারি")}
                      </p>
                    )}
                    {tierDesc && (
                      <p className="text-sm text-muted mb-3">{tierDesc}</p>
                    )}
                    {tier.features && tier.features.length > 0 && (
                      <ul className="space-y-1">
                        {tier.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>

            {activeTierData && (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/book?service=${service.slug}&tier=${activeTierData.id}`}
                  className="btn btn-primary btn-lg gap-2"
                >
                  {t(`Book — ${activeTierData.tier_name}`, `বুক করুন — ${activeTierData.tier_name}`)}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t(`I want to book ${activeTierData.tier_name} for ${service.name_en}`, `${service.name_bn || service.name_en} — ${activeTierData.tier_name} বুক করতে চাই`))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-lg gap-2"
                >
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  {t("Ask on WhatsApp", "WhatsApp-এ জিজ্ঞেস করুন")}
                </a>
              </div>
            )}
          </section>
        )}

        {/* Tags */}
        {service.tags && service.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {service.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 dark:bg-white/10 text-muted rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <section className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-[var(--surface-card)] rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-heading mb-2">
            {t("Ready to get started?", "শুরু করতে প্রস্তুত?")}
          </h2>
          <p className="text-muted mb-6">
            {t(
              "Contact us today and get a free consultation.",
              "আজই যোগাযোগ করুন এবং বিনামূল্যে পরামর্শ নিন।"
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/book?service=${service.slug}`} className="btn btn-primary btn-lg gap-2">
              {t("Book Service", "সেবা বুক করুন")}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-lg gap-2 text-green-700 border-green-400 hover:bg-green-50"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
