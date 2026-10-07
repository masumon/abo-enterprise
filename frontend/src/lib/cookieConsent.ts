"use client";

import { useEffect, useState } from "react";

/** localStorage key holding the visitor's cookie choice (shared with the banner). */
export const CONSENT_STORAGE_KEY = "abo-cookie-consent-v2";
/** Fired on window whenever the choice is saved or withdrawn. */
export const CONSENT_CHANGED_EVENT = "abo:cookie-consent-changed";
/** Fire to re-open the banner (e.g. "Change cookie preferences" on the cookie policy). */
export const CONSENT_REOPEN_EVENT = "abo:cookie-consent-reopen";

export interface ConsentState {
  status: "accepted" | "rejected" | "custom" | "dismissed";
  analytics: boolean;
  marketing: boolean;
  updated_at: string;
}

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

export function saveConsent(status: ConsentState["status"], analytics: boolean, marketing: boolean): void {
  const payload: ConsentState = { status, analytics, marketing, updated_at: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage blocked — choice just won't persist */
  }
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

/** Forget the stored choice (consent withdrawn) and ask the banner to show again. */
export function reopenConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
}

/**
 * Opt-in: optional trackers run only after the visitor said yes. No choice yet,
 * "reject" or "dismiss" all mean no analytics / marketing cookies.
 */
export function useCookieConsent(): { analytics: boolean; marketing: boolean } {
  const [state, setState] = useState({ analytics: false, marketing: false });
  useEffect(() => {
    const sync = () => {
      const c = readConsent();
      const allowed = c?.status === "accepted" || c?.status === "custom";
      setState({ analytics: Boolean(allowed && c?.analytics), marketing: Boolean(allowed && c?.marketing) });
    };
    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}
