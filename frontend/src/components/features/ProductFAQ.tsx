"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

const FAQS = [
  { q: { en: "What is the delivery time?", bn: "ডেলিভারি কত দিনে?" }, a: { en: "Same-day in Sylhet, 2-3 days nationwide.", bn: "সিলেটে একই দিন, সারাদেশে ২–৩ দিন।" } },
  { q: { en: "Can I return this product?", bn: "রিটার্ন করা যাবে?" }, a: { en: "Defective items can be returned within 7 days.", bn: "ত্রুটিপূর্ণ পণ্য ৭ দিনের মধ্যে ফেরত যোগ্য।" } },
  { q: { en: "Is warranty available?", bn: "ওয়ারেন্টি আছে?" }, a: { en: "Manufacturer warranty applies where applicable.", bn: "প্রযোজ্য ক্ষেত্রে প্রস্তুতকারক ওয়ারেন্টি প্রযোজ্য।" } },
];

export default function ProductFAQ() {
  const { lang } = useLanguageStore();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold mb-4">{lang === "bn" ? "প্রশ্নোত্তর" : "FAQ"}</h2>
      <div className="space-y-2">
        {FAQS.map((item, i) => (
          <div key={i} className="glass rounded-xl overflow-hidden">
            <button type="button" onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left font-medium text-sm">
              {lang === "bn" ? item.q.bn : item.q.en}
              <ChevronDown className={cn("w-4 h-4 transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i && (
              <p className="px-4 pb-4 text-sm text-gray-500">{lang === "bn" ? item.a.bn : item.a.en}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
