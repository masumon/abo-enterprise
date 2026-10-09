"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Catches a render error inside one admin section (e.g. an API returned an
 * unexpected shape) and shows an inline notice instead of crashing the whole
 * admin page. Text is bilingual because this is a class component (no hooks).
 */
export default class AdminSectionBoundary extends Component<{ children: ReactNode; label?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") console.error("[AdminSectionBoundary]", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">{this.props.label ? `${this.props.label}: ` : ""}ডেটা দেখানো যায়নি · Could not display this data</p>
          <p className="text-xs mt-0.5">সার্ভার অপ্রত্যাশিত উত্তর দিয়েছে। পরে আবার চেষ্টা করুন। · The server returned an unexpected response.</p>
          <button type="button" onClick={() => this.setState({ failed: false })} className="mt-2 text-xs font-semibold underline min-h-[32px]">
            আবার চেষ্টা · Retry
          </button>
        </div>
      </div>
    );
  }
}
