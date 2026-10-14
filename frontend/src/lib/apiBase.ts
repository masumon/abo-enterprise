/** Single source of truth for the backend API base URL (Render / local). */
export const PRODUCTION_API_URL = "https://api.aboenterprise.com";

/** Render origin. Server-side (Vercel → API) requests go straight here: one
 * hop fewer than via Cloudflare, and Cloudflare's bot checks never see
 * data-centre traffic. Browsers keep using PRODUCTION_API_URL (Cloudflare). */
export const RENDER_ORIGIN_URL = "https://abo-enterprise.onrender.com";

export function getApiBaseUrl(): string {
  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    return process.env.API_INTERNAL_URL || RENDER_ORIGIN_URL;
  }
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : "http://localhost:8000")
  );
}

/** The API origin the BROWSER uses (for preconnect hints rendered into HTML). */
export function getBrowserApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : "http://localhost:8000");
}
