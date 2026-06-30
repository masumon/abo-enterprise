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

export function mapsPlaceUrl(query: string = BUSINESS_LOCATION.address): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsDirectionsUrl(query: string = BUSINESS_LOCATION.address): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}
