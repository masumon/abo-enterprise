"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguageStore } from "@/store/language";
import SearchField from "@/components/search/SearchField";
import SearchDiscovery from "@/components/search/SearchDiscovery";
import { loadProducts, loadServices, peekCachedProducts, peekCachedServices } from "@/lib/catalogLoader";
import type { Product, Service, BlogPost } from "@/types";
import { getApiBaseUrl } from "@/lib/apiBase";
import { WHATSAPP_NUMBER } from "@/lib/utils";
import PageHero from "@/components/ui/PageHero";

interface Result {
  type: "product" | "service" | "blog" | "category";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  price?: number;
  priceLabel?: string;
  /** Set only for a product with a live flash sale — the pre-discount
   *  price to show struck through next to priceLabel. */
  strikePriceLabel?: string;
}

async function searchBlog(query: string): Promise<BlogPost[]> {
  try {
    // The blog list now searches server-side (bilingual + transliterated), so we
    // trust its results rather than re-filtering here — a client `includes(q)`
    // pass would drop the very cross-language matches the server just found.
    const params = new URLSearchParams({ per_page: "20" });
    if (query.trim()) params.append("search", query);
    const res = await fetch(`${getApiBaseUrl()}/api/v1/blog?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return ((json.data ?? []) as BlogPost[]).slice(0, 12);
  } catch {
    return [];
  }
}

interface CategoryNode {
  id?: string;
  slug: string;
  name_en?: string;
  name_bn?: string;
  applies_to?: string[];
  subcategories?: CategoryNode[];
}

/** Categories match by name in either language (both are always stored, so no
 * transliteration is needed here). Links to the matching product/service list. */
async function searchCategories(query: string, lang: string): Promise<Result[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/categories`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const flat: CategoryNode[] = [];
    const walk = (nodes: CategoryNode[] = []) => {
      for (const n of nodes) {
        flat.push(n);
        if (n.subcategories?.length) walk(n.subcategories);
      }
    };
    walk(json.data ?? []);
    const q = query.toLowerCase();
    return flat
      .filter((c) => `${c.name_en ?? ""} ${c.name_bn ?? ""} ${c.slug}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map((c) => {
        const isService =
          Array.isArray(c.applies_to) &&
          c.applies_to.includes("service") &&
          !c.applies_to.includes("product");
        return {
          type: "category" as const,
          id: c.id ?? c.slug,
          title: (lang === "bn" && c.name_bn ? c.name_bn : c.name_en) || c.slug,
          subtitle: isService ? (lang === "bn" ? "ক্যাটাগরি · সেবা" : "Category · Services") : (lang === "bn" ? "ক্যাটাগরি · পণ্য" : "Category · Products"),
          href: `${isService ? "/services" : "/products"}?category_slug=${c.slug}`,
        };
      });
  } catch {
    return [];
  }
}

function resolveServiceHref(slug: string): string {
  return `/services/${slug}`;
}

// Same live-flash-sale check as ProductCard.tsx / ProductDetailClient.tsx -
// keeps the price shown here consistent with what's shown everywhere else.
function flashSalePricing(p: Product): { effectivePrice: number; strikePrice: number | null | undefined } {
  const flashLive =
    p.is_flash_sale === true &&
    p.flash_sale_price != null &&
    p.flash_sale_price < p.price &&
    (!p.flash_sale_ends_at || new Date(p.flash_sale_ends_at) > new Date());
  return {
    effectivePrice: flashLive ? p.flash_sale_price! : p.price,
    strikePrice: flashLive ? p.price : p.original_price,
  };
}

function toResults(products: Product[], services: Service[], posts: BlogPost[], lang: string): Result[] {
  const items: Result[] = [];
  products.forEach((p) => {
    const { effectivePrice, strikePrice } = flashSalePricing(p);
    items.push({
      type: "product",
      id: p.id ?? p.slug,
      title: lang === "bn" && p.name_bn ? p.name_bn : p.name_en,
      subtitle: p.category ?? "",
      href: `/products/${p.slug}`,
      price: effectivePrice,
      priceLabel: `৳${effectivePrice?.toLocaleString("bn-BD") ?? "—"}`,
      strikePriceLabel: strikePrice ? `৳${strikePrice.toLocaleString("bn-BD")}` : undefined,
    });
  });
  services.forEach((s) => items.push({
    type: "service",
    id: s.id,
    title: lang === "bn" && s.name_bn ? s.name_bn : s.name_en,
    subtitle: s.category ?? "",
    href: resolveServiceHref(s.slug),
    priceLabel: s.base_price ? `৳${s.base_price.toLocaleString("bn-BD")}` : (lang === "bn" ? "কোটেশন" : "Quote"),
  }));
  posts.forEach((p) => items.push({
    type: "blog",
    id: p.id ?? p.slug,
    title: lang === "bn" && p.title_bn ? p.title_bn : p.title_en,
    subtitle: (lang === "bn" ? p.excerpt_bn : p.excerpt_en) || p.category || "",
    href: `/blog/${p.slug}`,
  }));
  return items;
}

type TypeFilter = "all" | "product" | "service" | "blog" | "category";

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const words = query.trim().split(/\s+/).filter(Boolean);
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="bg-accent-50 dark:bg-accent-900/30 text-inherit rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function SearchResults() {
  const params = useSearchParams();
  const { lang } = useLanguageStore();
  const q = params.get("q") || "";
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [blogLoading, setBlogLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const coreRef = useRef<Result[]>([]);
  const blogRef = useRef<Result[]>([]);
  const catRef = useRef<Result[]>([]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setFromCache(false);
    setBlogLoading(true);
    setTypeFilter("all");
    coreRef.current = [];
    blogRef.current = [];
    catRef.current = [];
    let active = true;

    const merge = () => setResults([...catRef.current, ...coreRef.current, ...blogRef.current]);
    const searchParams = { search: q, per_page: 20 };

    Promise.all([
      peekCachedProducts(searchParams),
      peekCachedServices(searchParams),
    ]).then(([prodCache, svcCache]) => {
      if (!active) return;
      if (prodCache || svcCache) {
        coreRef.current = toResults(prodCache?.products ?? [], svcCache?.services ?? [], [], lang);
        merge();
        setFromCache(true);
        setLoading(false);
      }
    });

    Promise.allSettled([
      loadProducts(searchParams),
      loadServices(searchParams),
    ]).then(([prod, svc]) => {
      if (!active) return;
      const products = prod.status === "fulfilled" ? prod.value.products : [];
      const services = svc.status === "fulfilled" ? svc.value.services : [];
      coreRef.current = toResults(products, services, [], lang);
      merge();
      setFromCache(
        (prod.status === "fulfilled" && prod.value.source === "cache") ||
        (svc.status === "fulfilled" && svc.value.source === "cache")
      );
      setLoading(false);
    });

    searchBlog(q).then((posts) => {
      if (!active) return;
      blogRef.current = toResults([], [], posts, lang);
      merge();
      setBlogLoading(false);
    }).catch(() => {
      if (!active) return;
      setBlogLoading(false);
    });

    searchCategories(q, lang).then((cats) => {
      if (!active) return;
      catRef.current = cats;
      merge();
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, [q, lang]);

  const categoryResults = results.filter((r) => r.type === "category");
  const productResults = results.filter((r) => r.type === "product");
  const serviceResults = results.filter((r) => r.type === "service");
  const blogResults = results.filter((r) => r.type === "blog");
  const filtered = typeFilter === "all" ? results : results.filter((r) => r.type === typeFilter);
  const total = results.length;

  const TYPE_EMOJI: Record<string, string> = { product: "📦", service: "🧾", blog: "📝", category: "🗂️" };

  const title = q
    ? lang === "bn" ? `"${q}" এর ফলাফল` : `Results for "${q}"`
    : lang === "bn" ? "খুঁজুন" : "Search";

  return (
    <main className="min-h-screen page-surface">
      {/* ── Desktop: keep PageHero for visual consistency ── */}
      <div className="hidden lg:block">
        <PageHero
          pageKey="search"
          title={title}
          subtitle={q ? (lang === "bn" ? `${total}টি ফলাফল` : `${total} results found`) : (lang === "bn" ? "পণ্য, সেবা, সফটওয়্যার ও ব্লগ খুঁজুন" : "Find products, services, software & blog")}
          breadcrumbs={[
            { label: lang === "bn" ? "হোম" : "Home", href: "/" },
            { label: lang === "bn" ? "খুঁজুন" : "Search" },
          ]}
          variant="light"
        />
      </div>

      {/* ── Mobile: artifact Screen 05 layout ── */}
      <div className="lg:hidden">
        {/* Sticky search bar */}
        <div className="sticky top-[var(--navbar-offset)] z-30 bg-white dark:bg-[var(--surface-card)] border-b border-[var(--line)] px-3 py-2">
          <SearchField initialQuery={q} className="" />
        </div>

        {/* Cache banner */}
        {fromCache && total > 0 && (
          <div className="mx-3 mt-2 flex items-center gap-2 text-[11px] font-semibold px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800" role="status" aria-live="polite" aria-atomic="true">
            <span aria-hidden>💾</span>
            <span>{lang === "bn" ? "সংরক্ষিত ফলাফল দেখানো হচ্ছে" : "Showing saved results"}</span>
          </div>
        )}

        {/* Typed filter chips */}
        {q && !loading && total > 0 && (
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide">
            {([
              { key: "all" as TypeFilter, label: lang === "bn" ? `সব ${total}` : `All ${total}` },
              ...(categoryResults.length > 0 ? [{ key: "category" as TypeFilter, label: lang === "bn" ? `ক্যাটাগরি ${categoryResults.length}` : `Categories ${categoryResults.length}` }] : []),
              ...(productResults.length > 0 ? [{ key: "product" as TypeFilter, label: lang === "bn" ? `পণ্য ${productResults.length}` : `Products ${productResults.length}` }] : []),
              ...(serviceResults.length > 0 ? [{ key: "service" as TypeFilter, label: lang === "bn" ? `সেবা ${serviceResults.length}` : `Services ${serviceResults.length}` }] : []),
              ...(blogResults.length > 0 ? [{ key: "blog" as TypeFilter, label: lang === "bn" ? `ব্লগ ${blogResults.length}` : `Blog ${blogResults.length}` }] : []),
            ]).map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setTypeFilter(chip.key)}
                aria-pressed={typeFilter === chip.key}
                className={
                  typeFilter === chip.key
                    ? "flex-none text-[11px] font-semibold py-1.5 px-3 rounded-full bg-[var(--ink)] text-[var(--ground,#f1f2f7)] border border-[var(--ink)]"
                    : "flex-none text-[11px] font-medium py-1.5 px-3 rounded-full border border-[var(--line)] text-[var(--ink-muted)] bg-white dark:bg-[var(--surface)]"
                }
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="px-3 pb-24">
          {loading ? (
            <div className="space-y-3 pt-3" aria-busy="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-[var(--line)]">
                  <div className="w-[42px] h-[42px] rounded-lg bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse flex-none" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : !q ? (
            <SearchDiscovery />
          ) : total === 0 && q ? (
            <div className="pt-8 pb-4 text-center">
              <p className="text-sm text-[var(--ink-muted)]">
                {lang === "bn" ? "কোনো ফলাফল পাওয়া যায়নি।" : "No results found."}
              </p>
              <div className="mt-6 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 p-4">
                <p className="text-[12.5px] font-semibold text-[var(--ink)]">
                  {lang === "bn" ? "খুঁজে পাচ্ছেন না?" : "Can't find it?"}
                </p>
                <p className="text-[11px] text-[var(--ink-muted)] mt-1 mb-3">
                  {lang === "bn" ? "আমরা সোর্স করতে পারি কিনা জানান।" : "Let us know if we can source it."}
                </p>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lang === "bn" ? `আমি "${q}" খুঁজছি` : `I'm looking for "${q}"`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center text-xs font-semibold py-2.5 px-4 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:border-brand-300"
                >
                  {lang === "bn" ? "WhatsApp-এ জানান" : "Ask on WhatsApp"}
                </a>
              </div>
            </div>
          ) : typeFilter === "all" ? (
            <>
              {/* Grouped by type — artifact layout */}
              {categoryResults.length > 0 && (
                <div className="pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1.5">
                    {lang === "bn" ? `ক্যাটাগরি · ${categoryResults.length}` : `Categories · ${categoryResults.length}`}
                  </p>
                  <div className="divide-y divide-[var(--line)]">
                    {categoryResults.map((r) => (
                      <Link key={r.id} href={r.href} className="flex items-center gap-3 py-3 min-h-[44px]">
                        <span className="w-[42px] h-[42px] rounded-lg bg-gradient-to-br from-brand-50 to-accent-50 dark:from-brand-900/20 dark:to-accent-900/20 flex-none flex items-center justify-center text-sm" aria-hidden>
                          {TYPE_EMOJI.category}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-[var(--ink)] truncate">
                            <HighlightMatch text={r.title} query={q} />
                          </span>
                          <span className="block text-[11px] text-[var(--ink-muted)] truncate">{r.subtitle}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {productResults.length > 0 && (
                <div className="pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1.5">
                    {lang === "bn" ? `পণ্য · ${productResults.length}` : `Products · ${productResults.length}`}
                  </p>
                  <div className="divide-y divide-[var(--line)]">
                    {productResults.map((r) => (
                      <Link key={r.id} href={r.href} className="flex items-center gap-3 py-3 min-h-[44px]">
                        <span className="w-[42px] h-[42px] rounded-lg bg-gradient-to-br from-brand-50 to-accent-50 dark:from-brand-900/20 dark:to-accent-900/20 flex-none flex items-center justify-center text-sm" aria-hidden>
                          {TYPE_EMOJI.product}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-[var(--ink)] truncate">
                            <HighlightMatch text={r.title} query={q} />
                          </span>
                          <span className="block text-[11px] text-[var(--ink-muted)] truncate">
                            {r.subtitle}{r.subtitle ? " · " : ""}{lang === "bn" ? "স্টকে" : "in stock"}
                          </span>
                        </span>
                        <span className="flex flex-col items-end flex-none">
                          {r.strikePriceLabel && (
                            <span className="text-[10px] text-gray-400 line-through leading-none">{r.strikePriceLabel}</span>
                          )}
                          <span className="text-[13px] font-semibold text-[var(--ink)]">{r.priceLabel}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {serviceResults.length > 0 && (
                <div className="pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1.5">
                    {lang === "bn" ? `সেবা · ${serviceResults.length}` : `Services · ${serviceResults.length}`}
                  </p>
                  <div className="divide-y divide-[var(--line)]">
                    {serviceResults.map((r) => (
                      <Link key={r.id} href={r.href} className="flex items-center gap-3 py-3 min-h-[44px]">
                        <span className="text-sm flex-none" aria-hidden>🧾</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-[var(--ink)] truncate">
                            <HighlightMatch text={r.title} query={q} />
                          </span>
                          <span className="block text-[11px] text-[var(--ink-muted)] truncate">{r.subtitle}</span>
                        </span>
                        <span className="text-[13px] font-semibold text-[var(--ink)] flex-none">{r.priceLabel}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {blogLoading && blogResults.length === 0 && (
                <div className="pt-4 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                    {lang === "bn" ? "আর্টিকেল খুঁজছে…" : "Searching articles…"}
                  </span>
                  <div className="mt-2 space-y-2">
                    <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse" />
                  </div>
                </div>
              )}
              {blogResults.length > 0 && (
                <div className="pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1.5">
                    {lang === "bn" ? `ব্লগ · ${blogResults.length}` : `Blog · ${blogResults.length}`}
                  </p>
                  <div className="divide-y divide-[var(--line)]">
                    {blogResults.map((r) => (
                      <Link key={r.id} href={r.href} className="flex items-center gap-3 py-3 min-h-[44px]">
                        <span className="text-sm flex-none" aria-hidden>📝</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-[var(--ink)] truncate">
                            <HighlightMatch text={r.title} query={q} />
                          </span>
                          <span className="block text-[11px] text-[var(--ink-muted)] truncate">{r.subtitle}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {/* "Can't find it?" card — always visible when there are results */}
              {total > 0 && (
                <div className="mt-6 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 p-4">
                  <p className="text-[12.5px] font-semibold text-[var(--ink)]">
                    {lang === "bn" ? "খুঁজে পাচ্ছেন না?" : "Can't find it?"}
                  </p>
                  <p className="text-[11px] text-[var(--ink-muted)] mt-1 mb-3">
                    {lang === "bn" ? "আমরা সোর্স করতে পারি কিনা জানান।" : "Let us know if we can source it."}
                  </p>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lang === "bn" ? `আমি "${q}" খুঁজছি` : `I'm looking for "${q}"`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center text-xs font-semibold py-2.5 px-4 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:border-brand-300"
                  >
                    {lang === "bn" ? "WhatsApp-এ জানান" : "Ask on WhatsApp"}
                  </a>
                </div>
              )}
            </>
          ) : (
            /* Filtered by single type */
            <div className="pt-3 divide-y divide-[var(--line)]">
              {filtered.map((r) => (
                <Link key={r.id + r.type} href={r.href} className="flex items-center gap-3 py-3 min-h-[44px]">
                  <span className={`flex-none ${r.type === "product" ? "w-[42px] h-[42px] rounded-lg bg-gradient-to-br from-brand-50 to-accent-50 dark:from-brand-900/20 dark:to-accent-900/20 flex items-center justify-center text-sm" : "text-sm"}`} aria-hidden>
                    {TYPE_EMOJI[r.type] ?? "📄"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--ink)] truncate">
                      <HighlightMatch text={r.title} query={q} />
                    </span>
                    <span className="block text-[11px] text-[var(--ink-muted)] truncate">{r.subtitle}</span>
                  </span>
                  {r.priceLabel && (
                    <span className="flex flex-col items-end flex-none">
                      {r.strikePriceLabel && (
                        <span className="text-[10px] text-gray-400 line-through leading-none">{r.strikePriceLabel}</span>
                      )}
                      <span className="text-[13px] font-semibold text-[var(--ink)]">{r.priceLabel}</span>
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop: existing layout ── */}
      <div className="hidden lg:block container mx-auto px-4 py-10 max-w-3xl">
        <SearchField initialQuery={q} className="mb-6" />
        {fromCache && total > 0 && (
          <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2 mb-4" role="status" aria-live="polite" aria-atomic="true">
            {lang === "bn" ? "সংরক্ষিত ফলাফল দেখানো হচ্ছে" : "Showing saved results"}
          </p>
        )}
        {loading ? (
          <div className="grid gap-4" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-white/5 motion-safe:animate-pulse" />
            ))}
          </div>
        ) : !q ? (
          <SearchDiscovery />
        ) : total === 0 && q ? (
          <div className="text-center py-16 enterprise-card p-8">
            <p className="text-muted">
              {lang === "bn" ? "কোনো ফলাফল পাওয়া যায়নি।" : "No results found."}
            </p>
            <div className="flex gap-3 justify-center mt-6 flex-wrap">
              <Link href="/products" className="btn btn-brand btn-sm">
                {lang === "bn" ? "সব পণ্য" : "All Products"}
              </Link>
              <Link href="/services" className="btn btn-outline btn-sm">
                {lang === "bn" ? "সব সেবা" : "All Services"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r) => (
              <Link
                key={r.id + r.type}
                href={r.href}
                className="flex items-center gap-4 enterprise-card p-4 hover:shadow-md transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-heading truncate">{r.title}</p>
                  <p className="text-sm text-muted">{r.subtitle}</p>
                </div>
                {r.priceLabel && (
                  <span className="flex flex-col items-end">
                    {r.strikePriceLabel && (
                      <span className="text-xs text-gray-400 line-through leading-none">{r.strikePriceLabel}</span>
                    )}
                    <span className="text-sm font-medium">{r.priceLabel}</span>
                  </span>
                )}
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-brand-50 text-brand-600">
                  {r.type}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
