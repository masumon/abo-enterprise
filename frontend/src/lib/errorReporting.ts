/**
 * Browser error reporting to Sentry (free plan). Turned on only when the Vercel env
 * NEXT_PUBLIC_SENTRY_DSN is set; otherwise every call is a no-op. The SDK is loaded
 * lazily (separate chunk) so it never slows down the first page load. No personal data
 * is sent (no IP, cookies or form values).
 */
type SentryModule = typeof import("@sentry/browser");

let loading: Promise<SentryModule | null> | null = null;

function load(): Promise<SentryModule | null> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || typeof window === "undefined") return Promise.resolve(null);
  if (!loading) {
    loading = import("@sentry/browser")
      .then((Sentry) => {
        Sentry.init({
          dsn,
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
          tracesSampleRate: 0, // errors only — keeps us far inside the free quota
          ignoreErrors: ["ResizeObserver loop", "Non-Error promise rejection captured", "AbortError"],
          denyUrls: [/extensions\//i, /^chrome-extension:\/\//i, /^moz-extension:\/\//i],
          // The PWA service-worker registration is rejected by crawlers (e.g. Googlebot) and
          // some locked-down browsers — harmless (the site works without it), so not an issue.
          beforeSend(event) {
            const frames = event.exception?.values?.flatMap((v) => v.stacktrace?.frames ?? []) ?? [];
            return frames.some((f) => (f.function ?? "").includes("ServiceWorkerContainer")) ? null : event;
          },
        });
        return Sentry;
      })
      .catch(() => null);
  }
  return loading;
}

/** Start catching uncaught errors and unhandled promise rejections. */
export function initErrorReporting(): void {
  void load();
}

/** Report an error caught by an error boundary (the page showed "Something went wrong"). */
export function reportError(error: unknown, where?: string): void {
  void load().then((Sentry) => {
    Sentry?.captureException(error, where ? { tags: { boundary: where } } : undefined);
  });
}
