import { BRAND_NAME } from "@/lib/brand";

export default function Loading() {
  const brandShort = BRAND_NAME.split(" ")[0] ?? "ABO";

  return (
    <div className="min-h-screen gradient-surface flex items-center justify-center px-4">
      <div className="glass-panel rounded-3xl p-7 sm:p-8 w-full max-w-sm text-center shadow-glass">
        <div className="relative mx-auto w-20 h-20 rounded-full bg-white/80 dark:bg-[var(--surface-card)] border border-brand-200/60 flex items-center justify-center mb-4">
          <span className="text-brand-600 font-black text-xl tracking-wide">{brandShort}</span>
          <span className="absolute inset-0 rounded-full border border-brand-300/60 animate-ping" />
        </div>
        <p className="text-sm font-semibold text-heading">{BRAND_NAME}</p>
        <p className="text-xs text-muted mt-1">Preparing your experience...</p>
        <div className="mt-4 h-1.5 rounded-full overflow-hidden bg-brand-100/70 dark:bg-brand-900/40">
          <div className="h-full w-2/3 bg-gradient-to-r from-brand-500 to-accent-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
