import { getSettingValue } from "@/hooks/usePublicSettings";

export const ABOUT_TEAM_KEY = "about_team_json";
export const CLIENT_LOGOS_KEY = "client_logos_json";
export const ABOUT_STORY_IMAGE_KEY = "about_story_image_url";
// Homepage section overrides — the `site_` prefix is publicly readable via
// GET /api/v1/settings, so no backend change is needed for these keys.
export const SITE_ANNOUNCEMENTS_KEY = "site_announcements_json";
export const SITE_TRUST_BADGES_KEY = "site_trust_badges_json";
export const SITE_WHY_CHOOSE_KEY = "site_why_choose_json";
export const SITE_FAQ_KEY = "site_faq_json";
export const SITE_QUICK_CATEGORIES_KEY = "site_quick_categories_json";
export const SITE_ENTRY_POINTS_KEY = "site_entry_points_json";
export const SITE_REGISTRATIONS_KEY = "site_registrations_json";
export const SITE_CAREER_POSITIONS_KEY = "site_career_positions_json";

export interface CmsTeamMember {
  id: string;
  name: string;
  image?: string;
  role: { en: string; bn: string };
  desc: { en: string; bn: string };
  /** Optional public profile links (admin: Settings → Team Members). */
  facebook?: string;
  website?: string;
}

/** Add https:// to a bare "www.…"/"facebook.com/…" link; returns "" for empty/unsafe input. */
export function normalizeExternalUrl(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  const hasHttp = /^https?:\/\//i.test(v);
  const hasOtherScheme = /^[a-z][a-z0-9+.-]*:/i.test(v);
  const withScheme = hasHttp ? v : hasOtherScheme ? "" : `https://${v.replace(/^\/+/, "")}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export type CreditKind = "developer" | "design";

const DEV_ROLE_RE = /developer|engineer|ডেভেলপার|প্রকৌশলী/i;
const DESIGN_ROLE_RE = /designer|creative|design|ডিজাইনার|সৃজনশীল|ডিজাইন/i;

/**
 * Team members shown in the footer's developer credit, derived from their
 * admin-entered role text (developer / designer / creative) so nothing is
 * hard-coded. Developers come first.
 */
export function getCreditMembers(team: CmsTeamMember[]): { member: CmsTeamMember; kind: CreditKind }[] {
  const out: { member: CmsTeamMember; kind: CreditKind }[] = [];
  for (const member of team) {
    const roleText = `${member.role?.en ?? ""} ${member.role?.bn ?? ""}`;
    if (DEV_ROLE_RE.test(roleText)) out.push({ member, kind: "developer" });
    else if (DESIGN_ROLE_RE.test(roleText)) out.push({ member, kind: "design" });
  }
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "developer" ? -1 : 1));
}

export interface CmsClientLogo {
  name: string;
  abbr: string;
  image?: string;
  /** Detailed case-study text shown when the logo is tapped (optional). */
  desc_en?: string;
  desc_bn?: string;
  /** Optional external/internal link for a "case study" CTA. */
  href?: string;
}

/** Announcement bar variant themes (admin-selectable per entry). */
export type CmsAnnouncementVariant =
  | "promo" | "offer" | "info" | "success" | "notice" | "urgent";

/** Rotating announcement bar message. `variant`/`icon`/`dismissible` are
 * optional — older entries without them fall back to the default promo look. */
export interface CmsAnnouncement {
  en: string;
  bn: string;
  href: string;
  variant?: CmsAnnouncementVariant;
  /** Emoji or short label rendered before the text. */
  icon?: string;
  dismissible?: boolean;
  /** Hidden from the bar when explicitly false. */
  active?: boolean;
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

/** Open job position — admin-managed, was previously wired to nothing (the
 * Careers page's fetchPositions was a permanent no-op). */
export interface CmsCareerPosition {
  id: string;
  title: { en: string; bn: string };
  type: { en: string; bn: string };
  location: { en: string; bn: string };
  active?: boolean;
}

export function getCareerPositions(settings: Record<string, string>, fallback: CmsCareerPosition[]): CmsCareerPosition[] {
  return parseJsonArray<CmsCareerPosition>(getSettingValue(settings, SITE_CAREER_POSITIONS_KEY), fallback)
    .filter((p) => p.active !== false);
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

/** Company registration / licence numbers shown in the footer. */
export interface CmsRegistration {
  label_en: string;
  label_bn: string;
  value: string;
}

export function getRegistrations(
  settings: Record<string, string>,
  fallback: CmsRegistration[] = []
): CmsRegistration[] {
  return parseJsonArray<CmsRegistration>(getSettingValue(settings, SITE_REGISTRATIONS_KEY), fallback)
    .filter((r) => r && r.value?.trim() && (r.label_en || r.label_bn));
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
