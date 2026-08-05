/** Pure settings-lookup helper — no React import, so it's safe to use from
 * Server Components (unlike @/hooks/usePublicSettings, which pulls in
 * useEffect/useState and taints any server-side importer as client-only). */
export function getSettingValue(
  settings: Record<string, string>,
  key: string,
  fallback = ""
): string {
  const v = settings[key];
  return v && v !== "***HIDDEN***" ? v : fallback;
}
