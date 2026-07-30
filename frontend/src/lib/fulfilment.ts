import type { Language } from "@/types";

/**
 * GAP-15 — the catalogue said what a service costs and how it is started, but
 * never where it is completed. Passport photos, biometric capture, document
 * verification and mobile servicing all need the customer in the shop; a
 * customer who books one of those online and waits at home is waiting for
 * something that cannot arrive.
 *
 * `fulfilment` (manual_sql/0008) is nullable and stays null on every existing
 * row, so a service the admin has not classified says nothing at all rather
 * than guessing — a wrong promise is worse than no promise.
 */
export type Fulfilment = "remote" | "at_shop" | "hybrid";

const COPY: Record<Fulfilment, { en: string; bn: string; detail: { en: string; bn: string } }> = {
  remote: {
    en: "Online — no visit needed",
    bn: "অনলাইনে — আসতে হবে না",
    detail: {
      en: "We complete this without you coming in. We'll contact you on the number you give us.",
      bn: "এই সেবার জন্য দোকানে আসতে হবে না। আপনার দেওয়া নম্বরে আমরা যোগাযোগ করব।",
    },
  },
  at_shop: {
    en: "Visit required",
    bn: "দোকানে আসতে হবে",
    detail: {
      en: "This one has to be done in person at our shop. Book a time first so you are not kept waiting.",
      bn: "এই সেবা দোকানে এসে করতে হয়। আগে সময় বুক করুন, তাহলে অপেক্ষা করতে হবে না।",
    },
  },
  hybrid: {
    en: "Partly at the shop",
    bn: "আংশিক দোকানে",
    detail: {
      en: "We start this online and finish the rest at the shop. We'll tell you exactly when to come.",
      bn: "কাজ অনলাইনে শুরু হয়, বাকিটা দোকানে। কখন আসতে হবে আমরা জানিয়ে দেব।",
    },
  },
};

export function isFulfilment(value: unknown): value is Fulfilment {
  return value === "remote" || value === "at_shop" || value === "hybrid";
}

/** Short badge label. Returns null when the service is unclassified. */
export function fulfilmentLabel(value: unknown, lang: Language): string | null {
  if (!isFulfilment(value)) return null;
  return lang === "bn" ? COPY[value].bn : COPY[value].en;
}

/** One-sentence explanation for detail pages and the booking form. */
export function fulfilmentDetail(value: unknown, lang: Language): string | null {
  if (!isFulfilment(value)) return null;
  return lang === "bn" ? COPY[value].detail.bn : COPY[value].detail.en;
}
