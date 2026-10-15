/**
 * Linked settings (mirror of backend/app/core/linked_settings.py).
 * MANDATORY rules are enforced by the server on every settings save; here we only tell the
 * admin in Bangla what else was switched off. OPTIONAL rules just ask, with a button.
 */
import { useToastStore } from "@/store/toast";

const NAMES: Record<string, string> = {
  feature_assistant_chat: "AI চ্যাট",
  feature_assistant_whatsapp: "AI চ্যাটের WhatsApp বোতাম",
  apon_enabled: "আপন অ্যাপ",
  apon_downloads_enabled: "আপন অ্যাপ ডাউনলোড",
  feature_coupons: "কুপন",
  assistant_feature_coupons: "AI সহকারীর কুপন",
  feature_flash_sale: "ফ্ল্যাশ সেল",
};

/** dependent → its trigger (same pairs as MANDATORY_OFF on the server). */
const TRIGGER_OF: Record<string, string> = {
  feature_assistant_whatsapp: "feature_assistant_chat",
  apon_downloads_enabled: "apon_enabled",
  assistant_feature_coupons: "feature_coupons",
};

const OPTIONAL_OFF: Record<string, { message: string; label: string; href: string }> = {
  feature_flash_sale: {
    message: "ফ্ল্যাশ সেল বন্ধ হলো। কিছু পণ্যে আলাদা ফ্ল্যাশ দাম চালু থাকতে পারে — সেগুলোও বন্ধ করবেন?",
    label: "পণ্য দেখুন",
    href: "/sumon/products",
  },
};

const isOff = (v: unknown) => ["false", "0", "off", "no", ""].includes(String(v ?? "").trim().toLowerCase());

/** Called after a successful settings save with what was sent and what the server returned. */
export function notifyLinkedSettings(
  sent: { key: string; value: string }[],
  saved: { key: string; value: string; linked?: boolean }[] | undefined,
): void {
  const push = useToastStore.getState().push;
  const turnedOff = sent.filter((i) => isOff(i.value)).map((i) => i.key);
  for (const dep of (saved ?? []).filter((r) => r.linked)) {
    const trigger = TRIGGER_OF[dep.key] ?? "";
    push("info", `${NAMES[trigger] ?? "একটি সেটিং"} বন্ধ হওয়ায় ${NAMES[dep.key] ?? dep.key}-ও বন্ধ হলো।`);
  }
  for (const key of turnedOff) {
    const rule = OPTIONAL_OFF[key];
    if (rule) push("info", rule.message, { label: rule.label, href: rule.href });
  }
}
