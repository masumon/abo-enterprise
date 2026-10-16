import { ArticleSkeleton, ProductRailSkeleton } from "@/components/common/Skeletons";

/**
 * GAP-18 — the article is server-rendered behind a network fetch, so until it
 * arrived the reader saw an empty screen. This holds the article's shape.
 */
export default function Loading() {
  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <ArticleSkeleton />
        {/* The finished article ends with the product rail (GAP-17), so the
            loading state holds that shape too rather than jumping when it
            arrives. */}
        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-white/10">
          <ProductRailSkeleton />
        </div>
      </div>
    </main>
  );
}
