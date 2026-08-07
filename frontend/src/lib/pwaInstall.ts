/**
 * Shared access to the browser's deferred PWA install prompt. The
 * `beforeinstallprompt` event fires once; we capture it at module load so any
 * button (footer, banner) can trigger the native install dialog on click.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
  });
}

/** Whether a native install prompt is currently available (Android/desktop
 * Chromium). False on iOS and after install. */
export function canInstall(): boolean {
  return deferred !== null;
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
 * Fire the native install dialog. Returns "unavailable" when the browser has
 * no pending prompt (already installed, iOS, or desktop without support) so the
 * caller can fall back to instructions.
 */
export async function triggerInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  try {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    return outcome;
  } catch {
    return "unavailable";
  }
}
