/**
 * Flash-sale visibility & time logic — pure functions, no React, so the
 * public homepage section, the admin status line and the unit tests all use
 * exactly the same rules.
 *
 * Time zone: the admin types start/end in a `datetime-local` input
 * ("2026-10-10T20:00", no zone). That is ALWAYS Bangladesh time (UTC+06:00,
 * no DST), whatever time zone the visitor's or admin's device is in.
 * Strings that carry an explicit zone ("…Z", "…+06:00") are honoured as-is,
 * so older/other formats keep working.
 */

export const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

const NAIVE_RE =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/;
const HAS_ZONE_RE = /(Z|[+-]\d{2}:?\d{2})$/i;

/** Parse a stored start/end setting. Zone-less values are Bangladesh time.
 * Returns null for blank or unparseable input. */
export function parseDhakaDateTime(raw: string | null | undefined): Date | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const m = NAIVE_RE.exec(s);
  if (m) {
    const [, y, mo, d, h = "0", mi = "0", sec = "0"] = m;
    const ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, +sec) - DHAKA_OFFSET_MS;
    return Number.isNaN(ms) ? null : new Date(ms);
  }
  if (HAS_ZONE_RE.test(s)) {
    // Normalise "2026-10-10 20:00+06:00" (space) for Safari.
    const t = Date.parse(s.replace(" ", "T"));
    return Number.isNaN(t) ? null : new Date(t);
  }
  return null;
}

/** Format a Date as a `datetime-local` value in Bangladesh time. */
export function toDhakaInputValue(date: Date): string {
  const d = new Date(date.getTime() + DHAKA_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Normalise any stored value to what a `datetime-local` input accepts
 * (Bangladesh time). Unparseable values are returned unchanged. */
export function storedToDhakaInput(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const d = parseDhakaDateTime(s);
  return d ? toDhakaInputValue(d) : s;
}

/** "true"/"1"/"yes"/"on" → true, "false"/"0"/"no"/"off" → false,
 * anything else (missing/blank) → fallback. */
export function parseBoolSetting(raw: string | boolean | null | undefined, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  const s = (raw ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(s)) return true;
  if (["false", "0", "no", "off"].includes(s)) return false;
  return fallback;
}

/** End of the Bangladesh-time week (Sunday 23:59:59.999 Asia/Dhaka) that
 * contains `at` — the legacy default when the admin leaves End blank. */
export function weeklyEndDhaka(at: number): Date {
  const local = new Date(at + DHAKA_OFFSET_MS);
  const day = local.getUTCDay();
  const add = day === 0 ? 0 : 7 - day;
  const ms = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + add, 23, 59, 59, 999);
  return new Date(ms - DHAKA_OFFSET_MS);
}

export type FlashSaleState = "off" | "scheduled" | "live" | "expired" | "invalid";

export interface FlashSaleStatus {
  state: FlashSaleState;
  enabled: boolean;
  start: Date | null;
  /** Effective end (admin value, or the weekly default when blank). */
  end: Date | null;
  /** True when End was left blank and the weekly default is used. */
  endIsDefault: boolean;
  /** A non-blank start/end that could not be read. */
  badStart: boolean;
  badEnd: boolean;
  /** ms until the state next changes (start or end), null when it never will. */
  msUntilChange: number | null;
}

export const FLASH_SALE_KEYS = {
  enabled: "feature_flash_sale",
  start: "flash_sale_start",
  end: "flash_sale_end",
} as const;

/**
 * Decide the flash-sale state from raw settings at time `now`.
 * - OFF switch → "off" (missing flag = ON, matching the backend default).
 * - Unreadable End → "invalid" (never shown; previously fell back silently).
 * - End not after Start → "invalid".
 */
export function getFlashSaleStatus(settings: Record<string, string | undefined>, now: number): FlashSaleStatus {
  const enabled = parseBoolSetting(settings[FLASH_SALE_KEYS.enabled], true);
  const rawStart = (settings[FLASH_SALE_KEYS.start] ?? "").trim();
  const rawEnd = (settings[FLASH_SALE_KEYS.end] ?? "").trim();
  const start = parseDhakaDateTime(rawStart);
  const explicitEnd = parseDhakaDateTime(rawEnd);
  const badStart = !!rawStart && !start;
  const badEnd = !!rawEnd && !explicitEnd;
  const endIsDefault = !rawEnd;
  const end = explicitEnd ?? (endIsDefault ? weeklyEndDhaka(Math.max(now, start?.getTime() ?? now)) : null);

  const base = { enabled, start, end, endIsDefault, badStart, badEnd };
  if (!enabled) return { ...base, state: "off", msUntilChange: null };
  if (badStart || badEnd || !end || (start && end.getTime() <= start.getTime())) {
    return { ...base, state: "invalid", msUntilChange: null };
  }
  if (start && now < start.getTime()) {
    return { ...base, state: "scheduled", msUntilChange: start.getTime() - now };
  }
  if (now < end.getTime()) return { ...base, state: "live", msUntilChange: end.getTime() - now };
  return { ...base, state: "expired", msUntilChange: null };
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const toBnDigits = (v: number | string) => String(v).replace(/\d/g, (d) => BN_DIGITS[+d]);

/** "২ দিন ৩ ঘণ্টা", "২ ঘণ্টা ১০ মিনিট", "৫ মিনিট", "১ মিনিটের কম". */
export function formatDurationBn(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / 60_000);
  if (totalMin < 1) return "১ মিনিটের কম";
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const parts: string[] = [];
  if (d) parts.push(`${toBnDigits(d)} দিন`);
  if (h) parts.push(`${toBnDigits(h)} ঘণ্টা`);
  if (m && !d) parts.push(`${toBnDigits(m)} মিনিট`);
  return parts.join(" ");
}

/** "১০ অক্টোবর ২০২৬, রাত ৮:০০" style Bangladesh-time label. */
export function formatDhakaBn(date: Date): string {
  const months = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const d = new Date(date.getTime() + DHAKA_OFFSET_MS);
  const h24 = d.getUTCHours();
  const period = h24 < 4 ? "রাত" : h24 < 12 ? "সকাল" : h24 < 15 ? "দুপুর" : h24 < 18 ? "বিকাল" : h24 < 20 ? "সন্ধ্যা" : "রাত";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${toBnDigits(d.getUTCDate())} ${months[d.getUTCMonth()]} ${toBnDigits(d.getUTCFullYear())}, ${period} ${toBnDigits(h12)}:${toBnDigits(min)}`;
}

/** One-line Bangla status for the admin panel. */
export function describeFlashSaleBn(s: FlashSaleStatus, now: number): string {
  switch (s.state) {
    case "off":
      return "বন্ধ — হোমপেজে দেখাবে না";
    case "invalid":
      if (s.badStart || s.badEnd) return "তারিখ বোঝা যাচ্ছে না — শুরু/শেষ আবার নির্বাচন করুন";
      return "ভুল সময় — শেষের সময় শুরুর পরে হতে হবে";
    case "scheduled":
      return `শুরু হবে ${formatDurationBn(s.start!.getTime() - now)} পরে (${formatDhakaBn(s.start!)})`;
    case "live":
      return `এখন চলছে — শেষ হবে ${formatDurationBn(s.end!.getTime() - now)} পরে (${formatDhakaBn(s.end!)})${s.endIsDefault ? " · শেষ খালি, তাই সপ্তাহের শেষ" : ""}`;
    case "expired":
      return `মেয়াদ শেষ (${formatDhakaBn(s.end!)}) — নতুন শেষ সময় দিন`;
  }
}
