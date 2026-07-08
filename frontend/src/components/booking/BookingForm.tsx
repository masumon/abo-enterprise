"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isQueuedResponse, serviceBookingsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { saveOrderSnapshot } from "@/lib/orderSnapshot";
import type { Service } from "@/types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";
import { BD_PHONE_REGEX } from "@/lib/phone";
import { BD_DISTRICTS } from "@/lib/bdDistricts";
import { getUpazilasForDistrict } from "@/lib/bdUpazilas";

const bookingSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_phone: z.string().regex(BD_PHONE_REGEX, "Invalid Bangladesh phone number"),
  customer_email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  customer_company: z.string().optional(),
  booking_date: z.string().optional(),
  district: z.string().optional(),
  upazila: z.string().optional(),
  details: z.string().min(10, "Please provide more details"),
  service_tier: z.string().optional(),
  quoted_price: z.number().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  service: Service;
  initialTierId?: string;
  onSuccess?: () => void;
}

function resolveInitialTier(service: Service, initialTierId?: string) {
  if (!service.pricing_tiers?.length) return undefined;
  if (initialTierId) {
    return service.pricing_tiers.find((t) => t.id === initialTierId) ?? service.pricing_tiers[0];
  }
  return service.pricing_tiers[0];
}

export default function BookingForm({ service, initialTierId, onSuccess }: BookingFormProps) {
  const router = useRouter();
  const initialTier = resolveInitialTier(service, initialTierId);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [queued, setQueued] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      service_tier: initialTier?.tier_name,
      quoted_price: initialTier?.price ?? service.base_price,
    },
  });

  const selectedDistrict = watch("district");
  const upazilaOptions = useMemo(
    () => (selectedDistrict ? getUpazilasForDistrict(selectedDistrict) : []),
    [selectedDistrict]
  );

  async function onSubmit(data: BookingFormData) {
    try {
      setSubmitting(true);
      setSubmitError(null);
      setQueued(false);

      const selectedTier = service.pricing_tiers?.find((t) => t.tier_name === data.service_tier);
      const quotedPrice = selectedTier?.price ?? service.base_price ?? data.quoted_price;
      const location = [data.upazila, data.district].filter(Boolean).join(", ");
      const details = location ? `Location: ${location}\n\n${data.details}` : data.details;

      const r = await serviceBookingsApi.create({
        service_id: service.id,
        service_tier: data.service_tier,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email?.trim() || undefined,
        customer_company: data.customer_company,
        booking_date: data.booking_date ? new Date(data.booking_date).toISOString() : undefined,
        pricing_type: service.pricing_type,
        quoted_price: quotedPrice,
        details,
      });

      if (isQueuedResponse(r)) {
        setQueued(true);
        setSuccess(true);
        reset();
        setTimeout(() => {
          setSuccess(false);
          setQueued(false);
        }, 4000);
        return;
      }

      // Redirect to the success page with the auto-created invoice
      const created = r?.data?.data;
      const bookingId = created?.id;
      if (bookingId) {
        const price = Number(created?.quoted_price ?? quotedPrice ?? 0);
        saveOrderSnapshot({
          kind: "booking",
          reference: String(bookingId),
          booking_number: created?.booking_number,
          service_name: created?.service_name ?? service.name_en,
          phone: data.customer_phone,
          customer_name: data.customer_name,
          payment_method: "pending",
          items: [{ name: created?.service_name ?? service.name_en, quantity: 1, price, subtotal: price }],
          subtotal: price,
          delivery_charge: 0,
          total: price,
          created_at: new Date().toISOString(),
        });
        router.push(`/booking-success?booking=${bookingId}&phone=${encodeURIComponent(data.customer_phone)}`);
        return;
      }

      if (onSuccess) {
        onSuccess();
        return;
      }

      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setSubmitError(apiErrorMessage(error, "Booking failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function onInvalidSubmit() {
    setSubmitError("Please fix highlighted fields and try again.");
  }

  const hasTiers = Boolean(service.pricing_tiers && service.pricing_tiers.length > 0);

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">
      <div className="alert-info">
        <p className="text-sm text-muted">
          <span className="font-semibold text-heading">Service:</span> {service.name_en}
        </p>
        {service.pricing_type === "fixed" && service.base_price && !hasTiers && (
          <p className="text-lg font-bold text-brand-600 dark:text-brand-300 mt-2">৳{service.base_price}</p>
        )}
      </div>

      <div>
        <label className="form-label">Full Name *</label>
        <input
          type="text"
          {...register("customer_name")}
          className={cn("input", errors.customer_name && "input-error")}
          placeholder="Your full name"
        />
        {errors.customer_name && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.customer_name.message}</p>
        )}
      </div>

      <div>
        <label className="form-label">Phone Number (BD) *</label>
        <input
          type="tel"
          {...register("customer_phone")}
          className={cn("input", errors.customer_phone && "input-error")}
          placeholder="01XXXXXXXXX"
        />
        {errors.customer_phone && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.customer_phone.message}</p>
        )}
      </div>

      <div>
        <label className="form-label">Email Address (Optional)</label>
        <input
          type="email"
          {...register("customer_email")}
          className={cn("input", errors.customer_email && "input-error")}
          placeholder="your@email.com"
        />
        {errors.customer_email && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.customer_email.message}</p>
        )}
      </div>

      <div>
        <label className="form-label">Company (Optional)</label>
        <input
          type="text"
          {...register("customer_company")}
          className="input"
          placeholder="Company name"
        />
      </div>

      <div>
        <label className="form-label">Preferred Booking Date (Optional)</label>
        <input type="date" {...register("booking_date")} className="input" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">District (Optional)</label>
          <select
            {...register("district")}
            onChange={(e) => {
              register("district").onChange(e);
              setValue("upazila", "");
            }}
            className="input"
          >
            <option value="">Select</option>
            {BD_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Upazila / Thana (Optional)</label>
          <select {...register("upazila")} className="input" disabled={!selectedDistrict}>
            <option value="">Select</option>
            {upazilaOptions.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {hasTiers && (
        <div>
          <label className="form-label mb-3">Choose Package</label>
          <div className="space-y-2">
            {service.pricing_tiers!.map((tier) => (
              <label key={tier.id} className="flex items-center gap-2 text-sm text-heading cursor-pointer">
                <input
                  type="radio"
                  {...register("service_tier")}
                  value={tier.tier_name}
                  className="w-4 h-4 text-brand-600"
                />
                <span>{tier.tier_name} - ৳{tier.price}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="form-label">Details / Requirements *</label>
        <textarea
          {...register("details")}
          rows={4}
          className={cn("input resize-none", errors.details && "input-error")}
          placeholder="Please describe your requirements in detail..."
        />
        {errors.details && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.details.message}</p>
        )}
      </div>

      {submitError && <div className="alert-error">{submitError}</div>}

      {success && (
        <div className="alert-success">
          {queued
            ? "Booking queued offline. It will sync automatically when you're back online."
            : "Booking submitted successfully! We will contact you soon."}
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn btn-brand btn-lg w-full">
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
