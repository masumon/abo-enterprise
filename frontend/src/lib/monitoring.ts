/**
 * Sentry-ready reporting shim.
 *
 * When `window.Sentry` is available (loaded via the Sentry snippet or SDK
 * that the env var can inject at build/deploy time), errors are forwarded.
 * Otherwise this is a no-op — no cost, no bundle bloat, no dependency.
 */

type SentryLike = {
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
  captureMessage: (msg: string, level?: string) => void;
};

function sentry(): SentryLike | null {
  if (typeof window === "undefined") return null;
  const s = (window as unknown as { Sentry?: SentryLike }).Sentry;
  return s && typeof s.captureException === "function" ? s : null;
}

/** Report an unexpected error. Silent when Sentry is not present. */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  const s = sentry();
  if (s) {
    s.captureException(err, context ? { extra: context } : undefined);
    return;
  }
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.error("[reportError]", err, context ?? "");
  }
}

/** Report a non-error breadcrumb / message. */
export function reportMessage(msg: string, level: "info" | "warning" | "error" = "info"): void {
  const s = sentry();
  if (s) {
    s.captureMessage(msg, level);
  }
}
