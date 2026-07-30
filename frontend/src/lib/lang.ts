import type { Language } from "@/types";

/**
 * GAP-24 — the language lived only in localStorage, which the server cannot
 * read. Every page was therefore sent in Bengali and repainted in English
 * after hydration for an English reader, and `<html lang>` was wrong until
 * JavaScript ran — wrong for screen readers and for search engines.
 *
 * The cookie is the server-readable mirror of the same choice. localStorage
 * stays the source of truth for the store; the cookie only has to be right at
 * request time.
 */
export const LANG_COOKIE = "abo_lang";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Narrows any stored/received value to a supported language. Default: bn. */
export function normalizeLang(value: string | undefined | null): Language {
  return value === "en" ? "en" : "bn";
}

/**
 * Client-side read of the same cookie the server used to render. Returns null
 * on the server and when no cookie is set, so the caller keeps its default.
 */
export function readLangCookie(): Language | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
  if (!match) return null;
  return normalizeLang(decodeURIComponent(match[1]));
}

/** Client-side write. No-op on the server. */
export function writeLangCookie(lang: Language) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}
