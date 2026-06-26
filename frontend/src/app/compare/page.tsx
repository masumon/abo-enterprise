"use client";

import Link from "next/link";
import Image from "next/image";
import { GitCompare, X, ShoppingCart } from "lucide-react";
import { useCompareStore } from "@/store/compare";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";

export default function ComparePage() {
  const { items, remove, clear } = useCompareStore();
  const { lang } = useLanguageStore();
  const { addItem, openCart } = useCartStore();

  if (items.length === 0) {
    return (
      <main className="min-h-screen py-16 text-center px-4">
        <GitCompare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{lang === "bn" ? "তুলনা খালি" : "Compare is empty"}</h1>
        <Link href="/products" className="btn btn-brand btn-md mt-4 inline-flex">{lang === "bn" ? "পণ্য দেখুন" : "Browse Products"}</Link>
      </main>
    );
  }

  const specs = Array.from(new Set(items.flatMap((p) => Object.keys(p.specifications ?? {}))));

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-brand-600" />
            {lang === "bn" ? "পণ্য তুলনা" : "Compare Products"}
          </h1>
          <button type="button" onClick={clear} className="text-sm text-red-500 hover:underline">{lang === "bn" ? "সব মুছুন" : "Clear all"}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-3" />
                {items.map((p) => (
                  <th key={p.slug} className="p-3 align-top min-w-[180px]">
                    <GlassCard className="p-3">
                      <button type="button" onClick={() => remove(p.id ?? p.slug)} className="float-right text-gray-400"><X className="w-4 h-4" /></button>
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
                {items.map((p) => (
                  <td key={p.slug} className="p-3 text-center">{(p.stock_quantity ?? 0) > 0 ? "✓" : "✗"}</td>
                ))}
              </tr>
              <tr className="border-t border-gray-100 dark:border-white/10">
                <td className="p-3 font-medium">{lang === "bn" ? "ক্যাটাগরি" : "Category"}</td>
                {items.map((p) => <td key={p.slug} className="p-3 text-center capitalize">{p.category}</td>)}
              </tr>
              {specs.map((key) => (
                <tr key={key} className="border-t border-gray-100 dark:border-white/10">
                  <td className="p-3 font-medium">{key}</td>
                  {items.map((p) => (
                    <td key={p.slug} className="p-3 text-center">{p.specifications?.[key] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
