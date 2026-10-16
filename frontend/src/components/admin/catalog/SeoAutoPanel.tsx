"use client";

import { Wand2 } from "lucide-react";
import { stripMarks } from "@/lib/productText";

export const plainText = stripMarks;

/**
 * Google-style preview + one button that fills SEO title, description and
 * keywords from the name, description and tags. Leaving them blank is fine
 * too — the site falls back to the same values.
 */
export default function SeoAutoPanel({ name, desc, tags, path, title, description, keywords, onChange }: {
  name: string;
  desc: string;
  tags: string[];
  path: string;
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  onChange: (v: { seo_title: string; seo_description: string; seo_keywords: string }) => void;
}) {
  const autoTitle = name ? `${name} | ABO Enterprise`.slice(0, 70) : "";
  const cleanDesc = plainText(desc);
  const autoDesc = cleanDesc.length > 158 ? `${cleanDesc.slice(0, 155).replace(/\s+\S*$/, "")}…` : cleanDesc;
  const autoKeys = Array.from(new Set([...tags, ...name.split(/[\s,|/]+/).filter((w) => w.length > 2)].map((t) => t.trim()).filter(Boolean))).slice(0, 15).join(", ");
  const shownTitle = (title || "").trim() || autoTitle || "পণ্য/সেবার নাম | ABO Enterprise";
  const shownDesc = (description || "").trim() || autoDesc || "বিবরণ লিখলে এখানে দেখাবে।";
  const fill = () => {
    const filled = (title || "").trim() || (description || "").trim() || (keywords || "").trim();
    if (filled && !window.confirm("আগের SEO লেখা নতুন করে তৈরি করা লেখা দিয়ে বদলে দেবেন?")) return;
    onChange({ seo_title: autoTitle, seo_description: autoDesc, seo_keywords: autoKeys });
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">🔎 Google-এ যেমন দেখাবে <span className="font-normal text-gray-400">— খালি রাখলেও চলবে, নাম ও বিবরণ নিজে থেকে ব্যবহার হয়</span></p>
        <button type="button" onClick={fill} className="btn btn-outline btn-sm gap-1.5 min-h-10"><Wand2 className="w-4 h-4" /> নিজে থেকে পূরণ</button>
      </div>
      <div className="admin-surface rounded-xl border border-[var(--line)] bg-white dark:bg-white/5 p-3">
        <p className="text-[12px] text-emerald-700 dark:text-emerald-400 truncate">aboenterprise.com{path}</p>
        <p className="text-[17px] leading-snug text-blue-700 dark:text-blue-400 line-clamp-2">{shownTitle}</p>
        <p className="text-[13px] text-gray-600 dark:text-gray-300 line-clamp-2">{shownDesc}</p>
      </div>
      <p className="text-[11px] text-gray-400">শিরোনাম {shownTitle.length}/60 · বিবরণ {shownDesc.length}/160 অক্ষর</p>
    </div>
  );
}
