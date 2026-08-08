import { translateApi } from "@/lib/api";

/**
 * Translate Bangla → English via the shared admin endpoint.
 * Throws on failure so a caller never writes the source Bangla — or a failed
 * translation — into an English field. Empty input returns "".
 */
export async function translateBnToEn(text: string): Promise<string> {
  const t = (text ?? "").trim();
  if (!t) return "";
  const res = await translateApi.toEnglish(t);
  const out = res.data?.data?.translated?.trim();
  if (!out) throw new Error("Empty translation");
  return out;
}

/**
 * Auto-fill English fields from Bangla at save time. For each pair, translates
 * only when the English side is empty but the Bangla side has text, then calls
 * `set` with the result. Returns true if anything was translated. Throws if any
 * translation fails, so the caller can abort the save and prompt the admin.
 */
export async function autoFillEnglish(
  pairs: { bn?: string | null; en?: string | null; set: (v: string) => void }[],
): Promise<boolean> {
  let filled = false;
  for (const p of pairs) {
    const bn = (p.bn ?? "").trim();
    const en = (p.en ?? "").trim();
    if (bn && !en) {
      p.set(await translateBnToEn(bn));
      filled = true;
    }
  }
  return filled;
}
