"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

type Lane = "shop" | "services" | "software";
const LANE_IDS: Lane[] = ["shop", "services", "software"];

const LANES: {
  id: Lane;
  emoji: string;
  label: { en: string; bn: string };
  href: string;
  blurb: { en: string; bn: string };
}[] = [
  {
    id: "shop", emoji: "🛍️", label: { en: "Shop", bn: "দোকান" }, href: "/products",
    blurb: { en: "Accessories, gadgets & electronics", bn: "এক্সেসরিজ, গ্যাজেট ও ইলেকট্রনিক্স" },
  },
  {
    id: "services", emoji: "🧾", label: { en: "Services", bn: "সেবা" }, href: "/services",
    blurb: { en: "Passport, NID, printing, repairs", bn: "পাসপোর্ট, NID, প্রিন্টিং, সার্ভিসিং" },
  },
  {
    id: "software", emoji: "💻", label: { en: "Software", bn: "সফটওয়্যার" }, href: "/projects",
    blurb: { en: "POS, ERP, AI & custom software", bn: "POS, ERP, AI ও কাস্টম সফটওয়্যার" },
  },
];

export default function HomeLanes({
  shop,
  services,
  software,
  interstitial,
}: {
  shop: ReactNode;
  services: ReactNode;
  software: ReactNode;
  interstitial?: ReactNode;
}) {
  const { lang } = useLanguageStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const laneParam = searchParams.get("lane");
  const [lane, setLaneState] = useState<Lane>(
    LANE_IDS.includes(laneParam as Lane) ? (laneParam as Lane) : "shop"
  );

  useEffect(() => {
    const next = LANE_IDS.includes(laneParam as Lane) ? (laneParam as Lane) : "shop";
    setLaneState((prev) => (prev === next ? prev : next));
  }, [laneParam]);

  const setLane = (next: Lane) => {
    setLaneState(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "shop") params.delete("lane");
    else params.set("lane", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const panels: Record<Lane, ReactNode> = { shop, services, software };

  return (
    <section>
      <div className="px-3 pt-2.5 lg:container lg:mx-auto lg:px-4 lg:pt-8">
        <p className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[var(--ink-muted)] mb-1.5">
          {lang === "bn" ? "আপনি কী খুঁজছেন?" : "What do you need today?"}
          <span className="mx-1.5 opacity-40">·</span>
          <span>{lang === "bn" ? "WHAT DO YOU NEED TODAY?" : "আপনি কী খুঁজছেন?"}</span>
        </p>
        <div
          role="tablist"
          aria-label={lang === "bn" ? "কী খুঁজছেন" : "What are you here for"}
          className="grid grid-cols-3 gap-1.5"
        >
          {LANES.map(({ id, emoji, label }) => {
            const active = lane === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`home-lane-tab-${id}`}
                aria-selected={active}
                aria-controls={`home-lane-panel-${id}`}
                onClick={() => setLane(id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-1.5 py-2.5 rounded-xl border motion-safe:transition-colors text-center",
                  active
                    ? "border-brand-600 bg-brand-50 dark:bg-brand-900/30 shadow-[inset_0_-3px_0_var(--brand)]"
                    : "border-[var(--line)] bg-white dark:bg-white/5 hover:border-brand-300"
                )}
              >
                <span className="text-base" aria-hidden>{emoji}</span>
                <span className="text-[11.5px] font-bold leading-tight">
                  {lang === "bn" ? label.bn : label.en}
                </span>
                <span className="text-[9.5px] text-[var(--ink-muted)] leading-tight">
                  {lang === "bn" ? label.en : label.bn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {interstitial}

      {LANES.map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`home-lane-panel-${id}`}
          aria-labelledby={`home-lane-tab-${id}`}
          hidden={lane !== id}
        >
          {panels[id]}
        </div>
      ))}

      <div className="px-3 pb-4 lg:container lg:mx-auto lg:px-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-2">
          {lang === "bn" ? "ABO-র আরও যা আছে" : "Also from ABO"}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {LANES.filter((l) => l.id !== lane).map(({ id, emoji, label, href, blurb }) => (
            <Link
              key={id}
              href={href}
              className="flex items-center gap-3 min-h-[44px] px-2.5 py-2.5 rounded-md border border-[var(--line)] hover:border-brand-300 bg-white dark:bg-white/5"
            >
              <span className="text-sm flex-shrink-0" aria-hidden>{emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold">
                  {lang === "bn" ? label.bn : label.en}
                </span>
                <span className="block text-[10px] text-[var(--ink-muted)] truncate">
                  {lang === "bn" ? blurb.bn : blurb.en}
                </span>
              </span>
              <ChevronRight aria-hidden className="w-3 h-3 text-[var(--ink-muted)] flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
