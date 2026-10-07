/**
 * AbortSignal that fires after `ms`. Uses the native AbortSignal.timeout when
 * available; older browsers (old Android WebViews, UC Browser) and jsdom lack
 * it, so fall back to AbortController + setTimeout instead of throwing.
 */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}
