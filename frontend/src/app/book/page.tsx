import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import BookPageClient from "./BookPageClient";

export const metadata = {
  title: "Book a Service | ABO Enterprise",
  description: "Book professional services from ABO Enterprise.",
};

function BookPageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );
}

export default function BookPage({
  searchParams,
}: {
  searchParams: { service?: string; tier?: string; mode?: string };
}) {
  return (
    <Suspense fallback={<BookPageFallback />}>
      <BookPageClient serviceSlug={searchParams.service} tierId={searchParams.tier} mode={searchParams.mode} />
    </Suspense>
  );
}
