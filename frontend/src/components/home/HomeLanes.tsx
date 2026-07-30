"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, Wrench, Code2 } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

type Lane = "shop" | "services" | "software";
const LANE_IDS: Lane[] = ["shop", "services", "software"];

/**
 * GAP-23 — the homepage stacked all three arms of the business into one
 * column, so a visitor who came to buy a charger scrolled through the service
 * catalogue and the software portfolio to reach the products, and a visitor
 * who came for a POS quote scrolled past the shop. Nobody landed on what they
 * came for.
 *
 * Shop is the default lane: it is the highest-traffic arm and the one a
 * first-time visitor is most likely to want. The other two are one tap away.
 *
 * The inactive lanes are hidden, not unmounted — the markup stays in the
 * document, so nothing that was crawlable or linkable stops being either, and
 * switching costs no fetch.
 */
const LANES: { id: Lane; icon: typeof ShoppingBag; label: { en: string; bn: string } }[] = [
  { id: "shop", icon: ShoppingBag, label: { en: "Shop", bn: "শপ" } },
  { id: "services", icon: Wrench, label: { en: "Services", bn: "সেবা" } },
  { id: "software", icon: Code2, label: { en: "Software", bn: "সফটওয়্যার" } },
];

export default function HomeLanes({
  shop,
  services,
  software,
}: {
  shop: ReactNode;
  services: ReactNode;
  software: ReactNode;
}) {
  const { lang } = useLanguageStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /*
   * Screen 04 — the lane lives in the URL, so a link someone shares keeps its
   * meaning: sending "look at their software work" should not open on Shop.
   * Shop stays the default and is not written to the URL, so the canonical
   * homepage address is unchanged and nothing new is indexable.
   */
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
      <div className="container mx-auto px-4 pt-10">
        <div
          role="tablist"
          aria-label={lang === "bn" ? "কী খুঁজছেন" : "What are you here for"}
          className="flex gap-2 overflow-x-auto pb-1 sm:justify-center"
        >
          {LANES.map(({ id, icon: Icon, label }) => {
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
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap min-h-[44px] border motion-safe:transition-colors",
                  active
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "bg-white dark:bg-white/5 text-heading border-gray-200 dark:border-white/10 hover:border-brand-300"
                )}
              >
                <Icon aria-hidden className="w-4 h-4" />
                {lang === "bn" ? label.bn : label.en}
              </button>
            );
          })}
        </div>
      </div>

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
    </section>
  );
}
