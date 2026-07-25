/**
 * Inline payment + credential marks for the footer.
 *
 * Inline SVG rather than image files: they stay crisp at any size, need no
 * network request, and inherit the layout's sizing. Each is a compact
 * recognisable mark (not the licensed brand logo) so it reads at 20px in a
 * single row without shipping third-party trademark assets.
 */

type IconProps = { className?: string };

const box = "0 0 32 32";

/** bKash — its signature magenta rounded mark with the "b" cut-out. */
export function BkashIcon({ className }: IconProps) {
  return (
    <svg viewBox={box} className={className} aria-hidden role="presentation">
      <rect width="32" height="32" rx="8" fill="#E2136E" />
      <path
        d="M12 8v16M12 16c0-2.6 1.9-4.5 4.4-4.5S21 13.4 21 16s-1.9 4.5-4.6 4.5S12 18.6 12 16Z"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Nagad — red mark with the angular "N". */
export function NagadIcon({ className }: IconProps) {
  return (
    <svg viewBox={box} className={className} aria-hidden role="presentation">
      <rect width="32" height="32" rx="8" fill="#EC1C24" />
      <path d="M11 23V9l10 14V9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Rocket (DBBL) — purple mark with an upward rocket form. */
export function RocketIcon({ className }: IconProps) {
  return (
    <svg viewBox={box} className={className} aria-hidden role="presentation">
      <rect width="32" height="32" rx="8" fill="#8B1A9B" />
      <path
        d="M16 7c3.2 2.6 4.8 6 4.8 9.6L16 21l-4.8-4.4C11.2 13 12.8 9.6 16 7Z"
        fill="#fff"
      />
      <circle cx="16" cy="14.4" r="1.7" fill="#8B1A9B" />
      <path d="M13.6 21.2 12 25l4-2 4 2-1.6-3.8" fill="#fff" opacity=".85" />
    </svg>
  );
}

/** Visa / Mastercard — the two interlocking circles, universally read as "cards". */
export function CardIcon({ className }: IconProps) {
  return (
    <svg viewBox={box} className={className} aria-hidden role="presentation">
      <rect width="32" height="32" rx="8" fill="#1A1F71" />
      <circle cx="13" cy="16" r="6" fill="#EB001B" />
      <circle cx="19" cy="16" r="6" fill="#F79E1B" opacity=".9" />
    </svg>
  );
}

/** SSLCommerz — a padlock, the gateway's security promise. */
export function SslIcon({ className }: IconProps) {
  return (
    <svg viewBox={box} className={className} aria-hidden role="presentation">
      <rect width="32" height="32" rx="8" fill="#1E5BA8" />
      <path d="M12 15v-2.5a4 4 0 0 1 8 0V15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <rect x="10.5" y="15" width="11" height="8.5" rx="2" fill="#fff" />
      <circle cx="16" cy="19.2" r="1.5" fill="#1E5BA8" />
    </svg>
  );
}

/** Cash on delivery — banknote with a coin. */
export function CodIcon({ className }: IconProps) {
  return (
    <svg viewBox={box} className={className} aria-hidden role="presentation">
      <rect width="32" height="32" rx="8" fill="#0F766E" />
      <rect x="7" y="11" width="18" height="10" rx="2" fill="#fff" />
      <circle cx="16" cy="16" r="3" fill="#0F766E" />
    </svg>
  );
}

/** Bank transfer — classic columned facade. */
export function BankIcon({ className }: IconProps) {
  return (
    <svg viewBox={box} className={className} aria-hidden role="presentation">
      <rect width="32" height="32" rx="8" fill="#0F172A" />
      <path d="M16 8l8 4.5H8L16 8Z" fill="#fff" />
      <rect x="10" y="14" width="2.4" height="7" fill="#fff" />
      <rect x="14.8" y="14" width="2.4" height="7" fill="#fff" />
      <rect x="19.6" y="14" width="2.4" height="7" fill="#fff" />
      <rect x="8.5" y="22" width="15" height="2.2" rx="1" fill="#fff" />
    </svg>
  );
}

/**
 * Stylised Bangladesh mark, kept as a vector fallback.
 *
 * The footer uses the official seal at /bd-govt-logo.png instead; this stays
 * available for any surface that needs a scalable, single-colour-safe stand-in.
 */
export function BdGovIcon({ className }: IconProps) {
  return (
    <svg viewBox={box} className={className} aria-hidden role="presentation">
      <circle cx="16" cy="16" r="15" fill="#006A4E" />
      <circle cx="16" cy="16" r="7.5" fill="#F42A41" />
      <g stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity=".95">
        <path d="M6.5 20c1.8 3.2 4.6 5.3 8 6" fill="none" />
        <path d="M25.5 20c-1.8 3.2-4.6 5.3-8 6" fill="none" />
      </g>
      <path d="M16 5.5l1.1 2.4 2.6.3-1.9 1.8.5 2.6L16 11.4l-2.3 1.2.5-2.6-1.9-1.8 2.6-.3L16 5.5Z" fill="#fff" />
    </svg>
  );
}
