"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GitCompare, X, ShoppingCart } from "lucide-react";
import { useCompareStore } from "@/store/compare";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";
import PageHero from "@/components/ui/PageHero";

export default function ComparePage() {
  const { items, remove, clear } = useCompareStore();
  const { lang } = useLanguageStore();
  const { addItem, openCart } = useCartStore();
  /**
   * GAP-19 — with four products the table is wider than a phone, so comparing
   * meant scrolling sideways while the label column ("Stock", "Category", each
   * spec) scrolled out of view. Values arrived stripped of the thing they were
   * values of, which is the one job a comparison table has.
   *
   * Below md the visitor picks two products and compares those; from md up the
   * full table is unchanged. Nothing is removed from the comparison — the pair
   * is a view of the same store, and switching either side is one tap.
   */
  const [pairA, setPairA] = useState(0);
  const [pairB, setPairB] = useState(1);

  if (items.length === 0) {
    return (
      <main className="min-h-screen">
        <PageHero
          pageKey="compare"
          align="center"
          title={lang === "bn" ? "তুলনা খালি" : "Compare is empty"}
          subtitle={lang === "bn" ? "পণ্য যোগ করে তুলনা শুরু করুন" : "Add products to start comparing"}
        />
        <div className="text-center py-12 px-4">
          <GitCompare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <Link href="/products" className="btn btn-brand btn-md mt-4 inline-flex">{lang === "bn" ? "পণ্য দেখুন" : "Browse Products"}</Link>
        </div>
      </main>
    );
  }

  const specs = Array.from(new Set(items.flatMap((p) => Object.keys(p.specifications ?? {}))));

  // Indices are clamped rather than synced in an effect: an item removed from
  // the store must never leave the pair pointing past the end of the list.
  const idxA = Math.min(pairA, items.length - 1);
  const idxB = Math.min(pairB, items.length - 1);
  const pair = idxA === idxB ? [items[idxA]] : [items[idxA], items[idxB]];

  // Called as a plain function, not rendered as a component, so React keeps
  // reconciling the same tree instead of remounting the table on every render.
  const renderTable = (list: typeof items) => (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className="text-left p-3" />
          {list.map((p) => (
            <th key={p.slug} className="p-3 align-top min-w-[180px]">
              <GlassCard className="p-3">
                <button type="button" onClick={() => remove(p.id ?? p.slug)} className="float-right text-gray-400" aria-label={lang === "bn" ? "সরান" : "Remove"}><X className="w-4 h-4" /></button>
                <div className="relative w-full h-28 rounded-lg overflow-hidden bg-brand-50 mb-2">
                  {p.image_url && <Image src={p.image_url} alt="" fill className="object-cover" sizes="180px" />}
                </div>
                <Link href={`/products/${p.slug}`} className="font-semibold text-brand-700 hover:underline line-clamp-2">
                  {lang === "bn" ? p.name_bn : p.name_en}
                </Link>
                <p className="text-accent-600 font-bold mt-1">{formatPrice(p.price)}</p>
                <button
                  type="button"
                  onClick={() => { addItem({ product_id: p.id ?? p.slug, name_en: p.name_en, name_bn: p.name_bn, price: p.price, image_url: p.image_url }); openCart(); }}
                  className="btn btn-brand btn-sm w-full mt-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {lang === "bn" ? "কার্টে" : "Add"}
                </button>
              </GlassCard>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="border-t border-gray-100 dark:border-white/10">
          <td className="p-3 font-medium">{lang === "bn" ? "স্টক" : "Stock"}</td>
          {list.map((p) => (
            <td key={p.slug} className="p-3 text-center">{(p.stock_quantity ?? 0) > 0 ? "✓" : "✗"}</td>
          ))}
        </tr>
        <tr className="border-t border-gray-100 dark:border-white/10">
          <td className="p-3 font-medium">{lang === "bn" ? "ক্যাটাগরি" : "Category"}</td>
          {list.map((p) => <td key={p.slug} className="p-3 text-center capitalize">{p.category}</td>)}
        </tr>
        {specs.map((key) => (
          <tr key={key} className="border-t border-gray-100 dark:border-white/10">
            <td className="p-3 font-medium">{key}</td>
            {list.map((p) => (
              <td key={p.slug} className="p-3 text-center">{p.specifications?.[key] ?? "—"}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const pairPicker = (value: number, onChange: (i: number) => void, label: string) => (
    <label className="flex-1 min-w-0 text-xs font-semibold text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input mt-1 w-full text-sm"
      >
        {items.map((p, i) => (
          <option key={p.slug} value={i}>{lang === "bn" ? p.name_bn : p.name_en}</option>
        ))}
      </select>
    </label>
  );

  return (
    <main className="min-h-screen">
      <PageHero
        pageKey="compare"
        title={lang === "bn" ? "পণ্য তুলনা" : "Compare Products"}
        subtitle={lang === "bn" ? `${items.length}টি পণ্য তুলনায়` : `${items.length} products in comparison`}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "তুলনা" : "Compare" },
        ]}
      />
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <div className="flex items-center justify-end mb-6">
          <button type="button" onClick={clear} className="text-sm text-red-500 hover:underline">{lang === "bn" ? "সব মুছুন" : "Clear all"}</button>
        </div>
        {/* Below md: pick two and compare those, so the label column stays on
            screen. From md up: the full table, unchanged. */}
        {items.length > 1 && (
          <div className="md:hidden flex gap-3 mb-4">
            {pairPicker(idxA, setPairA, lang === "bn" ? "প্রথম" : "First")}
            {pairPicker(idxB, setPairB, lang === "bn" ? "দ্বিতীয়" : "Second")}
          </div>
        )}
        <div className="md:hidden overflow-x-auto">
          {renderTable(pair)}
        </div>
        <div className="hidden md:block overflow-x-auto">
          {renderTable(items)}
        </div>
      </div>
    </main>
  );
}
