/** Single source of truth for the backend API base URL (Render / local). */
export const PRODUCTION_API_URL = "https://abo-enterprise.onrender.com";

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : "http://localhost:8000")
  );
}
