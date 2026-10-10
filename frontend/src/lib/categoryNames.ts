/**
 * Duplicate-name check for the admin category manager. Names are compared
 * case-, space-, dash- and underscore-insensitively, against both the English
 * and the Bangla name, so "Fast Chargers", "fast-chargers" and "FastChargers"
 * count as the same.
 */
export function nameKey(v: string | null | undefined): string {
  return (v ?? "").normalize("NFC").toLocaleLowerCase().replace(/[\s\-_]+/g, "");
}

export interface NamedNode { id: string; name_en: string; name_bn?: string | null }

/** First existing node (other than `excludeId`) whose English or Bangla name
 * matches either of the given names, or null. Empty names never match. */
export function findDuplicateName<T extends NamedNode>(
  nodes: T[],
  names: { name_en?: string; name_bn?: string },
  excludeId?: string | null,
): T | null {
  const wanted = [nameKey(names.name_en), nameKey(names.name_bn)].filter(Boolean);
  if (!wanted.length) return null;
  for (const n of nodes) {
    if (excludeId && n.id === excludeId) continue;
    const have = [nameKey(n.name_en), nameKey(n.name_bn)].filter(Boolean);
    if (have.some((h) => wanted.includes(h))) return n;
  }
  return null;
}
