"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const TZ = "Asia/Dhaka";

/** Dashboard welcome card: greeting by Bangladesh time, a large live digital clock + date, and the
 * auto-refresh status (green = live). Own gradient card, readable in light and dark mode. */
export default function DashboardGreeting({ bn, lastUpdated, refreshing, onRefresh }: {
  bn: boolean; lastUpdated: Date | null; refreshing: boolean; onRefresh: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const loc = bn ? "bn-BD" : "en-GB";
  const hour = now ? Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: TZ }).format(now)) % 24 : 9;
  const part = hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 20 ? "evening" : "night";
  const G = {
    morning: { bn: "সুপ্রভাত", en: "Good morning", icon: "☀️", bg: "from-[#1e3a8a] via-[#2563eb] to-[#0ea5e9]" },
    afternoon: { bn: "শুভ অপরাহ্ন", en: "Good afternoon", icon: "🌤️", bg: "from-[#1e3a8a] via-[#3b5bdb] to-[#f59e0b]/80" },
    evening: { bn: "শুভ সন্ধ্যা", en: "Good evening", icon: "🌇", bg: "from-[#312e81] via-[#6d28d9] to-[#f97316]/80" },
    night: { bn: "শুভ রাত্রি", en: "Good night", icon: "🌙", bg: "from-[#0f172a] via-[#1e1b4b] to-[#4338ca]" },
  }[part];

  const parts = now ? new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: TZ }).formatToParts(now) : [];
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "--";
  const dateStr = now ? new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(now) : "";
  const updated = lastUpdated ? new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TZ }).format(lastUpdated) : null;

  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${G.bg} text-white shadow-xl shadow-brand-900/20 px-5 py-5 sm:px-7 sm:py-6 lg:px-9 lg:py-7`} aria-label={bn ? "স্বাগতম" : "Welcome"}>
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="min-w-0">
          <p className="flex items-center gap-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            <span aria-hidden className="text-4xl sm:text-5xl">{G.icon}</span>{bn ? G.bn : G.en}!
          </p>
          <p className="mt-2 text-sm sm:text-base lg:text-lg text-white/90 max-w-xl leading-relaxed">
            {bn ? "ব্যবসার কমান্ড সেন্টার — এখন কী দরকার, কী পরিবর্তন হয়েছে এবং কী ভালো চলছে" : "Business command center — what needs attention, what changed, and what is performing"}
          </p>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-3">
          <div className="rounded-2xl bg-black/25 backdrop-blur-sm border border-white/20 px-4 py-2.5 sm:px-5 sm:py-3" role="timer" aria-live="off">
            <div className="flex items-end gap-1.5 font-mono tabular-nums leading-none">
              <span className="text-5xl sm:text-6xl lg:text-7xl font-bold">{get("hour")}</span>
              <span className="text-4xl sm:text-5xl lg:text-6xl font-bold animate-pulse pb-1">:</span>
              <span className="text-5xl sm:text-6xl lg:text-7xl font-bold">{get("minute")}</span>
              <span className="flex flex-col items-start gap-1 pb-1 pl-1">
                <span className="text-base sm:text-xl font-bold text-amber-200">{get("dayPeriod").toUpperCase()}</span>
                <span className="text-lg sm:text-2xl font-semibold text-white/85">{get("second")}</span>
              </span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-white/85">{dateStr}{dateStr ? " · " : ""}{bn ? "বাংলাদেশ সময়" : "Bangladesh time"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 border border-emerald-300/50 px-3 min-h-9 text-xs sm:text-sm font-semibold text-emerald-50">
              <span aria-hidden className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" /></span>
              {bn ? "অটো রিফ্রেশ চালু" : "Auto-refresh on"}{updated ? ` · ${bn ? "শেষ আপডেট" : "updated"} ${updated}` : ""}
            </span>
            <button type="button" onClick={onRefresh} disabled={refreshing} aria-label={bn ? "এখনই রিফ্রেশ করুন" : "Refresh now"}
              className="inline-flex items-center gap-2 rounded-full bg-white text-brand-700 hover:bg-amber-50 shadow px-4 min-h-10 text-sm font-bold disabled:opacity-70 transition">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />{bn ? "রিফ্রেশ" : "Refresh"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
