import { getSettingValue } from "@/hooks/usePublicSettings";

export const ABOUT_TEAM_KEY = "about_team_json";
export const CLIENT_LOGOS_KEY = "client_logos_json";
export const DEMO_REVIEWS_KEY = "demo_reviews_json";
export const ABOUT_STORY_IMAGE_KEY = "about_story_image_url";
// Homepage section overrides — the `site_` prefix is publicly readable via
// GET /api/v1/settings, so no backend change is needed for these keys.
export const SITE_ANNOUNCEMENTS_KEY = "site_announcements_json";
export const SITE_TRUST_BADGES_KEY = "site_trust_badges_json";
export const SITE_WHY_CHOOSE_KEY = "site_why_choose_json";
export const SITE_FAQ_KEY = "site_faq_json";
export const SITE_QUICK_CATEGORIES_KEY = "site_quick_categories_json";
export const SITE_ENTRY_POINTS_KEY = "site_entry_points_json";

export interface CmsTeamMember {
  id: string;
  name: string;
  image?: string;
  role: { en: string; bn: string };
  desc: { en: string; bn: string };
}

export interface CmsClientLogo {
  name: string;
  abbr: string;
  image?: string;
}

/** Rotating announcement bar message. */
export interface CmsAnnouncement {
  en: string;
  bn: string;
  href: string;
}

/** Trust badge / "why choose us" style item. Icon is a lucide name key
 * resolved against each component's own icon map (unknown → default). */
export interface CmsIconLabel {
  icon?: string;
  en: string;
  bn: string;
}

export interface CmsReason {
  icon?: string;
  title_en: string;
  title_bn: string;
  desc_en: string;
  desc_bn: string;
}

export interface CmsFaqItem {
  q_en: string;
  q_bn: string;
  a_en: string;
  a_bn: string;
  category?: string;
}

/** Quick-category vertical tile (homepage, under the hero). */
export interface CmsQuickCategory {
  icon?: string;
  label_en: string;
  label_bn: string;
  desc_en: string;
  desc_bn: string;
  href: string;
}

/** Homepage entry-point card (3-path navigation). */
export interface CmsEntryPoint {
  icon?: string;
  title_en: string;
  title_bn: string;
  desc_en: string;
  desc_bn: string;
  cta_en: string;
  cta_bn: string;
  href: string;
  tags_en?: string[];
  tags_bn?: string[];
}

function parseJsonArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function getAboutTeam(settings: Record<string, string>, fallback: CmsTeamMember[]): CmsTeamMember[] {
  return parseJsonArray(getSettingValue(settings, ABOUT_TEAM_KEY), fallback);
}

export function getClientLogos(settings: Record<string, string>, fallback: CmsClientLogo[]): CmsClientLogo[] {
  return parseJsonArray(getSettingValue(settings, CLIENT_LOGOS_KEY), fallback);
}

export function getAboutStoryImage(settings: Record<string, string>): string {
  return getSettingValue(settings, ABOUT_STORY_IMAGE_KEY);
}

export function getAnnouncements(settings: Record<string, string>, fallback: CmsAnnouncement[]): CmsAnnouncement[] {
  return parseJsonArray<CmsAnnouncement>(getSettingValue(settings, SITE_ANNOUNCEMENTS_KEY), fallback)
    .filter((a) => a && (a.en || a.bn));
}

export function getTrustBadges(settings: Record<string, string>, fallback: CmsIconLabel[]): CmsIconLabel[] {
  return parseJsonArray<CmsIconLabel>(getSettingValue(settings, SITE_TRUST_BADGES_KEY), fallback)
    .filter((b) => b && (b.en || b.bn));
}

export function getWhyChooseReasons(settings: Record<string, string>, fallback: CmsReason[]): CmsReason[] {
  return parseJsonArray<CmsReason>(getSettingValue(settings, SITE_WHY_CHOOSE_KEY), fallback)
    .filter((r) => r && (r.title_en || r.title_bn));
}

export function getSiteFaq(settings: Record<string, string>, fallback: CmsFaqItem[]): CmsFaqItem[] {
  return parseJsonArray<CmsFaqItem>(getSettingValue(settings, SITE_FAQ_KEY), fallback)
    .filter((f) => f && (f.q_en || f.q_bn) && (f.a_en || f.a_bn));
}

export function getQuickCategories(settings: Record<string, string>, fallback: CmsQuickCategory[]): CmsQuickCategory[] {
  return parseJsonArray<CmsQuickCategory>(getSettingValue(settings, SITE_QUICK_CATEGORIES_KEY), fallback)
    .filter((c) => c && (c.label_en || c.label_bn) && !!c.href);
}

export function getEntryPoints(settings: Record<string, string>, fallback: CmsEntryPoint[]): CmsEntryPoint[] {
  return parseJsonArray<CmsEntryPoint>(getSettingValue(settings, SITE_ENTRY_POINTS_KEY), fallback)
    .filter((e) => e && (e.title_en || e.title_bn) && !!e.href);
}
