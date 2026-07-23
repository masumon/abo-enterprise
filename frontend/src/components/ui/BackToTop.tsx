"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className={cn(
        "fixed left-4 lg:left-6 z-30 w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white",
        "shadow-[0_6px_16px_rgba(21,101,192,0.4)] ring-1 ring-white/20 flex items-center justify-center",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(21,101,192,0.5)] active:scale-95",
        "bottom-mobile-float lg:bottom-6",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ArrowUp className="w-5 h-5" strokeWidth={2.6} />
    </button>
  );
}
