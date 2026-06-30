import Link from "next/link";
import Image from "next/image";
import type { Service } from "@/types";
import type { Language } from "@/types";
import { ArrowRight, Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface ServiceCardProps {
  service: Service;
  lang?: Language;
}

export default function ServiceCard({ service, lang = "en" }: ServiceCardProps) {
  const name = lang === "bn" && service.name_bn ? service.name_bn : service.name_en;
  const description =
    (lang === "bn" ? service.short_description_bn || service.description_bn : null) ||
    service.short_description_en ||
    service.description_en;

  return (
    <Link href={`/services/${service.slug}`} className="block h-full group">
      <article className="h-full enterprise-card-hover overflow-hidden">
        {service.featured_image_url && (
          <div className="relative h-44 bg-gray-100 overflow-hidden">
            <Image
              src={service.featured_image_url}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        )}

        <div className="p-5">
          {service.category && (
            <span className="inline-block px-2.5 py-0.5 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-xs font-semibold rounded-full mb-2">
              {service.category}
            </span>
          )}

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
            {(service.pricing_type === "custom_quote" || service.pricing_type === "custom") && (
              <div className="text-sm font-semibold text-muted">
                {lang === "bn" ? "কাস্টম কোট" : "Custom Quote"}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10">
            <span className="text-sm font-semibold text-brand-600 flex items-center gap-1">
              {lang === "bn" ? "বিস্তারিত" : "Learn More"} <ArrowRight className="w-3 h-3" />
            </span>
            {service.is_featured && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" aria-hidden />}
          </div>
        </div>
      </article>
    </Link>
  );
}
