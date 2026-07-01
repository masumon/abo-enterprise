import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";

export function usePaginationUrl() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get("page") ?? 1);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const updateUrl = useCallback((p: number, s?: string, st?: string) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (s) params.set("search", s);
    if (st) params.set("status", st);
    const query = params.toString();
    router.replace(query ? `?${query}` : "", { scroll: false });
  }, [router]);

  return { page, search, status, updateUrl };
}
