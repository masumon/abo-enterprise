import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import type { LegalSection } from "@/components/layout/LegalPageLayout";

/**
 * Admin-edited replacement for a legal page's body (Settings keys
 * legal_<pageKey>_content_en/bn — edited from /sumon/legal-pages). Returns
 * null when the admin hasn't edited this page, so the caller falls back to
 * its own hard-coded, professionally-drafted default text unchanged.
 */
export function useLegalPageOverride(pageKey: string, title: string, isBn: boolean): LegalSection[] | null {
  const enKey = `legal_${pageKey}_content_en`;
  const bnKey = `legal_${pageKey}_content_bn`;
  const { settings } = usePublicSettings([enKey, bnKey]);
  const en = getSettingValue(settings, enKey);
  const bn = getSettingValue(settings, bnKey);
  const text = (isBn ? bn || en : en || bn).trim();
  if (!text) return null;
  return [{ id: "content", title, content: <div className="whitespace-pre-line leading-relaxed">{text}</div> }];
}
