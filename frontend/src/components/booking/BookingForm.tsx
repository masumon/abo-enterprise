"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { bookingUploadsApi, isQueuedResponse, serviceBookingsApi, servicesApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { saveOrderSnapshot } from "@/lib/orderSnapshot";
import type { Service, ServiceBookingFormField, ServiceSlot } from "@/types";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BD_PHONE_REGEX, BD_PHONE_ERROR_EN, BD_PHONE_ERROR_BN } from "@/lib/phone";
import { useDistrictUpazila, BD_DISTRICTS } from "@/hooks/useDistrictUpazila";
import { useLanguageStore } from "@/store/language";
import { fulfilmentDetail } from "@/lib/fulfilment";
import CountrySelector from "@/components/ui/CountrySelector";

/**
 * GAP-12 — the booking form presents contact fields, scheduling, location,
 * package choice, admin-defined custom fields, documents, a coupon box and a
 * requirements textarea as one undifferentiated column. On a phone that is a
 * long scroll with no sense of how much is left, which is where booking forms
 * lose people.
 *
 * These headings group the existing fields into three named stages. They are
 * headings, not a wizard: every field stays mounted, validation and the single
 * submit are untouched, so a partially-filled form can never be trapped behind
 * a step boundary and nothing about the request payload changes.
 */
function StepHeading({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3 pt-4 mt-2 border-t border-gray-100 dark:border-white/10 first:pt-0 first:mt-0 first:border-t-0">
      <span
        aria-hidden
        className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
      >
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-heading leading-tight">{title}</h3>
        <p className="text-xs text-muted mt-0.5">{hint}</p>
      </div>
    </div>
  );
}

const bookingSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  // M6 — BD_PHONE_REGEX already accepts BD (01XXXXXXXXX) and international
  // (+<country code><digits>) formats; the copy just used to claim otherwise.
  customer_phone: z.string().regex(BD_PHONE_REGEX, BD_PHONE_ERROR_EN),
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
  coupon_code: z.string().optional(),
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

/** Scroll to and focus a control by id — an error the customer can't see is
 *  the same as no error at all on a form this long. */
