"use client";

import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Screen 15b — a phone field for customers who are not in Bangladesh.
 *
 * The regex has always accepted an international number, but the only way to
 * enter one was to know that and type "+44" in front. A shop whose customers
 * include people working in London, Riyadh, Dubai and Kuala Lumpur should not
 * ask them to guess that.
 *
 * Bangladesh is the default and adds no prefix at all, so the common case
 * submits exactly the string it always did — 01XXXXXXXXX — and nothing
 * downstream sees a change.
 */
export interface PhoneCountry {
  code: string;
  flag: string;
  dial: string;
  label: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "BD", flag: "🇧🇩", dial: "", label: "Bangladesh" },
  { code: "GB", flag: "🇬🇧", dial: "+44", label: "United Kingdom" },
  { code: "SA", flag: "🇸🇦", dial: "+966", label: "Saudi Arabia" },
  { code: "AE", flag: "🇦🇪", dial: "+971", label: "United Arab Emirates" },
  { code: "MY", flag: "🇲🇾", dial: "+60", label: "Malaysia" },
];

/** Local digits + the selected country's dial code, as one submittable value. */
export function composePhone(country: PhoneCountry, local: string): string {
  const digits = local.trim().replace(/[\s()-]/g, "");
  if (!country.dial) return digits;
  return `${country.dial}${digits.replace(/^0+/, "")}`;
}

export default function PhoneField({
  country,
  onCountryChange,
  value,
  onChange,
  id = "phone",
  label,
  hint,
  invalid,
  className,
}: {
  country: PhoneCountry;
  onCountryChange: (c: PhoneCountry) => void;
  value: string;
  onChange: (v: string) => void;
  id?: string;
  label: string;
  hint?: string;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="flex gap-2">
        <select
          value={country.code}
          onChange={(e) => {
            const next = PHONE_COUNTRIES.find((c) => c.code === e.target.value);
            if (next) onCountryChange(next);
          }}
          className="input w-[7.5rem] flex-shrink-0"
          aria-label="Country code"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dial || "+880"}
            </option>
          ))}
        </select>
        <div className="relative flex-1 min-w-0">
          <Phone aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn("input pl-10 w-full", invalid && "input-error")}
            placeholder={country.code === "BD" ? "01XXXXXXXXX" : "7XXXXXXXXX"}
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={invalid ? true : undefined}
          />
        </div>
      </div>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}
