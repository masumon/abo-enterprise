import { getSettingValue } from "@/hooks/usePublicSettings";

export const ABOUT_TEAM_KEY = "about_team_json";
export const CLIENT_LOGOS_KEY = "client_logos_json";
export const DEMO_REVIEWS_KEY = "demo_reviews_json";
export const ABOUT_STORY_IMAGE_KEY = "about_story_image_url";

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
