"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isQueuedResponse, serviceBookingsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { saveOrderSnapshot } from "@/lib/orderSnapshot";
import type { Service, ServiceBookingFormField } from "@/types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";
import { BD_PHONE_REGEX } from "@/lib/phone";
import { BD_DISTRICTS } from "@/lib/bdDistricts";
import { getUpazilasForDistrict } from "@/lib/bdUpazilas";
import { useLanguageStore } from "@/store/language";

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

type DynamicValue = string | boolean | string[];

/** Field types whose value is not a plain string (string defaults don't apply). */
const NON_TEXT_TYPES = new Set(["checkbox", "boolean", "multiselect", "checkbox_group"]);

/** Active dynamic fields for this service, in admin-defined order. */
function activeDynamicFields(service: Service): ServiceBookingFormField[] {
  return (service.booking_forms ?? [])
    .filter((f) => f.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** Mirrors the server's show_if conditional logic (core/booking_form.py). */
function isFieldVisible(
  field: ServiceBookingFormField,
  values: Record<string, DynamicValue>
): boolean {
  const logic = field.conditional_logic as { show_if?: { field?: string; equals?: unknown; not_equals?: unknown; in?: unknown[] } } | null | undefined;
  const showIf = logic?.show_if;
  if (!showIf?.field) return true;
  const actual = values[showIf.field];
  if ("equals" in showIf) return actual === showIf.equals;
  if ("not_equals" in showIf) return actual !== showIf.not_equals;
  if (Array.isArray(showIf.in)) return showIf.in.includes(actual as string);
  return true;
}

function isEmptyValue(v: DynamicValue | undefined): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false; // booleans are never "empty"
}

export default function BookingForm({ service, initialTierId, onSuccess }: BookingFormProps) {
  const router = useRouter();
  const { lang } = useLanguageStore();
  const initialTier = resolveInitialTier(service, initialTierId);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [queued, setQueued] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ---- Dynamic (admin-defined) booking form fields ----
  const dynamicFields = useMemo(() => activeDynamicFields(service), [service]);
  const [dynamicValues, setDynamicValues] = useState<Record<string, DynamicValue>>(() => {
    const init: Record<string, DynamicValue> = {};
    for (const f of dynamicFields) {
      // String defaults only apply to text-like fields: seeding "true" into a
      // checkbox would submit a value the customer never visibly selected.
      if (f.default_value && !NON_TEXT_TYPES.has((f.field_type || "text").toLowerCase())) {
        init[f.field_name] = f.default_value;
      }
    }
    return init;
  });
  const [dynamicErrors, setDynamicErrors] = useState<Record<string, string>>({});

  const setDynamicValue = (name: string, value: DynamicValue) => {
    setDynamicValues((prev) => ({ ...prev, [name]: value }));
    setDynamicErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const fixFieldsMsg =
    lang === "bn"
      ? "অনুগ্রহ করে চিহ্নিত ঘরগুলো ঠিক করে আবার চেষ্টা করুন।"
      : "Please fix the highlighted fields and try again.";

  /** Client-side mirror of the server validation; server stays authoritative. */
  function validateDynamicFields(): Record<string, DynamicValue> | null {
    const errors: Record<string, string> = {};
    const cleaned: Record<string, DynamicValue> = {};
    for (const field of dynamicFields) {
      if (!isFieldVisible(field, dynamicValues)) continue;
      const value = dynamicValues[field.field_name];
      const ftype = (field.field_type || "text").toLowerCase();
      // Mirror of the server rule: a required checkbox must actually be checked.
      if ((ftype === "checkbox" || ftype === "boolean") && field.is_required && value !== true) {
        errors[field.field_name] =
          lang === "bn" ? "এই ঘরটি টিক দেওয়া আবশ্যক" : "This field must be checked";
        continue;
      }
      if (isEmptyValue(value)) {
        if (field.is_required) {
          errors[field.field_name] =
            lang === "bn" ? "এই ঘরটি পূরণ করা আবশ্যক" : "This field is required";
        }
        continue;
      }
      const rules = (field.validation_rules ?? {}) as { pattern?: string; pattern_message?: string; min_length?: number; max_length?: number };
      if (typeof value === "string") {
        if (rules.min_length != null && value.trim().length < rules.min_length) {
          errors[field.field_name] =
            lang === "bn" ? `কমপক্ষে ${rules.min_length} অক্ষর দিন` : `Must be at least ${rules.min_length} characters`;
          continue;
        }
        if (rules.pattern) {
          try {
            if (!new RegExp(rules.pattern).test(value.trim())) {
              errors[field.field_name] =
                rules.pattern_message || (lang === "bn" ? "সঠিক ফরম্যাটে লিখুন" : "Invalid format");
              continue;
            }
          } catch {
            /* bad admin regex — let the server decide */
          }
        }
        cleaned[field.field_name] = value.trim();
      } else {
        cleaned[field.field_name] = value;
      }
    }
    if (Object.keys(errors).length > 0) {
      setDynamicErrors(errors);
      return null;
    }
    return cleaned;
  }
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
      // base_price from API can be null; convert to undefined so z.number().optional() passes
      quoted_price: initialTier?.price ?? service.base_price ?? undefined,
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

      const formData = validateDynamicFields();
      if (formData === null) {
        setSubmitError(fixFieldsMsg);
        setSubmitting(false);
        return;
      }

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
        form_data: formData,
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
      // Surface per-field validation errors from the server's dynamic form check.
      const detail = (error as { response?: { data?: { detail?: { errors?: Record<string, string> } } } })
        ?.response?.data?.detail;
      if (detail?.errors && typeof detail.errors === "object") {
        setDynamicErrors(detail.errors);
        setSubmitError(fixFieldsMsg);
      } else {
        setSubmitError(apiErrorMessage(error, "Booking failed. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onInvalidSubmit(fieldErrors: Record<string, unknown>) {
    const first = Object.keys(fieldErrors)[0];
    const labels: Record<string, string> = {
      customer_name: "Full Name",
      customer_phone: "Phone Number",
      customer_email: "Email Address",
      details: "Details / Requirements",
    };
    const fieldLabel = first ? labels[first] : null;
    setSubmitError(
      fieldLabel
        ? `Please fix the "${fieldLabel}" field and try again.`
        : "Please fill in all required fields and try again."
    );
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

      {/* Dynamic fields defined by the admin for this specific service */}
      {dynamicFields.filter((f) => isFieldVisible(f, dynamicValues)).map((field) => {
        const label = lang === "bn" && field.field_label_bn ? field.field_label_bn : field.field_label_en;
        const err = dynamicErrors[field.field_name];
        const value = dynamicValues[field.field_name];
        const ftype = (field.field_type || "text").toLowerCase();
        const options = field.options ?? [];

        return (
          <div key={field.id}>
            {ftype !== "checkbox" && (
              <label className="form-label">
                {label} {field.is_required && "*"}
              </label>
            )}
            {ftype === "textarea" ? (
              <textarea
                rows={3}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setDynamicValue(field.field_name, e.target.value)}
                className={cn("input resize-none", err && "input-error")}
                placeholder={field.placeholder ?? undefined}
              />
            ) : ftype === "select" ? (
              <select
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setDynamicValue(field.field_name, e.target.value)}
                className={cn("input", err && "input-error")}
              >
                <option value="">{lang === "bn" ? "নির্বাচন করুন" : "Select"}</option>
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : ftype === "radio" ? (
              <div className="space-y-2">
                {options.map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm text-heading cursor-pointer">
                    <input
                      type="radio"
                      name={`dyn_${field.field_name}`}
                      checked={value === o}
                      onChange={() => setDynamicValue(field.field_name, o)}
                      className="w-4 h-4 text-brand-600"
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            ) : ftype === "multiselect" || ftype === "checkbox_group" ? (
              <div className="space-y-2">
                {options.map((o) => {
                  const selected = Array.isArray(value) ? value : [];
                  return (
                    <label key={o} className="flex items-center gap-2 text-sm text-heading cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(o)}
                        onChange={(e) =>
                          setDynamicValue(
                            field.field_name,
                            e.target.checked ? [...selected, o] : selected.filter((v) => v !== o)
                          )
                        }
                        className="w-4 h-4 text-brand-600 rounded"
                      />
                      <span>{o}</span>
                    </label>
                  );
                })}
              </div>
            ) : ftype === "checkbox" || ftype === "boolean" ? (
              <label className="flex items-center gap-2 text-sm text-heading cursor-pointer">
                <input
                  type="checkbox"
                  checked={value === true}
                  onChange={(e) => setDynamicValue(field.field_name, e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded"
                />
                <span>
                  {label} {field.is_required && "*"}
                </span>
              </label>
            ) : (
              <input
                type={
                  ftype === "number" || ftype === "integer"
                    ? "number"
                    : ftype === "email"
                      ? "email"
                      : ftype === "phone" || ftype === "tel"
                        ? "tel"
                        : ftype === "url"
                          ? "url"
                          : ftype === "date"
                            ? "date"
                            : "text"
                }
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setDynamicValue(field.field_name, e.target.value)}
                className={cn("input", err && "input-error")}
                placeholder={field.placeholder ?? undefined}
              />
            )}
            {err && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{err}</p>}
          </div>
        );
      })}

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
          /* Dynamic CTA — computed by the API per service (book/order/quote/contact) */
          (lang === "bn" ? service.cta?.label_bn : service.cta?.label_en) ?? "Book This Service"
        )}
      </button>
    </form>
  );
}
