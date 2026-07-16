"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Calendar } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { categoriesApi } from "@/lib/api";

const HIDE_ON = ["/checkout", "/cart", "/login", "/register", "/admin"];

const SHOW_ON_PREFIXES = ["/services", "/projects"];

// These are static informational pages under /services, not bookable service slugs.
const NON_BOOKABLE_SERVICE_SLUGS = new Set(["legal", "printing", "software"]);

// Taxonomy category slugs share the /services/{slug} namespace with services.
// Cached module-wide so the (ETag-cached) list is fetched at most once per load.
let categorySlugsCache: Set<string> | null = null;
let categorySlugsPromise: Promise<Set<string>> | null = null;

function loadCategorySlugs(): Promise<Set<string>> {
  if (categorySlugsCache) return Promise.resolve(categorySlugsCache);
  if (!categorySlugsPromise) {
    categorySlugsPromise = categoriesApi
      .list({ applies_to: "service" })
      .then((r) => {
        categorySlugsCache = new Set((r.data.data ?? []).map((c) => c.slug));
        return categorySlugsCache;
      })
      .catch(() => {
        categorySlugsPromise = null; // allow retry on next page view
        return new Set<string>();
      });
  }
  return categorySlugsPromise;
}

export default function StickyCTA() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [categorySlugs, setCategorySlugs] = useState<Set<string>>(
    () => categorySlugsCache ?? new Set()
  );

  const allowed = SHOW_ON_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );

  const serviceSlugMatch = pathname?.match(/^\/services\/([^/]+)\/?$/);

  // A single /services/{slug} segment may be a CATEGORY landing page — its
  // slug must not be passed to /book as if it were a bookable service.
  useEffect(() => {
    if (!serviceSlugMatch || categorySlugsCache) return;
    let cancelled = false;
    loadCategorySlugs().then((slugs) => {
      if (!cancelled) setCategorySlugs(slugs);
    });
    return () => {
      cancelled = true;
    };
  }, [serviceSlugMatch?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeServiceSlug =
    serviceSlugMatch &&
    !NON_BOOKABLE_SERVICE_SLUGS.has(serviceSlugMatch[1]) &&
    !categorySlugs.has(serviceSlugMatch[1])
      ? serviceSlugMatch[1]
      : null;
  const bookHref = activeServiceSlug ? `/book?service=${activeServiceSlug}` : "/services";

  useEffect(() => {
    if (!allowed) return;
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [allowed]);

  if (!pathname || pathname.startsWith("/admin")) return null;
  if (!allowed) return null;
  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  if (!visible) return null;

  return (
    <div
      className="sticky-cta-bar lg:hidden px-4 py-3"
      style={{ bottom: "var(--mobile-chrome-bottom)" }}
      role="region"
      aria-label={lang === "bn" ? "দ্রুত কার্যক্রম" : "Quick actions"}
    >
      <div className="flex gap-2 max-w-lg mx-auto">
        <Link href="/projects" className="btn btn-primary btn-sm flex-1 btn-ripple">
          <Briefcase className="w-4 h-4" />
          {t("nav_get_quote")}
        </Link>
        <Link href={bookHref} className="btn btn-brand btn-sm flex-1 btn-ripple">
          <Calendar className="w-4 h-4" />
          {lang === "bn" ? "বুক করুন" : "Book Now"}
        </Link>
      </div>
    </div>
  );
}
