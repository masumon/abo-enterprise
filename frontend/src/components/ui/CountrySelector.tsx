"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const COUNTRIES = [
  { code: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "AE", name: "UAE", dial: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { code: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { code: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
];

interface Props {
  selected: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export default function CountrySelector({ selected, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selectedCountry = COUNTRIES.find((c) => c.code === selected) || COUNTRIES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-white/5 dark:border-white/10 disabled:opacity-50"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{selectedCountry.flag}</span>
          <span>{selectedCountry.dial}</span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {COUNTRIES.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => {
                onChange(country.code);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-brand-50 dark:hover:bg-brand-900/30 ${
                selected === country.code ? "bg-brand-50 dark:bg-brand-900/30 font-semibold" : ""
              }`}
            >
              <span className="text-lg">{country.flag}</span>
              <span className="flex-1">{country.name}</span>
              <span className="text-gray-500 text-xs">{country.dial}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { COUNTRIES };
