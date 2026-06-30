import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { BRAND_APP_ICON, BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";

export function useBrandLogo() {
  const { settings } = usePublicSettings(["logo_url", "site_name"]);
  return {
    logoUrl: getSettingValue(settings, "logo_url", BRAND_LOGO_PATH),
    appIconUrl: BRAND_APP_ICON,
    alt: getSettingValue(settings, "site_name", BRAND_NAME),
  };
}
