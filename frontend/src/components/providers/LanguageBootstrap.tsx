"use client";

import { useState } from "react";
import { useLanguageStore } from "@/store/language";
import type { Language } from "@/types";

/**
 * GAP-24 — seeds the store with the language the server already rendered in,
 * so the first client render agrees with the HTML and nothing repaints.
 *
 * The seed runs in a useState initializer, which fires once during this
 * component's first render — before its siblings render — so every component
 * below reads the correct language on its very first pass. It only writes when
 * the values differ, and StoreHydration's localStorage rehydrate still runs
 * afterwards and stays authoritative.
 */
export default function LanguageBootstrap({ lang }: { lang: Language }) {
  useState(() => {
    if (useLanguageStore.getState().lang !== lang) {
      useLanguageStore.setState({ lang });
    }
    return null;
  });
  return null;
}
