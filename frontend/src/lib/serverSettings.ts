import { getApiBaseUrl } from "@/lib/apiBase";

/** Server-side public settings (cached). */
export async function fetchPublicSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/settings`, {
      // Cached for 5 min (Next data cache), so the backend is hit at most once
      // per window and identical calls in one request are de-duped. The short
      // timeout means even a momentarily slow backend can never hang page SSR
      // for long — we fall back to code defaults ({}) and render immediately.
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return {};
    const json = await res.json();
    return json.data ?? {};
  } catch {
    return {};
  }
}

export function settingValue(settings: Record<string, string>, key: string, fallback = ""): string {
  const v = settings[key];
  return v?.trim() ? v.trim() : fallback;
}
