"use client";

import { useEffect, useState } from "react";
import { productsApi } from "@/lib/api";
import { describeFlashSaleBn, getFlashSaleStatus, toBnDigits, type FlashSaleState } from "@/lib/flashSale";
import { cn } from "@/lib/utils";

const TONE: Record<FlashSaleState, string> = {
  live: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  scheduled: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  expired: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  invalid: "bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  off: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10",
};

/** Live Bangla status line for the flash-sale form (reflects what is typed;
 * the website follows it after Save). Also warns when no product is
 * currently in the flash sale — the homepage band needs at least one. */
export default function FlashSaleAdminStatus({ values }: { values: Record<string, string> }) {
  const [now, setNow] = useState(() => Date.now());
  const [liveProducts, setLiveProducts] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    productsApi
      .list({ flash_sale: true, per_page: 1, page: 1 })
      .then((r) => setLiveProducts(r.data.meta?.total ?? (r.data.data ?? []).length))
      .catch(() => setLiveProducts(null));
  }, []);

  const status = getFlashSaleStatus(values, now);
  return (
    <div className="space-y-1.5" aria-live="polite">
      <p className={cn("text-sm font-semibold px-3 py-2 rounded-lg border", TONE[status.state])}>
        {describeFlashSaleBn(status, now)}
      </p>
      {liveProducts === 0 && status.state !== "off" && (
        <p className="text-xs px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
          এখন কোনো পণ্য ফ্ল্যাশ সেলে নেই, তাই হোমপেজে সেকশনটি দেখাবে না। Products → পণ্য এডিট করে &quot;Flash Sale&quot; টিক, ফ্ল্যাশ সেল দাম (মূল দামের চেয়ে কম) ও শেষ সময় দিন।
        </p>
      )}
      {liveProducts !== null && liveProducts > 0 && (
        <p className="text-xs text-muted px-1">ফ্ল্যাশ সেলে এখন {toBnDigits(liveProducts)}টি পণ্য আছে।</p>
      )}
    </div>
  );
}
