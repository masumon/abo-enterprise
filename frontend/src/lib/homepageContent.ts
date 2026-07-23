import type { JsonListField } from "@/components/admin/JsonListEditor";

/**
 * Config for the Homepage Content module — the homepage sections that used to
 * be raw-JSON textareas buried in Settings. Each entry drives a friendly
 * row-based JsonListEditor (add/reorder/delete, no JSON typing), stored in the
 * same `*_json` settings key as before.
 */
export interface HomepageContentEditor {
  key: string;
  title: string;
  titleBn: string;
  desc: string;
  fields: JsonListField[];
  newItem: () => Record<string, unknown>;
}

/** A single scalar setting (string/boolean/datetime) shown on Homepage Content. */
export interface HomepageScalarField {
  key: string;
  label: string;
  labelBn: string;
  type?: "text" | "textarea" | "url" | "boolean" | "datetime-local";
  placeholder?: string;
  hint?: string;
  hintBn?: string;
  /** Setting `data_type` used when saving. */
  dataType: "string" | "boolean";
}

/** A titled group of scalar fields (Hero text, Flash Sale). */
export interface HomepageScalarGroup {
  id: string;
  title: string;
  titleBn: string;
  desc: string;
  descBn: string;
  fields: HomepageScalarField[];
}

const ICON_HINT = "lucide name or emoji";

/**
 * Hero copy + Flash Sale scalars — these used to live in Settings, but they are
 * homepage content, so they belong here alongside the section editors. The
 * setting keys are unchanged (`hero_*`, `flash_sale_*`, `feature_flash_sale`),
 * so the website reads them exactly as before.
 */
export const HOMEPAGE_SCALAR_GROUPS: HomepageScalarGroup[] = [
  {
    id: "hero",
    title: "Homepage Hero Text",
    titleBn: "হোমপেজ হিরো লেখা",
    desc: "The headline, subtitle & main button of the homepage banner.",
    descBn: "হোমপেজ ব্যানারের শিরোনাম, সাবটাইটেল ও মূল বাটন। (ব্যানার ছবি → Image Manager)",
    fields: [
      { key: "hero_title_en", label: "Title (EN)", labelBn: "শিরোনাম (EN)", placeholder: "ABO ENTERPRISE : Simple Solution", dataType: "string" },
      { key: "hero_title_bn", label: "Title (BN)", labelBn: "শিরোনাম (বাংলা)", placeholder: "এবিও এন্টারপ্রাইজ : সহজ সমাধান", dataType: "string" },
      { key: "hero_subtitle_en", label: "Subtitle (EN)", labelBn: "সাবটাইটেল (EN)", type: "textarea", placeholder: "Simple Solution — products, services, software & AI in one place.", dataType: "string" },
      { key: "hero_subtitle_bn", label: "Subtitle (BN)", labelBn: "সাবটাইটেল (বাংলা)", type: "textarea", placeholder: "সহজ সমাধান — পণ্য, সেবা, সফটওয়্যার ও AI এক প্ল্যাটফর্মে।", dataType: "string" },
      { key: "hero_cta_text", label: "Button Text", labelBn: "বাটন লেখা", placeholder: "Shop Now", dataType: "string" },
      { key: "hero_cta_url", label: "Button Link", labelBn: "বাটন লিংক", type: "url", placeholder: "/products", dataType: "string" },
    ],
  },
  {
    id: "flash_sale",
    title: "Flash Sale",
    titleBn: "ফ্ল্যাশ সেল",
    desc: "The homepage countdown banner.",
    descBn: "হোমপেজের কাউন্টডাউন ব্যানার।",
    fields: [
      { key: "feature_flash_sale", label: "Enable Flash Sale", labelBn: "ফ্ল্যাশ সেল চালু", type: "boolean", hint: "Shows the homepage countdown banner", hintBn: "হোমপেজে কাউন্টডাউন ব্যানার দেখায়", dataType: "boolean" },
      { key: "flash_sale_title_en", label: "Title (EN)", labelBn: "শিরোনাম (EN)", placeholder: "Flash Sale", dataType: "string" },
      { key: "flash_sale_title_bn", label: "Title (BN)", labelBn: "শিরোনাম (বাংলা)", placeholder: "ফ্ল্যাশ সেল", dataType: "string" },
      { key: "flash_sale_start", label: "Start (optional)", labelBn: "শুরু (ঐচ্ছিক)", type: "datetime-local", hint: "Leave blank to start immediately", hintBn: "খালি রাখলে এখনই শুরু", dataType: "string" },
      { key: "flash_sale_end", label: "End", labelBn: "শেষ", type: "datetime-local", hint: "Countdown target. Blank = end of this week (Sun 23:59).", hintBn: "কাউন্টডাউন লক্ষ্য। খালি = এই সপ্তাহের শেষ (রবি ২৩:৫৯)।", dataType: "string" },
    ],
  },
];

