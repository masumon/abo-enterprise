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
  { code: "US", flag: "🇺🇸", dial: "+1", label: "United States" },
  { code: "CA", flag: "🇨🇦", dial: "+1", label: "Canada" },
  { code: "BR", flag: "🇧🇷", dial: "+55", label: "Brazil" },
  { code: "MX", flag: "🇲🇽", dial: "+52", label: "Mexico" },
  { code: "FR", flag: "🇫🇷", dial: "+33", label: "France" },
  { code: "DE", flag: "🇩🇪", dial: "+49", label: "Germany" },
  { code: "IT", flag: "🇮🇹", dial: "+39", label: "Italy" },
  { code: "ES", flag: "🇪🇸", dial: "+34", label: "Spain" },
  { code: "PT", flag: "🇵🇹", dial: "+351", label: "Portugal" },
  { code: "NL", flag: "🇳🇱", dial: "+31", label: "Netherlands" },
  { code: "SE", flag: "🇸🇪", dial: "+46", label: "Sweden" },
  { code: "IE", flag: "🇮🇪", dial: "+353", label: "Ireland" },
  { code: "GR", flag: "🇬🇷", dial: "+30", label: "Greece" },
  { code: "RO", flag: "🇷🇴", dial: "+40", label: "Romania" },
  { code: "PL", flag: "🇵🇱", dial: "+48", label: "Poland" },
  { code: "IN", flag: "🇮🇳", dial: "+91", label: "India" },
  { code: "PK", flag: "🇵🇰", dial: "+92", label: "Pakistan" },
  { code: "NP", flag: "🇳🇵", dial: "+977", label: "Nepal" },
  { code: "LK", flag: "🇱🇰", dial: "+94", label: "Sri Lanka" },
  { code: "CN", flag: "🇨🇳", dial: "+86", label: "China" },
  { code: "JP", flag: "🇯🇵", dial: "+81", label: "Japan" },
  { code: "KR", flag: "🇰🇷", dial: "+82", label: "South Korea" },
  { code: "SG", flag: "🇸🇬", dial: "+65", label: "Singapore" },
  { code: "TH", flag: "🇹🇭", dial: "+66", label: "Thailand" },
  { code: "ID", flag: "🇮🇩", dial: "+62", label: "Indonesia" },
  { code: "MV", flag: "🇲🇻", dial: "+960", label: "Maldives" },
  { code: "QA", flag: "🇶🇦", dial: "+974", label: "Qatar" },
  { code: "KW", flag: "🇰🇼", dial: "+965", label: "Kuwait" },
  { code: "OM", flag: "🇴🇲", dial: "+968", label: "Oman" },
  { code: "BH", flag: "🇧🇭", dial: "+973", label: "Bahrain" },
  { code: "JO", flag: "🇯🇴", dial: "+962", label: "Jordan" },
  { code: "LB", flag: "🇱🇧", dial: "+961", label: "Lebanon" },
  { code: "TR", flag: "🇹🇷", dial: "+90", label: "Turkey" },
  { code: "AU", flag: "🇦🇺", dial: "+61", label: "Australia" },
  { code: "NZ", flag: "🇳🇿", dial: "+64", label: "New Zealand" },
  { code: "ZA", flag: "🇿🇦", dial: "+27", label: "South Africa" },
];

/** Local digits + the selected country's dial code, as one submittable value. */
export function composePhone(country: PhoneCountry, local: string): string {
  const digits = local.trim().replace(/[\s()-]/g, "");
  if (!country.dial) {
    // Bangladesh: accept 1XXXXXXXXX (no leading 0) and +880/880 forms as well as 01XXXXXXXXX.
    const d = digits.replace(/^\+?880/, "0");
    return /^1[3-9]\d{8}$/.test(d) ? `0${d}` : d;
  }
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
            placeholder={country.code === "BD" ? "01XXXXXXXXX বা 1XXXXXXXXX" : "XXXXXXXXXX"}
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
