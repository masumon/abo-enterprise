/**
 * Hydration-safe date formatting.
 *
 * `toLocaleDateString()` depends on the runtime's time zone and ICU data, so the
 * server (UTC, Node ICU) and the browser (Asia/Dhaka, Chrome ICU) can print a
 * different day or different text for the same timestamp — React error #418.
 * This formatter is pure: it always uses Bangladesh time (UTC+6, no DST) and
 * fixed month names, so server and client render identical text.
 */

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

const bnDigits = (v: number | string) => String(v).replace(/\d/g, (d) => BN_DIGITS[+d]);

/** "১০ অক্টোবর, ২০২৬" (bn) or "10 October 2026" (en); "" for missing/invalid input. */
export function formatStableDate(iso: string | null | undefined, lang: "bn" | "en"): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const d = new Date(t + DHAKA_OFFSET_MS);
  const day = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  return lang === "bn"
    ? `${bnDigits(day)} ${MONTHS_BN[month]}, ${bnDigits(year)}`
    : `${day} ${MONTHS_EN[month]} ${year}`;
}
