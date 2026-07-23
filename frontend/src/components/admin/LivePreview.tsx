"use client";

import { useState } from "react";
import { Smartphone, Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LivePreviewProps {
  children: React.ReactNode;
  /** Bengali header label (defaults to the standard phrase). */
  titleBn?: string;
  defaultDevice?: "mobile" | "desktop";
  /** Hide the device toggle for previews that are inherently one width. */
  showDevice?: boolean;
  className?: string;
}

const seg = (on: boolean) =>
  cn(
    "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
    on ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
  );

/**
 * "As it appears on the website" — a self-contained preview stage that renders
 * real website components with the editor's live values. It scopes its own
 * light/dark theme (Tailwind `darkMode:"class"`) so an admin can check both
 * without leaving the form, and constrains the width to a phone or desktop.
 */
export default function LivePreview({
  children,
  titleBn = "ওয়েবসাইটে যেমন দেখাবে",
  defaultDevice = "mobile",
  showDevice = true,
  className,
}: LivePreviewProps) {
  const [dark, setDark] = useState(false);
  const [device, setDevice] = useState<"mobile" | "desktop">(defaultDevice);

  return (
    <div className={cn("rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02]">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">🖥️ {titleBn}</span>
        <div className="flex items-center gap-1">
          {showDevice && (
            <>
              <button type="button" onClick={() => setDevice("mobile")} className={seg(device === "mobile")} aria-label="Mobile" title="Mobile">
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => setDevice("desktop")} className={seg(device === "desktop")} aria-label="Desktop" title="Desktop">
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <span className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
            </>
          )}
          <button type="button" onClick={() => setDark((d) => !d)} className={seg(false)} aria-label="Toggle light/dark" title={dark ? "Dark" : "Light"}>
            {dark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div className="p-3 overflow-auto" style={{ background: dark ? "#0a1628" : "#e9eef6" }}>
        <div className={dark ? "dark" : undefined}>
          <div className="mx-auto transition-[max-width] duration-300" style={{ maxWidth: device === "mobile" ? 390 : "100%" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
