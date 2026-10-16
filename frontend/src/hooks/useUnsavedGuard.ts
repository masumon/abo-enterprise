import { useEffect, useState } from "react";

/** Warn before closing/reloading the tab while there are unsaved edits. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

/** True when `value` differs from what it was when `key` last changed (e.g. when an
 * editor opened). `key` null = nothing open. */
export function useDirty(value: unknown, key: unknown): boolean {
  const json = value == null ? "" : JSON.stringify(value);
  const [base, setBase] = useState<{ key: unknown; json: string } | null>(null);
  useEffect(() => {
    setBase(key == null ? null : { key, json });
    // Baseline only when the editor opens (key changes) — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return key != null && !!base && base.key === key && json !== base.json;
}
