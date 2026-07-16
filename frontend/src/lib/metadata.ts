import type { Metadata } from "next";
import { SITE_URL } from "@/lib/tokens";

export function pageMeta(
  title: string,
  description: string,
  path?: string,
  opts?: { noindex?: boolean }
): Metadata {
  return {
    title,
    description,
    alternates: path ? { canonical: `${SITE_URL}${path}` } : undefined,
    robots: opts?.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${title} | ABO Enterprise`,
      description,
      url: path ? `${SITE_URL}${path}` : SITE_URL,
    },
  };
}

/** Serialize JSON-LD for a <script> tag — escapes `<` so content can never
 * break out via a `</script>` sequence (XSS hardening). */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
