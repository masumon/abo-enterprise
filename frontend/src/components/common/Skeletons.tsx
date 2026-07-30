import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-gray-200 dark:bg-white/10 motion-safe:animate-pulse rounded-lg",
        className
      )}
    />
  );
}

/**
 * GAP-18 — card and table skeletons existed, but lists and articles fell back
 * to a centred spinner. A spinner says "wait" and nothing else; the layout it
 * resolves into is a surprise, so the page jumps once the data lands. These
 * three variants match the shape of what replaces them, which is the whole
 * point of a skeleton.
 */
export function ListRowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 flex items-center gap-4"
        >
          <Bone className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Bone className="h-4 w-2/3" />
            <Bone className="h-3 w-1/3" />
          </div>
          <Bone className="h-8 w-16 rounded-xl flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ProductRailSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="flex gap-4 overflow-hidden pb-2 sm:grid sm:grid-cols-3"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[15rem] sm:w-auto">
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Bone className="h-56 w-full rounded-2xl" />
      <Bone className="h-3 w-24 rounded-full" />
      <Bone className="h-8 w-5/6" />
      <Bone className="h-3 w-40" />
      <div className="space-y-2.5 pt-4">
        {["w-full", "w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-3/4"].map((w, i) => (
          <Bone key={i} className={cn("h-3.5", w)} />
        ))}
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <Bone className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Bone className="h-4 w-3/4" />
        <Bone className="h-4 w-1/2" />
        <div className="flex justify-between">
          <Bone className="h-6 w-20" />
          <Bone className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Bone className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-2/3" />
          <Bone className="h-3 w-1/2" />
        </div>
      </div>
      <Bone className="h-3 w-full" />
      <Bone className="h-3 w-5/6" />
      <Bone className="h-9 w-full rounded-xl" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <Bone className="w-10 h-10 rounded-xl" />
          <Bone className="h-7 w-20" />
          <Bone className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Bone className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2 mb-6">
      <Bone className="h-8 w-48" />
      <Bone className="h-4 w-72" />
    </div>
  );
}
