"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Calendar } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";

const HIDE_ON = ["/checkout", "/cart", "/login", "/register", "/admin"];

const SHOW_ON_PREFIXES = ["/services", "/book", "/projects"];

export default function StickyCTA() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();
  const t = useT();
  const [visible, setVisible] = useState(false);

  const allowed = SHOW_ON_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );

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
        <Link href="/book" className="btn btn-brand btn-sm flex-1 btn-ripple">
          <Calendar className="w-4 h-4" />
          {lang === "bn" ? "বুক করুন" : "Book Now"}
        </Link>
      </div>
    </div>
  );
}
