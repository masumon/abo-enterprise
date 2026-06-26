import Link from "next/link";
import type { Service } from "@/types";
import { ArrowRight, Star } from "lucide-react";

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link href={`/services/${service.slug}`}>
      <div className="h-full bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden cursor-pointer group">
        {/* Image */}
        {service.featured_image_url && (
          <div className="relative h-48 bg-gray-100 overflow-hidden">
            <img
              src={service.featured_image_url}
              alt={service.name_en}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Category Badge */}
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full mb-3">
            {service.category}
          </span>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {service.name_en}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {service.description_en || service.short_description_en}
          </p>

          {/* Pricing */}
          <div className="mb-4">
            {service.pricing_type === "fixed" && service.base_price && (
              <div className="text-2xl font-bold text-blue-600">
                ৳{service.base_price.toLocaleString()}
              </div>
            )}
            {service.pricing_type === "hourly" && service.hourly_rate && (
              <div className="text-sm text-gray-600">
                From <span className="text-lg font-bold text-blue-600">৳{service.hourly_rate}</span>/hour
              </div>
            )}
            {service.pricing_type === "package" && (
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Tiered Pricing</span>
              </div>
            )}
            {service.pricing_type === "custom_quote" && (
              <div className="text-sm text-gray-600 font-semibold">
                Custom Quote Available
              </div>
            )}
          </div>

          {/* Features */}
          {service.tags && service.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {service.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm font-semibold text-blue-600 flex items-center gap-1">
              Learn More <ArrowRight className="w-3 h-3" />
            </span>
            {service.is_featured && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
          </div>
        </div>
      </div>
    </Link>
  );
}
