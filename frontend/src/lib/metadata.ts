import type { Metadata } from "next";
import { SITE_URL } from "@/lib/tokens";

export function pageMeta(
  title: string,
  description: string,
  path?: string
): Metadata {
  return {
    title,
    description,
    alternates: path ? { canonical: `${SITE_URL}${path}` } : undefined,
    openGraph: {
      title: `${title} | ABO Enterprise`,
      description,
      url: path ? `${SITE_URL}${path}` : SITE_URL,
    },
  };
}
