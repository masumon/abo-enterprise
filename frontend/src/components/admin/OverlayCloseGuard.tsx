"use client";

import { useEffect } from "react";
import { askConfirm } from "@/store/confirm";

/** Asks "সেভ না করে বন্ধ করবেন?" when a side panel (.admin-overlay--panel) holds
 * edits and the admin tries to leave it (Esc, ✕, বাতিল, or a click on the dim
 * backdrop). Mounted once in the admin layout — the 39 panels stay untouched.
 * Saving closes a panel by itself, so it never triggers this. */
const dirty = new WeakSet<Element>();
let bypass = false;

const panelOf = (t: EventTarget | null) => (t instanceof Element ? t.closest(".admin-overlay--panel") : null);

export default function OverlayCloseGuard() {
  useEffect(() => {
    const onEdit = (e: Event) => {
      const panel = panelOf(e.target);
      const t = e.target as HTMLElement | null;
      if (panel && !panel.hasAttribute("data-no-guard") && t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && (t as HTMLInputElement).type !== "search") dirty.add(panel);
    };
    const ask = async (panel: Element, retry: () => void) => {
      const ok = await askConfirm("সেভ না করে বন্ধ করবেন?", { message: "আপনার করা পরিবর্তন সংরক্ষণ হবে না।", confirmLabel: "হ্যাঁ, বন্ধ করুন", variant: "warning" });
      if (!ok) return;
      dirty.delete(panel);
      bypass = true;
      try { retry(); } finally { setTimeout(() => { bypass = false; }, 0); }
    };
    const onKey = (e: KeyboardEvent) => {
      if (bypass || e.key !== "Escape") return;
      const panels = document.querySelectorAll(".admin-overlay--panel");
      const panel = panels[panels.length - 1];
      if (!panel || !dirty.has(panel) || document.querySelector(".admin-overlay--dialog")) return;
      e.stopPropagation(); e.preventDefault();
      void ask(panel, () => (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    };
    const onClick = (e: MouseEvent) => {
      if (bypass) return;
      const panel = panelOf(e.target);
      if (!panel || !dirty.has(panel)) return;
      const el = e.target as HTMLElement;
      const backdrop = el === panel;
      const btn = el.closest("button");
      const isClose = !!btn && (btn.getAttribute("aria-label") === "বন্ধ করুন" || btn.textContent?.trim() === "বাতিল");
      if (!backdrop && !isClose) return;
      e.stopPropagation(); e.preventDefault();
      void ask(panel, () => (backdrop ? el : btn!).click());
    };
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
