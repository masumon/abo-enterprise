"use client";

import { useEffect, useRef } from "react";

/**
 * Opens an admin page's "add new" form when the URL has `?new=1` (used by the
 * content hub's "নতুন যোগ করুন" buttons). Runs once after mount, then removes
 * the param so a refresh doesn't reopen the form. Reads window.location
 * instead of useSearchParams so pages need no Suspense boundary.
 */
export function useOpenOnNew(open: () => void): void {
  const ref = useRef(open);
  ref.current = open;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("new") !== "1") return;
    url.searchParams.delete("new");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    ref.current();
  }, []);
}
