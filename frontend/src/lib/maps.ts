/** Business location defaults — used when CMS settings are empty */
export const DEFAULT_ADDRESS_BN =
  "হাজী বাহার উদ্দিন মার্কেট, আব্দুল্লাপুর, বৈরাগীবাজার-৩১৭০, বিয়ানীবাজার, সিলেট, বাংলাদেশ";
export const DEFAULT_ADDRESS_EN =
  "Hazi Bahar Uddin Market, Abdullapur, Bairagibazar-3170, Beanibazar, Sylhet, Bangladesh";

export const BUSINESS_LOCATION = {
  name: "ABO Enterprise",
  address: DEFAULT_ADDRESS_EN,
  lat: 24.8531558,
  lng: 92.1548483,
} as const;

/** Contact defaults — shown on invoices/receipts when CMS settings are empty */
export const DEFAULT_BUSINESS_PHONE = "+880 1825 007977";
export const DEFAULT_BUSINESS_EMAIL = "abo.enterprise@gmail.com";

/** Google Maps embed — ABO Enterprise, Beanibazar (admin can override) */
export const DEFAULT_MAPS_EMBED =
  "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14481.252168680774!2d92.1548483!3d24.8531558!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3751cb8f6e28ada5%3A0xaa987532ec744f22!2zQUJPIEVudGVycHJpc2Ug4KaP4Kas4Ka_4KaTIOCmj-CmqOCnjeCmn-CmvuCmsOCmquCnjeCmsOCmvuCmh-CmnA!5e0!3m2!1sen!2sbd!4v1782852750035!5m2!1sen!2sbd";

const IFRAME_SRC_RE = /<iframe[^>]+src=["']([^"']+)["']/i;
const GOOGLE_MAPS_HOSTS = ["google.com", "www.google.com", "maps.google.com"];

/** Accept embed URL or full `<iframe …>` HTML from Google Maps → Share → Embed */
export function parseGoogleMapsEmbedInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let candidate = trimmed;

  if (trimmed.includes("<iframe") || trimmed.startsWith("<")) {
    const match = trimmed.match(IFRAME_SRC_RE);
    if (!match?.[1]) return null;
    candidate = match[1].replace(/&amp;/g, "&").trim();
  }

  try {
    const url = new URL(candidate);
    const hostOk = GOOGLE_MAPS_HOSTS.some(
      (h) => url.hostname === h || url.hostname.endsWith(`.${h}`)
    );
    if (!hostOk) return null;
    if (!url.pathname.includes("/maps/embed")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Resolve CMS value — handles legacy iframe HTML saved before normalization */
export function resolveGoogleMapsEmbed(raw: string | undefined, fallback: string = DEFAULT_MAPS_EMBED): string {
  const parsed = parseGoogleMapsEmbedInput(raw ?? "");
  return parsed ?? fallback;
}

export function mapsPlaceUrl(query: string = BUSINESS_LOCATION.address): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Open the same place as admin embed URL (Share → Embed in Google Maps). */
export function mapsViewUrlFromEmbed(raw: string | undefined): string | null {
  const parsed = parseGoogleMapsEmbedInput(raw ?? "");
  if (!parsed) return null;
  return parsed.replace("/maps/embed", "/maps");
}

/** Prefer admin embed → default embed pin → address text search. */
export function resolveGoogleMapsLink(
  embedRaw: string | undefined,
  address: string = BUSINESS_LOCATION.address
): string {
  const embed = resolveGoogleMapsEmbed(embedRaw);
  return embed.replace("/maps/embed", "/maps") || mapsPlaceUrl(address);
}

export function mapsDirectionsUrl(_query: string = BUSINESS_LOCATION.address): string {
  const { lat, lng } = BUSINESS_LOCATION;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
