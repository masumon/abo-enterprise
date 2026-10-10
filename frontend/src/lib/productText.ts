/**
 * Turns an admin-typed product description into paragraphs and bullet lists.
 * Blank lines separate paragraphs; lines starting with "•", "-", "*", "✓" or
 * "✔" become bullet points. Plain text only — never HTML.
 */
export type DescBlock = { type: "p"; text: string } | { type: "ul"; items: string[] };

const BULLET = /^\s*(?:[•\-*✓✔▪●◦]|\d+[.)])\s+/;

export function parseDescription(text?: string | null): DescBlock[] {
  if (!text) return [];
  const blocks: DescBlock[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "ul", items: list });
    list = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
    } else if (BULLET.test(line)) {
      flushPara();
      const item = line.replace(BULLET, "").trim();
      if (item) list.push(item);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** Spec rows from the `specifications` JSON, skipping empty values. */
export function specRows(specs?: Record<string, unknown> | null): [string, string][] {
  if (!specs || typeof specs !== "object") return [];
  return Object.entries(specs)
    .map(([k, v]) => [k.trim(), v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v).trim()] as [string, string])
    .filter(([k, v]) => k && v);
}
