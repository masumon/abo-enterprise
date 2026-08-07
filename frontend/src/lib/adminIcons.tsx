"use client";

import {
  Shield, Truck, Lock, RotateCcw, Award, Headphones, ShoppingBag, Wrench,
  Laptop, Package, Smartphone, type LucideIcon,
} from "lucide-react";

/**
 * The icon names the homepage components actually render (Why Choose Us,
 * Category tiles, Entry cards, Trust badges). Offered in the admin icon picker
 * so a non-technical admin picks visually instead of typing a name. Anything
 * else (e.g. an emoji) is rendered as literal text by AdminIcon and the site
 * components, so emojis work everywhere too.
 */
export const ADMIN_ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "award", Icon: Award },
  { name: "shield", Icon: Shield },
  { name: "truck", Icon: Truck },
  { name: "headphones", Icon: Headphones },
  { name: "lock", Icon: Lock },
  { name: "rotate-ccw", Icon: RotateCcw },
  { name: "shopping-bag", Icon: ShoppingBag },
  { name: "wrench", Icon: Wrench },
  { name: "laptop", Icon: Laptop },
  { name: "smartphone", Icon: Smartphone },
  { name: "package", Icon: Package },
];

/** A few one-tap emojis for admins who prefer them (always render everywhere). */
export const ADMIN_EMOJI_OPTIONS = ["🏆", "🛡️", "🚚", "🎧", "🔒", "⭐", "✅", "⚡", "🎁", "💳", "📦", "🛍️", "🔧", "💻", "📱", "🚀"];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ADMIN_ICON_OPTIONS.map((o) => [o.name, o.Icon])
);

/**
 * Render a CMS icon value the same way the site does: a known lucide name → the
 * icon; anything else (emoji / custom text) → shown literally; empty → a neutral
 * default. Use this in previews so what the admin sees matches the website.
 */
export function AdminIcon({ name, className }: { name?: string; className?: string }) {
  const key = (name ?? "").trim();
  const Icon = ICON_MAP[key];
  if (Icon) return <Icon className={className} aria-hidden />;
  if (key) return <span className={className} aria-hidden>{key}</span>;
  return <Award className={className} aria-hidden />;
}
