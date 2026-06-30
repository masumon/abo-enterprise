"use client";

import Link from "next/link";
import { Home, Search } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NotFound() {
  const { lang } = useLanguageStore();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg w-full">
        <div className="enterprise-card p-10">
          <div className="text-7xl font-black text-brand-200 dark:text-brand-800 mb-4 select-none" aria-hidden>404</div>
          <h1 className="text-2xl font-bold text-heading mb-2">
            {lang === "bn" ? "পেজটি পাওয়া যায়নি" : "Page Not Found"}
          </h1>
          <p className="text-muted mb-8 text-sm">
            {lang === "bn"
              ? "লিংকটি ভাঙা হতে পারে বা পেজ সরানো হয়েছে।"
              : "The link may be broken or the page may have been removed."}
          </p>

          <form onSubmit={handleSearch} className="relative mb-6 max-w-sm mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "bn" ? "খুঁজুন..." : "Search..."}
              className="input pl-10 text-sm"
            />
          </form>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="btn btn-brand btn-md">
              <Home className="w-4 h-4" />
              {lang === "bn" ? "হোমপেজ" : "Home"}
            </Link>
            <Link href="/products" className="btn btn-outline btn-md">
              <Search className="w-4 h-4" />
              {lang === "bn" ? "পণ্য খুঁজুন" : "Browse Products"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
