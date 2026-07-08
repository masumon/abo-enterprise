const TOKEN_KEY = "abo_admin_token";
// Non-sensitive marker cookie: tells the Next.js middleware an HttpOnly
// cookie session exists on the API domain (the JWT itself never touches JS).
const AUTH_MARKER = "abo_admin_auth";
const COOKIE_MAX_AGE = 86400;

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Cookie-session mode: JWT lives only in the API's HttpOnly cookie. */
export function setAdminAuthMarker(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${AUTH_MARKER}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function hasAdminAuthMarker(): boolean {
  if (typeof window === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${AUTH_MARKER}=`));
}

/** Re-sync middleware cookie when localStorage still has a valid token. */
export function syncAdminTokenCookie(): void {
  const token = getAdminToken();
  if (token) setAdminToken(token);
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${AUTH_MARKER}=; path=/; max-age=0`;
}

export function isAdminProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
}
