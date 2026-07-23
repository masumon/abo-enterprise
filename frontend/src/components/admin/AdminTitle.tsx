"use client";

import { useLanguageStore } from "@/store/language";

/**
 * Language-aware page heading for admin pages that use a custom header
 * layout (icon + title + count) instead of AdminPageHeader. Renders the
 * heading in the admin's selected language so it matches the localized
 * sidebar and breadcrumb. Bengali strings mirror the sidebar labels.
 */
export default function AdminTitle({
  en,
  bn,
  className = "text-2xl font-bold text-heading tracking-tight",
}: {
  en: string;
  bn: string;
  className?: string;
}) {
  const { lang } = useLanguageStore();
  return <h1 className={className}>{lang === "bn" ? bn : en}</h1>;
}
