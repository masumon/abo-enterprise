"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import api, { combosApi, productsApi, promoSlidesApi, reviewsApi } from "@/lib/api";
import { getFlashSaleStatus, parseBoolSetting } from "@/lib/flashSale";
import { getAnnouncements, getClientLogos } from "@/lib/cmsContent";
import { MIN_REVIEWS_TO_SHOW } from "@/components/home/CustomerReviews";

/** "What is showing on the website right now?" — every homepage section that can
 * hide itself, with the reason and a button to fix it. Uses the same public data
 * and the same rules as the website, so it never disagrees with what visitors see. */
type Row = { name: string; state: "on" | "off" | "info"; why: string; href: string; fix: string };

const bn = (n: number) => n.toLocaleString("bn-BD");
const total = (r: { data: { meta?: { total?: number }; data?: unknown } }) =>
  r.data.meta?.total ?? (Array.isArray(r.data.data) ? r.data.data.length : 0);

export default function WebsiteSectionsStatus() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    // Any failure (even a synchronous one) just counts as "no data" — the card never breaks the dashboard.
    const safe = <T,>(fn: () => Promise<T>) => Promise.resolve().then(fn).catch(() => null);
    Promise.all([
      safe(() => api.get<{ data: Record<string, string> }>("/api/v1/settings")),
      safe(() => reviewsApi.list({ featured: true, per_page: 1 })),
      safe(() => productsApi.list({ featured: true, per_page: 1 })),
      safe(() => productsApi.list({ flash_sale: true, per_page: 1 })),
      safe(() => combosApi.list()),
      safe(() => promoSlidesApi.list("hero")),
    ]).then(([st, rv, fp, fs, cb, hs]) => {
      const s = st?.data?.data ?? {};
      const reviews = rv ? total(rv) : 0;
      const featured = fp ? total(fp) : 0;
      const flashProducts = fs ? total(fs) : 0;
      const combos = cb?.data?.data?.length ?? 0;
      const heroSlides = hs?.data?.data?.length ?? 0;
      const flash = getFlashSaleStatus(s, Date.now());
      const logos = getClientLogos(s, []).filter((c) => !(c.image ?? "").includes("images.unsplash.com")).length;
      const ann = getAnnouncements(s, []);
      const annActive = ann.filter((a) => a.active !== false).length;
      const aponHome = parseBoolSetting(s.apon_enabled, false) && parseBoolSetting(s.apon_show_home, true);

      const flashWhy =
        flash.state === "off" ? "সুইচ বন্ধ আছে" :
        flash.state === "expired" ? "শেষের সময় পার হয়ে গেছে — নতুন সময় দিন" :
        flash.state === "scheduled" ? "শুরুর সময় এখনো আসেনি" :
        flash.state === "invalid" ? "শুরু/শেষের সময় ঠিক নেই" :
        flashProducts === 0 ? "কোনো পণ্যে চালু ফ্ল্যাশ দাম নেই — অন্তত ১টি পণ্য লাগবে" :
        `${bn(flashProducts)}টি পণ্য ফ্ল্যাশ সেলে`;

      setRows([
        { name: "ফ্ল্যাশ সেল", state: flash.state === "live" && flashProducts > 0 ? "on" : "off", why: flashWhy, href: "/sumon/coupons#flash", fix: "ফ্ল্যাশ সেল" },
        { name: "গ্রাহক রিভিউ", state: reviews >= MIN_REVIEWS_TO_SHOW ? "on" : "off", why: reviews >= MIN_REVIEWS_TO_SHOW ? `${bn(reviews)}টি ফিচার্ড রিভিউ` : `ফিচার্ড রিভিউ ${bn(reviews)}টি — অন্তত ${bn(MIN_REVIEWS_TO_SHOW)}টি লাগবে`, href: "/sumon/reviews", fix: "রিভিউ" },
        { name: "কম্বো প্যাক", state: combos > 0 ? "on" : "off", why: combos > 0 ? `${bn(combos)}টি চালু কম্বো` : "কোনো চালু কম্বো নেই — অন্তত ১টি লাগবে", href: "/sumon/coupons#combos", fix: "কম্বো" },
        { name: "ফিচার্ড পণ্য", state: featured > 0 ? "on" : "off", why: featured > 0 ? `${bn(featured)}টি পণ্য ফিচার্ড` : "কোনো পণ্যে “ফিচার্ড” চালু নেই", href: "/sumon/products", fix: "পণ্য" },
        { name: "ক্লায়েন্ট লোগো", state: logos > 0 ? "on" : "off", why: logos > 0 ? `${bn(logos)}টি লোগো` : "আসল লোগো দেওয়া নেই — অন্তত ১টি লাগবে", href: "/sumon/about-trust", fix: "লোগো" },
        { name: "ঘোষণা বার", state: ann.length === 0 ? "info" : annActive > 0 ? "on" : "off", why: ann.length === 0 ? "নিজের ঘোষণা নেই — নমুনা লেখা দেখাচ্ছে" : annActive > 0 ? `${bn(annActive)}টি চালু ঘোষণা` : "সব ঘোষণা বন্ধ", href: "/sumon/announcements", fix: "ঘোষণা" },
        { name: "হিরো স্লাইড", state: heroSlides > 0 ? "on" : "info", why: heroSlides > 0 ? `${bn(heroSlides)}টি স্লাইড ঘুরছে` : "চালু স্লাইড নেই — হিরোর ছবি দেখাচ্ছে", href: "/sumon/promo-slides", fix: "স্লাইড" },
        { name: "আপন অ্যাপ ব্যান্ড", state: aponHome ? "on" : "off", why: aponHome ? "হোমপেজে দেখাচ্ছে" : "অ্যাপ বন্ধ বা হোমপেজে দেখানো বন্ধ", href: "/sumon/apon", fix: "অ্যাপ" },
      ]);
    });
  }, []);

  const hidden = rows?.filter((r) => r.state === "off").length ?? 0;

  return (
    <section className="admin-card p-4 sm:p-5 space-y-3" aria-labelledby="site-status-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="site-status-title" className="font-semibold text-gray-900 flex items-center gap-2"><Eye className="w-4 h-4 text-brand-600" aria-hidden /> ওয়েবসাইটে এখন কী দেখাচ্ছে</h2>
        {rows && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${hidden ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{hidden ? `${bn(hidden)}টি অংশ লুকানো` : "সব অংশ দেখাচ্ছে"}</span>}
      </div>
      <p className="text-xs text-gray-600">কিছু অংশ শর্ত পূরণ না হলে নিজে থেকেই লুকিয়ে থাকে। নিচে কারণ আর ঠিক করার বোতাম আছে।</p>
      {!rows ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500" aria-label="লোড হচ্ছে" /></div>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {rows.map((r) => (
            <li key={r.name} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.state === "off" ? "border-amber-200 bg-amber-50/50" : "border-gray-100"}`}>
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-none ${r.state === "on" ? "bg-emerald-50 text-emerald-600" : r.state === "off" ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-600"}`}>
                {r.state === "on" ? <CheckCircle2 className="w-5 h-5" aria-hidden /> : r.state === "off" ? <EyeOff className="w-5 h-5" aria-hidden /> : <Info className="w-5 h-5" aria-hidden />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{r.name} <span className="sr-only">— {r.state === "on" ? "দেখাচ্ছে" : r.state === "off" ? "লুকানো" : "তথ্য"}</span></span>
                <span className="block text-xs text-gray-600 break-words">{r.why}</span>
              </span>
              <Link href={r.href} className="btn btn-outline btn-sm min-h-11 flex-none">{r.state === "off" ? "ঠিক করুন" : "দেখুন"}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
