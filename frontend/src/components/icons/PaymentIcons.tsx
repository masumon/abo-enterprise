/**
 * Payment brand marks for the footer, drawn inline.
 *
 * Each sits on its own white card, so the marks use their real brand colours
 * on a transparent background. Inline SVG keeps them crisp at any size with no
 * extra request — and no third-party logo files to ship.
 */

type IconProps = { className?: string };

export function VisaMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 22" className={className} role="img" aria-label="Visa">
      <text
        x="32"
        y="17"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="19"
        fontWeight="700"
        fontStyle="italic"
        fill="#1A1F71"
        letterSpacing="0.5"
      >
        VISA
      </text>
    </svg>
  );
}

export function MastercardMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 22" className={className} role="img" aria-label="Mastercard">
      <circle cx="26" cy="11" r="9.5" fill="#EB001B" />
      <circle cx="38" cy="11" r="9.5" fill="#F79E1B" />
      {/* The overlap reads orange-on-red in the real mark. */}
      <path
        d="M32 3.6a9.5 9.5 0 0 0 0 14.8 9.5 9.5 0 0 0 0-14.8Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function BkashMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 22" className={className} role="img" aria-label="bKash">
      <text x="32" y="17" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="16" fontWeight="700">
        <tspan fill="#E2136E">b</tspan>
        <tspan fill="#E2136E">K</tspan>
        <tspan fill="#2B2B2B">ash</tspan>
      </text>
    </svg>
  );
}

/** Nagad — the orange swirl with its inner flame. */
export function NagadMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Nagad">
      <circle cx="12" cy="12" r="11" fill="#F15A29" />
      <path
        d="M12 3.6c4 1.3 6.6 4.4 6.6 8.2 0 3.6-2.9 6.6-6.6 6.6S5.4 15.4 5.4 11.8c0-1.6.6-3 1.6-4.1-.3 2.6 1 4.6 3 5.4-.8-2.6.3-5.3 2-7.5Z"
        fill="#FFF"
      />
      <path d="M12 8.2c1.7 1.3 2.6 2.7 2.6 4.2a2.6 2.6 0 1 1-5.2 0c0-1.5.9-2.9 2.6-4.2Z" fill="#FBB040" />
    </svg>
  );
}

export function RocketMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 22" className={className} role="img" aria-label="Rocket">
      <text
        x="32"
        y="16"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="13"
        fontWeight="700"
        fill="#8B1A9B"
        letterSpacing="0.3"
      >
        Rocket
      </text>
    </svg>
  );
}

export function CardMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 22" className={className} role="img" aria-label="Cards">
      <rect x="14" y="4" width="36" height="14" rx="2.5" fill="#1A1F71" />
      <rect x="14" y="7.5" width="36" height="3" fill="#0D1140" />
    </svg>
  );
}

export function CodMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 22" className={className} role="img" aria-label="Cash on delivery">
      <rect x="14" y="5" width="36" height="12" rx="2" fill="#0F766E" />
      <circle cx="32" cy="11" r="3.6" fill="#fff" />
    </svg>
  );
}

export function BankMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 22" className={className} role="img" aria-label="Bank transfer">
      <path d="M32 3l12 6H20l12-6Z" fill="#0F172A" />
      <rect x="23" y="10" width="2.6" height="7" fill="#0F172A" />
      <rect x="30.7" y="10" width="2.6" height="7" fill="#0F172A" />
      <rect x="38.4" y="10" width="2.6" height="7" fill="#0F172A" />
      <rect x="21" y="18" width="22" height="2.2" rx="1" fill="#0F172A" />
    </svg>
  );
}
