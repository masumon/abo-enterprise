"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { bookingsApi } from "@/lib/api";
import type { Service } from "@/types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const bdPhoneRegex = /^0[13-9]\d{8}$/;

const bookingSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_phone: z.string().regex(bdPhoneRegex, "Invalid Bangladesh phone number"),
  customer_email: z.string().email("Invalid email address"),
  customer_company: z.string().optional(),
  booking_date: z.string().optional(),
  details: z.string().min(10, "Please provide more details"),
  service_tier: z.string().optional(),
  quoted_price: z.number().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  service: Service;
  onSuccess?: () => void;
}

export default function BookingForm({ service, onSuccess }: BookingFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  async function onSubmit(data: BookingFormData) {
    try {
      setSubmitting(true);

      const response = await bookingsApi.create({
        service_id: service.id,
        service_type: service.category,
        ...data,
      } as unknown as Parameters<typeof bookingsApi.create>[0]);

      if (response.status === 200 || response.status === 201) {
        setSuccess(true);
        reset();
        setTimeout(() => {
          setSuccess(false);
          onSuccess?.();
        }, 3000);
      }
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Service Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Service:</span> {service.name_en}
        </p>
        {service.pricing_type === "fixed" && service.base_price && (
          <p className="text-lg font-bold text-blue-600 mt-2">৳{service.base_price}</p>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          {...register("customer_name")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Your full name"
        />
        {errors.customer_name && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_name.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number (BD) *
        </label>
        <input
          type="tel"
          {...register("customer_phone")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="01XXXXXXXXX"
        />
        {errors.customer_phone && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_phone.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          {...register("customer_email")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="your@email.com"
        />
        {errors.customer_email && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_email.message}</p>
        )}
      </div>

      {/* Company */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company (Optional)
        </label>
        <input
          type="text"
          {...register("customer_company")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Company name"
        />
      </div>

      {/* Booking Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Preferred Booking Date (Optional)
        </label>
        <input
          type="date"
          {...register("booking_date")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Details */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Details / Requirements *
        </label>
        <textarea
          {...register("details")}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Please describe your requirements in detail..."
        />
        {errors.details && (
          <p className="text-red-500 text-sm mt-1">{errors.details.message}</p>
        )}
      </div>

      {/* Service Tiers */}
      {service.pricing_type === "package" && service.pricing_tiers && service.pricing_tiers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choose Package *
          </label>
          <div className="space-y-2">
            {service.pricing_tiers.map((tier) => (
              <label key={tier.id} className="flex items-center">
                <input
                  type="radio"
                  {...register("service_tier")}
                  value={tier.tier_name}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2 text-sm">
                  {tier.tier_name} - ৳{tier.price}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          Booking submitted successfully! We will contact you soon.
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <LoadingSpinner /> Submitting...
          </>
        ) : (
          "Book This Service"
        )}
      </button>
    </form>
  );
}
