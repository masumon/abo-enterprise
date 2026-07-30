import { ArticleSkeleton } from "@/components/common/Skeletons";

/**
 * GAP-18 — the article is server-rendered behind a network fetch, so until it
 * arrived the reader saw an empty screen. This holds the article's shape.
 */
export default function Loading() {
  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <ArticleSkeleton />
      </div>
    </main>
  );
}
