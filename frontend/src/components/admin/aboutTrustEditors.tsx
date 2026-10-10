/**
 * Friendly field-editors for the about/trust settings (team, client/partner
 * logos, business registrations). Used by /sumon/about-trust — the one place
 * these are edited. Setting keys are unchanged; unknown item keys are kept by
 * JsonListEditor, so existing data is safe.
 */
import type { ReactNode } from "react";
import type { JsonListField } from "@/components/admin/JsonListEditor";

const s = (item: Record<string, unknown>, key: string): string => {
  const v = item[key];
  return v == null ? "" : String(v);
};
const nested = (item: Record<string, unknown>, key: string, sub: string): string => {
  const o = item[key];
  return o && typeof o === "object" ? String((o as Record<string, unknown>)[sub] ?? "") : "";
};

export interface TrustEditor { fields: JsonListField[]; newItem: () => Record<string, unknown>; mapKey?: string; previewRow?: (item: Record<string, unknown>) => ReactNode }

export const ABOUT_TRUST_EDITORS: Record<string, TrustEditor> = {
  // ── Team members (About page + footer developer credit) ──
  about_team_json: {
    fields: [
      { path: "name", label: "Name", labelBn: "নাম" },
      { path: "role.bn", label: "Role (BN)", labelBn: "পদ (বাংলা)" }, { path: "role.en", label: "Role (EN)", labelBn: "পদ (ইংরেজি)", translateFrom: "role.bn" },
      { path: "desc.bn", label: "Bio (BN)", labelBn: "পরিচিতি (বাংলা)", type: "textarea" }, { path: "desc.en", label: "Bio (EN)", labelBn: "পরিচিতি (ইংরেজি)", type: "textarea", translateFrom: "desc.bn" },
      { path: "image", label: "Photo", labelBn: "ছবি", type: "image", purpose: "team" },
      { path: "facebook", label: "Facebook link", labelBn: "ফেসবুক লিংক", hint: "optional — e.g. https://www.facebook.com/username (shown as a Facebook icon in the footer credit and on the About page)" },
      { path: "website", label: "Website link", labelBn: "ওয়েবসাইট লিংক", hint: "optional — portfolio or website; links the name in the footer credit" },
    ],
    newItem: () => ({ id: Date.now().toString(36), name: "", role: { en: "", bn: "" }, desc: { en: "", bn: "" }, image: "", facebook: "", website: "" }),
    previewRow: (item) => (
      <div className="text-center max-w-[180px] mx-auto">
        <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-brand-100 overflow-hidden flex items-center justify-center text-brand-700 font-bold">
          {s(item, "image") ? (
            // eslint-disable-next-line @next/next/no-img-element -- live admin preview
            <img src={s(item, "image")} alt="" className="w-full h-full object-cover" />
          ) : ((s(item, "name") || "?").charAt(0))}
        </div>
        <p className="font-bold text-sm text-heading">{s(item, "name") || "নাম"}</p>
        <p className="text-xs text-brand-600">{nested(item, "role", "bn") || nested(item, "role", "en")}</p>
        {(nested(item, "desc", "bn") || nested(item, "desc", "en")) && (
          <p className="text-xs text-muted mt-1 line-clamp-2">{nested(item, "desc", "bn") || nested(item, "desc", "en")}</p>
        )}
      </div>
    ),
  },
  client_logos_json: {
    fields: [
      { path: "name", label: "Name", labelBn: "প্রতিষ্ঠানের নাম" }, { path: "abbr", label: "Abbreviation", labelBn: "সংক্ষিপ্ত নাম (লোগো না থাকলে দেখাবে)" }, { path: "image", label: "Logo", labelBn: "লোগো", type: "image", purpose: "brand-logo" },
      { path: "desc_bn", label: "Description (BN)", labelBn: "বিবরণ (বাংলা)", type: "textarea", hint: "লোগোতে চাপলে দেখাবে" },
      { path: "desc_en", label: "Description (EN)", labelBn: "বিবরণ (ইংরেজি)", type: "textarea", translateFrom: "desc_bn" },
      { path: "href", label: "Case-study link", labelBn: "কাজের নমুনার লিংক", hint: "ঐচ্ছিক — যেমন /projects বা https://…" },
    ],
    newItem: () => ({ name: "", abbr: "", image: "", desc_en: "", desc_bn: "", href: "" }),
    previewRow: (item) => (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 w-fit mx-auto">
        {s(item, "image") ? (
          // eslint-disable-next-line @next/next/no-img-element -- live admin preview
          <img src={s(item, "image")} alt="" className="w-8 h-8 rounded-lg object-cover" />
        ) : (
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold flex items-center justify-center">{s(item, "abbr")}</span>
        )}
        <span className="text-sm font-medium text-muted">{s(item, "name") || "ক্লায়েন্ট"}</span>
      </div>
    ),
  },
  // ── Company registrations shown in the footer ──
  site_registrations_json: {
    fields: [
      { path: "label_bn", label: "Label (BN)", labelBn: "নাম (বাংলা)", placeholder: "ট্রেড লাইসেন্স" },
      { path: "label_en", label: "Label (EN)", labelBn: "নাম (ইংরেজি)", placeholder: "Trade License", translateFrom: "label_bn" },
      { path: "value", label: "Number", labelBn: "নম্বর", placeholder: "TL-456789" },
    ],
    newItem: () => ({ label_bn: "", label_en: "", value: "" }),
    previewRow: (item) => (
      <div className="px-3 py-2 rounded-xl bg-[#123562] border border-white/15 w-fit">
        <span className="block text-[10px] uppercase tracking-wide text-white/55">{s(item, "label_bn") || s(item, "label_en") || "লেবেল"}</span>
        <span className="text-[12.5px] font-semibold text-white tabular-nums">{s(item, "value") || "—"}</span>
      </div>
    ),
  },
};
