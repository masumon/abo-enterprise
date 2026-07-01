import { getApiBaseUrl } from "@/lib/apiBase";

/** Server-side public settings (cached). */
export async function fetchPublicSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/settings`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
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