/** Flat list of every scalar key + its data type, for load/save. */
export const HOMEPAGE_SCALAR_FIELDS: HomepageScalarField[] =
  HOMEPAGE_SCALAR_GROUPS.flatMap((g) => g.fields);

export const HOMEPAGE_CONTENT_EDITORS: HomepageContentEditor[] = [
  {
    key: "site_trust_badges_json",
    title: "Trust Badges",
    titleBn: "ট্রাস্ট ব্যাজ",
    desc: "Small badges shown across the homepage (years, support, payment…).",
    fields: [
      { path: "icon", label: "Icon", type: "icon", hint: ICON_HINT },
      { path: "en", label: "Label (EN)" },
      { path: "bn", label: "Label (BN)" },
    ],
    newItem: () => ({ icon: "award", en: "", bn: "" }),
  },
  {
    key: "site_why_choose_json",
    title: "Why Choose Us",
    titleBn: "কেন আমরা",
    desc: "Feature cards explaining why customers should pick you.",
    fields: [
      { path: "icon", label: "Icon", type: "icon", hint: ICON_HINT },
      { path: "title_en", label: "Title (EN)" },
      { path: "title_bn", label: "Title (BN)" },
      { path: "desc_en", label: "Description (EN)", type: "textarea" },
      { path: "desc_bn", label: "Description (BN)", type: "textarea" },
    ],
    newItem: () => ({ icon: "award", title_en: "", title_bn: "", desc_en: "", desc_bn: "" }),
  },
  {
    key: "site_faq_json",
    title: "FAQ",
    titleBn: "প্রশ্নোত্তর",
    desc: "Questions shown on the homepage and the FAQ page.",
    fields: [
      { path: "q_en", label: "Question (EN)" },
      { path: "q_bn", label: "Question (BN)" },
      { path: "a_en", label: "Answer (EN)", type: "textarea" },
      { path: "a_bn", label: "Answer (BN)", type: "textarea" },
      { path: "category", label: "Category", hint: "general, products, services, software, payment, shipping" },
    ],
    newItem: () => ({ q_en: "", q_bn: "", a_en: "", a_bn: "", category: "general" }),
  },
  {
    key: "site_quick_categories_json",
    title: "Quick Category Tiles",
    titleBn: "কুইক ক্যাটাগরি",
    desc: "The tappable category shortcuts near the top of the homepage.",
    fields: [
      { path: "icon", label: "Icon", type: "icon", hint: ICON_HINT },
      { path: "label_en", label: "Label (EN)" },
      { path: "label_bn", label: "Label (BN)" },
      { path: "desc_en", label: "Description (EN)" },
      { path: "desc_bn", label: "Description (BN)" },
      { path: "href", label: "Link", hint: "e.g. /products" },
    ],
    newItem: () => ({ icon: "smartphone", label_en: "", label_bn: "", desc_en: "", desc_bn: "", href: "/products" }),
  },
  {
    key: "site_entry_points_json",
    title: "Entry Point Cards",
    titleBn: "এন্ট্রি পয়েন্ট কার্ড",
    desc: "The large call-to-action cards (Shop, Book, Software…).",
    fields: [
      { path: "icon", label: "Icon", type: "icon", hint: ICON_HINT },
      { path: "title_en", label: "Title (EN)" },
      { path: "title_bn", label: "Title (BN)" },
      { path: "desc_en", label: "Description (EN)", type: "textarea" },
      { path: "desc_bn", label: "Description (BN)", type: "textarea" },
      { path: "cta_en", label: "Button (EN)" },
      { path: "cta_bn", label: "Button (BN)" },
      { path: "href", label: "Link", hint: "e.g. /products" },
    ],
    newItem: () => ({ icon: "package", title_en: "", title_bn: "", desc_en: "", desc_bn: "", cta_en: "", cta_bn: "", href: "/" }),
  },
];
