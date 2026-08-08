/** Recent searches, kept on the device only (localStorage). Newest first,
 * de-duplicated (case-insensitive), capped — never sent anywhere. */
const KEY = "abo-recent-searches";
const MAX = 5;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string): void {
  if (typeof window === "undefined") return;
  const t = term.trim();
  if (t.length < 2) return;
  try {
    const cur = getRecentSearches().filter((x) => x.toLowerCase() !== t.toLowerCase());
    const next = [t, ...cur].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full / disabled — recent searches are best-effort */
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
