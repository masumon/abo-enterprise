/**
 * Shared access to the browser's deferred PWA install prompt. The
 * `beforeinstallprompt` event fires once; we capture it at module load so any
 * button (footer, admin) can trigger the native install dialog on click.
 *
 * This origin ships TWO installable apps — the customer app (scope "/") and the
 * admin app (scope "/sumon"). A deferred prompt is bound by the browser to the
 * manifest that was active when it fired, i.e. to the page's URL. We remember
 * that URL so the customer button never installs the admin app (or vice-versa)
 * when the user has moved between the two sections in one SPA session.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let deferredPath = "";

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    deferredPath = window.location.pathname;
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    deferredPath = "";
  });
}

const ADMIN_SCOPE = "/sumon";
function capturedInAdminScope(): boolean {
  return deferredPath === ADMIN_SCOPE || deferredPath.startsWith(`${ADMIN_SCOPE}/`);
}

/** True when the pending prompt belongs to the requested app. `scope` defaults
 * to "customer" so existing callers (footer) keep their meaning. */
export function canInstall(scope: "customer" | "admin" = "customer"): boolean {
  if (!deferred) return false;
  return scope === "admin" ? capturedInAdminScope() : !capturedInAdminScope();
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Fire the native install dialog for the given app. Returns "unavailable" when
 * no prompt is pending for that app (already installed, iOS, desktop without
 * support, or the pending prompt belongs to the OTHER app) so the caller can
 * fall back to instructions.
 */
export async function triggerInstall(
  scope: "customer" | "admin" = "customer"
): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred || !canInstall(scope)) return "unavailable";
  try {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    deferredPath = "";
    return outcome;
  } catch {
    return "unavailable";
  }
}