function focusField(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  // Both guarded: scrollIntoView is absent in jsdom and in some older mobile
  // webviews, and losing focus assistance must never break a submission.
  el.scrollIntoView?.({ behavior: "smooth", block: "center" });
  (el as HTMLElement).focus?.({ preventScroll: true });
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
  const [selectedCountry, setSelectedCountry] = useState("BD");
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
      const ftype = (f.field_type || "text").toLowerCase();
      if (!f.default_value || NON_TEXT_TYPES.has(ftype)) continue;
      // For option-backed controls the default must be one of the options —
      // otherwise the <select> renders blank while the unmatched value stays
      // in state and is submitted, only to be rejected as "Invalid option".
      if ((ftype === "select" || ftype === "radio") && !(f.options ?? []).includes(f.default_value)) {
        continue;
      }
      init[f.field_name] = f.default_value;
    }
    return init;
  });
  const [dynamicErrors, setDynamicErrors] = useState<Record<string, string>>({});
  // Documents the customer attaches. `attachments` covers the service's
  // required_documents list; `uploading` keys are per dynamic file field.
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ---- Optional appointment scheduling ----
  // Off for most services, in which case none of this renders and
  // booking_date stays the original free "preferred date" input.
  const scheduling = service.scheduling_enabled === true;
  const [slotDate, setSlotDate] = useState("");
  const [slots, setSlots] = useState<ServiceSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");

  useEffect(() => {
    if (!scheduling || !slotDate) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedSlot("");
    servicesApi
      .availability(service.id, slotDate)
      .then((r) => {
        if (!cancelled) setSlots(r.data?.data?.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scheduling, slotDate, service.id]);

  async function uploadDocument(key: string, file: File): Promise<string | null> {
    setUploading((p) => ({ ...p, [key]: true }));
    setUploadError(null);
    try {
      const r = await bookingUploadsApi.upload(file);
      return r.data?.data?.url ?? null;
    } catch (e) {
      setUploadError(
        apiErrorMessage(
          e,
          lang === "bn" ? "ফাইল আপলোড করা যায়নি।" : "Couldn't upload that file."
        )
      );
      return null;
    } finally {
      setUploading((p) => ({ ...p, [key]: false }));
    }
  }

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
        // Server caps every text-like answer at 2000 chars unless the admin set
        // a lower max_length; mirror it so a long answer fails here, next to
        // the field, instead of after a round trip.
        const maxLen = rules.max_length ?? 2000;
        if (value.trim().length > maxLen) {
          errors[field.field_name] =
            lang === "bn" ? `সর্বোচ্চ ${maxLen} অক্ষর` : `Must be at most ${maxLen} characters`;
          continue;
        }
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
      const firstName = Object.keys(errors)[0];
      const firstField = dynamicFields.find((f) => f.field_name === firstName);
      if (firstField) focusField(`dyn-${firstField.id}`);
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
  const selectedUpazila = watch("upazila");
  const { upazilaOptions } = useDistrictUpazila(selectedDistrict, selectedUpazila, (v) =>
    setValue("upazila", v)
  );

  async function onSubmit(data: BookingFormData) {
    try {
      setSubmitting(true);
      setSubmitError(null);
      setQueued(false);

      if (scheduling && !selectedSlot) {
        setSubmitError(L("Please choose an appointment time.", "একটি সময় নির্বাচন করুন।"));
        setSubmitting(false);
        focusField("booking-slot-date");
        return;
      }

      const formData = validateDynamicFields();
      if (formData === null) {
        setSubmitError(fixFieldsMsg);
        setSubmitting(false);
        return;
      }

      const selectedTier = service.pricing_tiers?.find((t) => t.tier_name === data.service_tier);
      const quotedPrice = selectedTier?.price ?? service.base_price ?? data.quoted_price;
      // District/upazila are sent as their own fields now — prefixing them into
      // `details` made location unqueryable for a district-organised business.

      const r = await serviceBookingsApi.create({
        service_id: service.id,
        service_tier: data.service_tier,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email?.trim() || undefined,
        customer_company: data.customer_company,
        district: data.district || undefined,
        upazila: data.upazila || undefined,
        booking_date: scheduling
          ? selectedSlot
          : data.booking_date
            ? new Date(data.booking_date).toISOString()
            : undefined,
        pricing_type: service.pricing_type,
        quoted_price: quotedPrice,
        details: data.details,
        coupon_code: data.coupon_code?.trim().toUpperCase() || undefined,
        form_data: formData,
        attachments: attachments.map((a) => a.url),
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
    const entry = first ? fieldLabels[first] : undefined;
    setSubmitError(
      entry
        ? L(
            `Please fix the "${entry.label}" field and try again.`,
            `"${entry.label}" ঘরটি ঠিক করে আবার চেষ্টা করুন।`
          )
        : L(
            "Please fill in all required fields and try again.",
            "সব আবশ্যক ঘর পূরণ করে আবার চেষ্টা করুন।"
          )
    );
    if (entry) focusField(entry.id);
  }

  const hasTiers = Boolean(service.pricing_tiers && service.pricing_tiers.length > 0);
  const bn = lang === "bn";
  const L = (en: string, bnText: string) => (bn ? bnText : en);

  /** Every control the form renders, so an error banner can always name the
   *  field it is talking about — including the admin-defined ones. */
  const fulfilmentNote = fulfilmentDetail(service.fulfilment, lang);
  const needsVisit = service.fulfilment === "at_shop" || service.fulfilment === "hybrid";

  const fieldLabels: Record<string, { label: string; id: string }> = {
    customer_name: { label: L("Full Name", "পূর্ণ নাম"), id: "booking-name" },
    customer_phone: { label: L("Phone Number", "মোবাইল নম্বর"), id: "booking-phone" },
    customer_email: { label: L("Email Address", "ইমেইল"), id: "booking-email" },
    customer_company: { label: L("Company", "কোম্পানি"), id: "booking-company" },
    booking_date: { label: L("Preferred Booking Date", "পছন্দের তারিখ"), id: "booking-date" },
    details: { label: L("Details / Requirements", "বিস্তারিত / প্রয়োজন"), id: "booking-details" },
  };


  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6">
      <div className="alert-info">
        <p className="text-sm text-muted">
          <span className="font-semibold text-heading">{L("Service:", "সেবা:")}</span>{" "}
          {bn && service.name_bn ? service.name_bn : service.name_en}
        </p>
        {service.pricing_type === "fixed" && service.base_price && !hasTiers && (
          <p className="text-lg font-bold text-brand-600 dark:text-brand-300 mt-2">৳{service.base_price}</p>
        )}
      </div>

      {/* An advance-gated service stays pending until the fee is settled —
          say so before the customer submits, not after. */}
      {service.requires_advance && (
        <div className="alert-warning" role="note">
          <p className="text-sm">
            {L(
              `This service requires an advance consultancy fee${service.consultancy_fee ? ` of ৳${service.consultancy_fee}` : ""}. We'll contact you to collect it, and your booking is confirmed once it's received.`,
              `এই সেবার জন্য অগ্রিম কনসালটেন্সি ফি${service.consultancy_fee ? ` ৳${service.consultancy_fee}` : ""} প্রয়োজন। আমরা যোগাযোগ করে এটি সংগ্রহ করব, এবং ফি পাওয়ার পর আপনার বুকিং নিশ্চিত হবে।`
            )}
          </p>
        </div>
      )}

      <StepHeading
        n={1}
        title={L("Your details", "আপনার তথ্য")}
        hint={L("So we can confirm the booking with you.", "বুকিং নিশ্চিত করতে আমরা এখানেই যোগাযোগ করব।")}
      />

      <div>
        <label htmlFor="booking-name" className="form-label">{L("Full Name *", "পূর্ণ নাম *")}</label>
        <input
          id="booking-name"
          type="text"
          {...register("customer_name")}
          className={cn("input", errors.customer_name && "input-error")}
          placeholder={L("Your full name", "আপনার পূর্ণ নাম")}
          aria-invalid={errors.customer_name ? true : undefined}
          aria-describedby={errors.customer_name ? "booking-name-error" : undefined}
        />
        {errors.customer_name && (
          <p id="booking-name-error" className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.customer_name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="booking-phone" className="form-label">{L("Phone Number *", "মোবাইল নম্বর *")}</label>
        <div className="flex gap-2">
          <div className="w-24">
            <CountrySelector selected={selectedCountry} onChange={setSelectedCountry} />
          </div>
          <input
            id="booking-phone"
            type="tel"
            {...register("customer_phone")}
            className={cn("input flex-1", errors.customer_phone && "input-error")}
            placeholder={selectedCountry === "BD" ? "01XXXXXXXXX" : "+..."}
            aria-invalid={errors.customer_phone ? true : undefined}
            aria-describedby={errors.customer_phone ? "booking-phone-error" : undefined}
          />
        </div>
        {errors.customer_phone && (
          <p id="booking-phone-error" className="text-red-500 dark:text-red-400 text-sm mt-1">{L(BD_PHONE_ERROR_EN, BD_PHONE_ERROR_BN)}</p>
        )}
      </div>

      <div>
        <label htmlFor="booking-email" className="form-label">{L("Email Address (Optional)", "ইমেইল (ঐচ্ছিক)")}</label>
        <input
          id="booking-email"
          type="email"
          {...register("customer_email")}
          className={cn("input", errors.customer_email && "input-error")}
          placeholder="your@email.com"
          aria-invalid={errors.customer_email ? true : undefined}
          aria-describedby={errors.customer_email ? "booking-email-error" : undefined}
        />
        {errors.customer_email && (
          <p id="booking-email-error" className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.customer_email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="booking-company" className="form-label">{L("Company (Optional)", "কোম্পানি (ঐচ্ছিক)")}</label>
        <input
          id="booking-company"
          type="text"
          {...register("customer_company")}
          className="input"
          placeholder={L("Company name", "কোম্পানির নাম")}
        />
      </div>

      <StepHeading
        n={2}
        title={L("When & where", "কখন ও কোথায়")}
        hint={L("Pick a time and tell us your area.", "সময় বেছে নিন এবং আপনার এলাকা জানান।")}
      />

      {/* GAP-15 — a service that can only be completed at the shop must say so
          before the customer picks a date, not after they have waited at home. */}
      {fulfilmentNote && (
        <div className={needsVisit ? "alert-warning" : "alert-info"} role="note">
          <p className="text-sm">{fulfilmentNote}</p>
        </div>
      )}

      {scheduling ? (
        <div>
          <label htmlFor="booking-slot-date" className="form-label">
            {L("Appointment Date *", "অ্যাপয়েন্টমেন্টের তারিখ *")}
          </label>
          <input
            id="booking-slot-date"
            type="date"
            value={slotDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setSlotDate(e.target.value)}
            className="input"
          />
          {slotDate && (
            <div className="mt-3">
              <p className="form-label">{L("Available Times *", "সময় নির্বাচন করুন *")}</p>
              {slotsLoading ? (
                <p className="text-sm text-muted">{L("Checking availability…", "সময় দেখা হচ্ছে…")}</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted">
                  {L("We're closed that day — please pick another date.", "সেদিন আমরা বন্ধ — অন্য তারিখ বেছে নিন।")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.start)}
                      aria-pressed={selectedSlot === slot.start}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                        selectedSlot === slot.start
                          ? "bg-brand-600 text-white border-brand-600"
                          : slot.available
                            ? "bg-white dark:bg-white/5 text-heading border-gray-200 dark:border-white/10 hover:border-brand-400"
                            : "bg-gray-100 dark:bg-white/5 text-gray-400 border-transparent cursor-not-allowed line-through"
                      )}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="booking-date" className="form-label">{L("Preferred Booking Date (Optional)", "পছন্দের তারিখ (ঐচ্ছিক)")}</label>
          <input id="booking-date" type="date" {...register("booking_date")} className="input" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="booking-district" className="form-label">{L("District (Optional)", "জেলা (ঐচ্ছিক)")}</label>
          <select
            id="booking-district"
            {...register("district")}
            className="input"
          >
            <option value="">{L("Select", "নির্বাচন করুন")}</option>
            {BD_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="booking-upazila" className="form-label">{L("Upazila / Thana (Optional)", "উপজেলা / থানা (ঐচ্ছিক)")}</label>
          <select id="booking-upazila" {...register("upazila")} className="input" disabled={!selectedDistrict}>
            <option value="">{L("Select", "নির্বাচন করুন")}</option>
            {upazilaOptions.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <StepHeading
        n={3}
        title={L("What you need", "আপনার প্রয়োজন")}
        hint={L("The details that let us quote and prepare.", "যে তথ্য পেলে আমরা প্রস্তুতি ও দর দিতে পারি।")}
      />

      {hasTiers && (
        <fieldset>
          <legend className="form-label mb-3">{L("Choose Package", "প্যাকেজ বেছে নিন")}</legend>
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
        </fieldset>
      )}

      {/* Dynamic fields defined by the admin for this specific service */}
      {dynamicFields.filter((f) => isFieldVisible(f, dynamicValues)).map((field) => {
        const label = lang === "bn" && field.field_label_bn ? field.field_label_bn : field.field_label_en;
        const err = dynamicErrors[field.field_name];
        const value = dynamicValues[field.field_name];
        const ftype = (field.field_type || "text").toLowerCase();
        const options = field.options ?? [];

        const inputId = `dyn-${field.id}`;
        const errId = `dyn-${field.id}-error`;
        // Radio/checkbox groups get fieldset+legend; single controls get label↔id.
        const isGroup = ftype === "radio" || ftype === "multiselect" || ftype === "checkbox_group";
        const errorText = err && (
          <p id={errId} className="text-red-500 dark:text-red-400 text-sm mt-1">{err}</p>
        );

        if (isGroup) {
          return (
            <fieldset key={field.id} aria-describedby={err ? errId : undefined}>
              <legend className="form-label">
                {label} {field.is_required && "*"}
              </legend>
              <div className="space-y-2">
                {ftype === "radio"
                  ? options.map((o) => (
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
                    ))
                  : options.map((o) => {
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
              {errorText}
            </fieldset>
          );
        }

        return (
          <div key={field.id}>
            {ftype !== "checkbox" && ftype !== "boolean" && (
              <label htmlFor={inputId} className="form-label">
                {label} {field.is_required && "*"}
              </label>
            )}
            {ftype === "textarea" ? (
              <textarea
                id={inputId}
                rows={3}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setDynamicValue(field.field_name, e.target.value)}
                className={cn("input resize-none", err && "input-error")}
                placeholder={field.placeholder ?? undefined}
                aria-invalid={err ? true : undefined}
                aria-describedby={err ? errId : undefined}
              />
            ) : ftype === "select" ? (
              <select
                id={inputId}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setDynamicValue(field.field_name, e.target.value)}
                className={cn("input", err && "input-error")}
                aria-invalid={err ? true : undefined}
                aria-describedby={err ? errId : undefined}
              >
                <option value="">{lang === "bn" ? "নির্বাচন করুন" : "Select"}</option>
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : ftype === "file" ? (
              <div>
                <input
                  id={inputId}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadDocument(field.field_name, file);
                    if (url) setDynamicValue(field.field_name, url);
                    e.target.value = "";
                  }}
                  className={cn("input", err && "input-error")}
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? errId : undefined}
                />
                {uploading[field.field_name] && (
                  <p className="text-xs text-muted mt-1">{L("Uploading…", "আপলোড হচ্ছে…")}</p>
                )}
                {typeof value === "string" && value && !uploading[field.field_name] && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" aria-hidden />
                    {L("File attached", "ফাইল সংযুক্ত হয়েছে")}
                  </p>
                )}
              </div>
            ) : ftype === "checkbox" || ftype === "boolean" ? (
              <label className="flex items-center gap-2 text-sm text-heading cursor-pointer">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={value === true}
                  onChange={(e) => setDynamicValue(field.field_name, e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded"
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? errId : undefined}
                />
                <span>
                  {label} {field.is_required && "*"}
                </span>
              </label>
            ) : (
              <input
                id={inputId}
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
                            : ftype === "datetime"
                              ? "datetime-local"
                              : "text"
                }
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setDynamicValue(field.field_name, e.target.value)}
                className={cn("input", err && "input-error")}
                placeholder={field.placeholder ?? undefined}
                aria-invalid={err ? true : undefined}
                aria-describedby={err ? errId : undefined}
              />
            )}
            {errorText}
          </div>
        );
      })}

      {/* The service's required_documents list, now with somewhere to put them.
          Optional at submit — collecting late beats losing the booking. */}
      {(service.required_documents?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-brand-100 dark:border-brand-800/40 p-4">
          <p className="form-label mb-1">{L("Documents", "প্রয়োজনীয় কাগজপত্র")}</p>
          <p className="text-xs text-muted mb-3">
            {L(
              "Attach these now if you have them — PDF or photo, up to 10MB each. You can also send them later.",
              "থাকলে এখনই সংযুক্ত করুন — PDF বা ছবি, প্রতিটি সর্বোচ্চ ১০MB। পরেও পাঠাতে পারবেন।"
            )}
          </p>
          <ul className="space-y-1 mb-3">
            {service.required_documents!.map((d, i) => {
              // Item may be a legacy string or bilingual {en,bn}; pick with EN fallback.
              const text = typeof d === "string" ? d : (bn ? d.bn || d.en || "" : d.en || d.bn || "");
              return (
                <li key={i} className="text-sm text-muted flex items-start gap-2">
                  <span aria-hidden className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                  {text}
                </li>
              );
            })}
          </ul>
          <input
            id="booking-documents"
            type="file"
            accept="application/pdf,image/*"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              for (const file of files) {
                const url = await uploadDocument("documents", file);
                if (url) setAttachments((prev) => [...prev, { url, name: file.name }]);
              }
            }}
            className="input"
          />
          {uploading.documents && (
            <p className="text-xs text-muted mt-1">{L("Uploading…", "আপলোড হচ্ছে…")}</p>
          )}
          {attachments.length > 0 && (
            <ul className="mt-3 space-y-1">
              {attachments.map((a) => (
                <li key={a.url} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-heading truncate">✓ {a.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((x) => x.url !== a.url))}
                    className="text-xs text-red-500 hover:underline flex-shrink-0"
                  >
                    {L("Remove", "সরান")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Coupon — the server re-derives the discount from the admin rules
          (same helper the order flow uses), so nothing here is trusted. */}
      <div>
        <label htmlFor="booking-coupon" className="form-label">
          {L("Coupon Code (Optional)", "কুপন কোড (ঐচ্ছিক)")}
        </label>
        <input
          id="booking-coupon"
          type="text"
          {...register("coupon_code")}
          className="input uppercase"
          placeholder={L("e.g. ABO10", "যেমন ABO10")}
        />
        <p className="text-xs text-muted mt-1">
          {L("Applied to your invoice after we verify it.", "যাচাইয়ের পর আপনার ইনভয়েসে প্রয়োগ হবে।")}
        </p>
      </div>

      {uploadError && <div className="alert-error" role="alert">{uploadError}</div>}

      <div>
        <label htmlFor="booking-details" className="form-label">{L("Details / Requirements *", "বিস্তারিত / প্রয়োজন *")}</label>
        <textarea
          id="booking-details"
          {...register("details")}
          rows={4}
          className={cn("input resize-none", errors.details && "input-error")}
          placeholder={L("Please describe your requirements in detail...", "আপনার প্রয়োজন বিস্তারিত লিখুন...")}
          aria-invalid={errors.details ? true : undefined}
          aria-describedby={errors.details ? "booking-details-error" : undefined}
        />
        {errors.details && (
          <p id="booking-details-error" className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.details.message}</p>
        )}
      </div>

      {submitError && <div className="alert-error" role="alert">{submitError}</div>}

      {success && (
        <div className="alert-success" role="status">
          {queued
            ? L("Booking queued offline. It will sync automatically when you're back online.", "বুকিং অফলাইনে সংরক্ষিত হয়েছে। ইন্টারনেট ফিরলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।")
            : L("Booking submitted successfully! We will contact you soon.", "বুকিং সফলভাবে জমা হয়েছে! আমরা শীঘ্রই যোগাযোগ করব।")}
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn btn-brand btn-lg w-full">
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> {L("Submitting...", "জমা হচ্ছে...")}
          </>
        ) : (
          /* Dynamic CTA — computed by the API per service (book/order/quote/contact) */
          (lang === "bn" ? service.cta?.label_bn : service.cta?.label_en) ?? "Book This Service"
        )}
      </button>
    </form>
  );
}
