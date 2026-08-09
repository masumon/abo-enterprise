import { getApiBaseUrl } from "@/lib/apiBase";

/** Server-side public settings (short-lived cache). */
export async function fetchPublicSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/settings`, {
      // Keep a short cache to reduce Render Free-tier traffic while making
      // admin CMS changes visible much sooner than the previous 5-minute window.
      next: { revalidate: 60 },
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
