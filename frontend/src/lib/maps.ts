/** Business location defaults — used when CMS settings are empty */
export const BUSINESS_LOCATION = {
  name: "ABO Enterprise",
  address: "Hazi Bahar Uddin Market, Sylhet-3170, Bangladesh",
  /** Ambarkhana, Sylhet — near Hazi Bahar Uddin Market */
  lat: 24.897,
  lng: 91.8705,
} as const;

/** Google Maps embed URL (no API key required) */
export const DEFAULT_MAPS_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7241.5!2d91.8705!3d24.897!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x375029b0c9e5f0a5%3A0x8dfd1bd2e54e9c5!2sHazi%20Bahar%20Uddin%20Market%2C%20Ambarkhana%2C%20Sylhet!5e0!3m2!1sen!2sbd!4v1719590400000!5m2!1sen!2sbd";

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

export function mapsDirectionsUrl(query: string = BUSINESS_LOCATION.address): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}
