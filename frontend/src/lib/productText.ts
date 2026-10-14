/**
 * Turns an admin-typed product description into paragraphs and bullet lists.
 * Blank lines separate paragraphs; lines starting with "•", "-", "*", "✓" or
 * "✔" become bullet points. Plain text only — never HTML.
 */
export type DescBlock = { type: "p"; text: string } | { type: "ul"; items: string[] };

const BULLET = /^\s*(?:[•\-*✓✔▪●◦]|\d+[.)])\s+/;

export function parseDescription(text?: string | null, keepLines = false): DescBlock[] {
  if (!text) return [];
  const blocks: DescBlock[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(keepLines ? "\n" : " ") });
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

/**
 * Repairs half-typed bold marks such as "*Colour print:**" (one star at the
 * start) into "**Colour print:**", so the page shows bold text, not stars.
 */
export function fixBoldMarks(text: string): string {
  return text.replace(/(^|\n)(\s*)\*(?!\*|\s)([^*\n]+?)\*\*/g, "$1$2**$3**");
}

/** Splits a line into plain and **bold** runs (text only, never HTML). */
export function boldRuns(text: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = [];
  const re = /\*\*([^*\n]+?)\*\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false });
  return out;
}

/** Spec rows from the `specifications` JSON, skipping empty values. */
export function specRows(specs?: Record<string, unknown> | null): [string, string][] {
  if (!specs || typeof specs !== "object") return [];
  return Object.entries(specs)
    .map(([k, v]) => [k.trim(), v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v).trim()] as [string, string])
    .filter(([k, v]) => k && v);
}

/** Plain text from rich-text marks — for cards, meta descriptions and SEO. */
export function stripMarks(s?: string | null): string {
  return (s ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\{\/?(?:red|green|blue|orange|purple|brand|gray|big|small|center)\}|:[a-z]+:|\*\*|==/g, "")
    .replace(/^\s*(?:#{1,3}\s+|>\s?|-{3,}\s*$)/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
