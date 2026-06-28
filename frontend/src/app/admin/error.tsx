"use client";

import RouteError from "@/components/common/RouteError";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Admin panel error"
      message="অ্যাডমিন প্যানেল লোড করা যায়নি। পুনরায় চেষ্টা করুন।"
    />
  );
}
