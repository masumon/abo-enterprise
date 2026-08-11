export const LEGACY_HOME_LANE_TARGETS = {
  shop: "/products",
  services: "/#services",
  software: "/#software",
} as const;

export type LegacyHomeLane = keyof typeof LEGACY_HOME_LANE_TARGETS;

export function getLegacyHomeLaneTarget(lane: string | null | undefined): string | null {
  const normalized = lane?.trim().toLowerCase();
  if (!normalized) return null;
  return LEGACY_HOME_LANE_TARGETS[normalized as LegacyHomeLane] ?? null;
}
