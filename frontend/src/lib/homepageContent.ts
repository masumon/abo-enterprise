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

const ICON_HINT = "lucide name or emoji";

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
