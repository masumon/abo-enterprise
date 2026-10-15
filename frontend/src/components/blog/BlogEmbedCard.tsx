"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getBrowserApiBaseUrl } from "@/lib/apiBase";
import { formatPrice } from "@/lib/utils";

/** A product or service shown as a card inside / under a blog post. */
export type EmbedItem = {
  kind: "product" | "service";
  slug: string;
  name_bn?: string | null;
  name_en?: string | null;
  image?: string | null;
  price?: number | null;
};

/** Turns a raw product/service API row into an EmbedItem. */
export function toEmbed(kind: EmbedItem["kind"], r: Record<string, unknown>): EmbedItem {
  const imgs = r.images as string[] | undefined;
  return {
    kind,
    slug: String(r.slug ?? ""),
    name_bn: (r.name_bn as string) ?? null,
    name_en: (r.name_en as string) ?? null,
    image: (r.image_url as string) || (imgs && imgs[0]) || (r.featured_image_url as string) || (r.icon_url as string) || null,
    price: (r.price as number) ?? (r.base_price as number) ?? (r.min_price as number) ?? null,
  };
}

export function EmbedCard({ item, lang }: { item: EmbedItem; lang: "bn" | "en" }) {
  const name = (lang === "bn" ? item.name_bn : item.name_en) || item.name_en || item.name_bn || item.slug;
  const href = `/${item.kind === "product" ? "products" : "services"}/${item.slug}`;
  return (
    <Link href={href} className="not-prose flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 my-4 hover:border-brand-300 hover:shadow-md transition no-underline">
      <span className="relative w-20 h-20 flex-none rounded-xl overflow-hidden bg-brand-50">
        {item.image && <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-medium text-brand-700">{item.kind === "product" ? (lang === "bn" ? "পণ্য" : "Product") : (lang === "bn" ? "সেবা" : "Service")}</span>
        <span className="block font-semibold text-heading truncate">{name}</span>
        {item.price != null && Number(item.price) > 0 && <span className="block text-sm text-gray-700 dark:text-gray-300">{formatPrice(Number(item.price))}</span>}
      </span>
      <span className="flex-none inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
        {lang === "bn" ? "দেখুন" : "View"} <ArrowRight aria-hidden className="w-4 h-4" />
      </span>
    </Link>
  );
}

/** Card for a link written on its own line in the article (fetched in the browser). */
export default function BlogEmbedCard({ kind, slug, lang }: { kind: EmbedItem["kind"]; slug: string; lang: "bn" | "en" }) {
  const [item, setItem] = useState<EmbedItem | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let off = false;
    fetch(`${getBrowserApiBaseUrl()}/api/v1/${kind === "product" ? "products" : "services"}/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { if (!off && j?.data) setItem(toEmbed(kind, j.data)); else if (!off) setFailed(true); })
      .catch(() => { if (!off) setFailed(true); });
    return () => { off = true; };
  }, [kind, slug]);
  const href = `/${kind === "product" ? "products" : "services"}/${slug}`;
  if (failed) return <p><Link href={href} className="text-brand-600 underline">{href}</Link></p>;
  if (!item) return <div className="h-[6.5rem] my-4 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" aria-hidden />;
  return <EmbedCard item={item} lang={lang} />;
}

/** Lines that are only a product/service link (absolute or relative) become cards. */
const LINE = /^\s*(?:https?:\/\/(?:www\.)?aboenterprise\.com)?\/(products|services)\/([a-z0-9][a-z0-9\-/]*?)\/?\s*$/i;

export function splitEmbeds(text: string): Array<{ text: string } | { kind: EmbedItem["kind"]; slug: string }> {
  const out: Array<{ text: string } | { kind: EmbedItem["kind"]; slug: string }> = [];
  let buf: string[] = [];
  for (const line of (text || "").split("\n")) {
    const m = line.match(LINE);
    if (m) {
      if (buf.length) out.push({ text: buf.join("\n") });
      buf = [];
      const segs = m[2].split("/").filter(Boolean);
      out.push({ kind: m[1].toLowerCase() === "products" ? "product" : "service", slug: segs[segs.length - 1] });
    } else {
      buf.push(line);
    }
  }
  if (buf.length) out.push({ text: buf.join("\n") });
  return out;
}
