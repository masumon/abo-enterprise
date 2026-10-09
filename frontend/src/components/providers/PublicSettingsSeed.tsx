"use client";

import { seedPublicSettings } from "@/hooks/usePublicSettings";

/**
 * Hands the server-fetched hero/banner settings to usePublicSettings before
 * any page component renders (it sits above <PublicShell> in the layout), so
 * PageHero / the homepage Hero render their images in the initial HTML.
 * Renders nothing.
 */
export default function PublicSettingsSeed({ settings }: { settings: Record<string, string> }) {
  seedPublicSettings(settings);
  return null;
}
