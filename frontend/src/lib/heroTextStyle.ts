/**
 * Admin-controlled styling for the homepage hero text (title + subtitle).
 * Stored in a single public setting (`hero_` prefix → readable without auth),
 * so the homepage can render it and admins can tune color / size / position /
 * style. Every field is optional; empty → the built-in premium defaults.
 */
export const HERO_TEXT_STYLE_KEY = "hero_text_style_json";

export interface HeroTextStyle {
  /** Horizontal alignment of the text block (ডান/বাম/মাঝ). */
  align?: "left" | "center" | "right";
  /** Vertical position of the hero content on mobile (উপর/নিচ). */
  valign?: "top" | "center" | "bottom";
  titleColor?: string;
  titleSize?: "sm" | "md" | "lg" | "xl";
  subColor?: string;
  subSize?: "sm" | "md" | "lg";
  bold?: boolean;
  italic?: boolean;
  shadow?: boolean;
  uppercase?: boolean;
}

export function parseHeroTextStyle(raw?: string): HeroTextStyle {
  if (!raw?.trim()) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as HeroTextStyle) : {};
  } catch {
    return {};
  }
}

// Responsive size scales — each stays device-friendly (mobile → desktop).
const TITLE_SIZE: Record<string, string> = {
  sm: "text-xl sm:text-2xl lg:text-3xl",
  md: "text-[1.75rem] sm:text-4xl lg:text-[2.625rem]",
  lg: "text-3xl sm:text-5xl lg:text-[3.25rem]",
  xl: "text-4xl sm:text-6xl lg:text-7xl",
};
const SUB_SIZE: Record<string, string> = {
  sm: "text-sm sm:text-base",
  md: "text-base sm:text-lg",
  lg: "text-lg sm:text-xl",
};
const ALIGN: Record<string, string> = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};
const VALIGN: Record<string, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};

export function heroTitleClass(s: HeroTextStyle): string {
  return [
    TITLE_SIZE[s.titleSize ?? "md"] ?? TITLE_SIZE.md,
    s.bold === false ? "font-semibold" : "font-bold",
    s.italic ? "italic" : "",
    s.shadow ? "drop-shadow-[0_3px_10px_rgba(0,0,0,0.45)]" : "",
    s.uppercase ? "uppercase tracking-wide" : "",
  ].filter(Boolean).join(" ");
}

export function heroSubClass(s: HeroTextStyle): string {
  return [SUB_SIZE[s.subSize ?? "md"] ?? SUB_SIZE.md, s.italic ? "italic" : ""].filter(Boolean).join(" ");
}

export function heroAlignClass(s: HeroTextStyle): string {
  return ALIGN[s.align ?? "left"] ?? ALIGN.left;
}

/** Mobile vertical position; desktop always stays centered. */
export function heroVAlignClass(s: HeroTextStyle): string {
  return `${VALIGN[s.valign ?? "center"] ?? VALIGN.center} lg:items-center`;
}

// ── Admin option lists ──
export const HERO_COLOR_OPTIONS = ["#ffd54f", "#ffffff", "#e91e63", "#1565c0", "#10b981", "#e8eefb"];
export const HERO_TITLE_SIZES = [
  { v: "sm", label: "S" }, { v: "md", label: "M" }, { v: "lg", label: "L" }, { v: "xl", label: "XL" },
] as const;
export const HERO_SUB_SIZES = [
  { v: "sm", label: "S" }, { v: "md", label: "M" }, { v: "lg", label: "L" },
] as const;
export const HERO_ALIGNS = [
  { v: "left", label: "◧ বাম" }, { v: "center", label: "▣ মাঝ" }, { v: "right", label: "◨ ডান" },
] as const;
export const HERO_VALIGNS = [
  { v: "top", label: "↑ উপর" }, { v: "center", label: "↔ মাঝ" }, { v: "bottom", label: "↓ নিচ" },
] as const;
