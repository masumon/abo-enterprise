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
  descBn?: string;
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
    descBn: "হোমপেজের একদম উপরের অংশ (হিরো) — শিরোনাম, ছোট লেখা ও বাটন। ছবি বদলাতে নিচের \"হিরো ছবি\" লিংক ব্যবহার করুন।",
    fields: [
      { key: "hero_title_en", label: "Title (EN)", labelBn: "শিরোনাম (EN)", placeholder: "ABO ENTERPRISE : Simple Solution", hint: "Big headline for English visitors. Empty = built-in brand title.", hintBn: "ইংরেজি ভিজিটরদের জন্য বড় শিরোনাম। খালি রাখলে ডিফল্ট ব্র্যান্ড-শিরোনাম দেখাবে।", dataType: "string" },
      { key: "hero_title_bn", label: "Title (BN)", labelBn: "শিরোনাম (বাংলা)", placeholder: "এবিও এন্টারপ্রাইজ : সহজ সমাধান", hint: "Big headline for Bangla visitors (desktop hero).", hintBn: "বাংলা ভিজিটরদের বড় শিরোনাম (ডেস্কটপ হিরোতে দেখায়)। ছোট রাখুন — ২-৬ শব্দ।", dataType: "string" },
      { key: "hero_subtitle_en", label: "Subtitle (EN)", labelBn: "সাবটাইটেল (EN)", type: "textarea", placeholder: "Simple Solution — products, services, software & AI in one place.", hint: "One or two short lines under the headline.", hintBn: "শিরোনামের নিচের ছোট লেখা (ইংরেজি)। ১-২ লাইন যথেষ্ট।", dataType: "string" },
      { key: "hero_subtitle_bn", label: "Subtitle (BN)", labelBn: "সাবটাইটেল (বাংলা)", type: "textarea", placeholder: "সহজ সমাধান — পণ্য, সেবা, সফটওয়্যার ও AI এক প্ল্যাটফর্মে।", hint: "Short line under the headline (Bangla).", hintBn: "শিরোনামের নিচের ছোট লেখা (বাংলা)। খালি রাখলে ডিফল্ট লেখা দেখাবে।", dataType: "string" },
      { key: "hero_cta_text", label: "Button Text", labelBn: "বাটন লেখা", placeholder: "Shop Now", hint: "Text on the second hero button. Empty = \"Products\".", hintBn: "হিরোর দ্বিতীয় বাটনের লেখা। খালি = \"পণ্য দেখুন\"।", dataType: "string" },
      { key: "hero_cta_url", label: "Button Link", labelBn: "বাটন লিংক", type: "url", placeholder: "/products", hint: "Where that button goes — a site path starting with /, e.g. /products.", hintBn: "বাটনে চাপলে কোথায় যাবে — / দিয়ে শুরু করুন, যেমন /products। অন্য ওয়েবসাইটের লিংক চলবে না।", dataType: "string" },
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
      { key: "flash_sale_title_en", label: "Title (EN)", labelBn: "শিরোনাম (EN)", placeholder: "Flash Sale", hint: "Banner title for English visitors.", hintBn: "ইংরেজি ভিজিটরদের জন্য ব্যানারের শিরোনাম।", dataType: "string" },
      { key: "flash_sale_title_bn", label: "Title (BN)", labelBn: "শিরোনাম (বাংলা)", placeholder: "ফ্ল্যাশ সেল", hint: "Banner title for Bangla visitors.", hintBn: "বাংলা ভিজিটরদের জন্য ব্যানারের শিরোনাম।", dataType: "string" },
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
    descBn: "হোমপেজে ছোট আস্থা-ব্যাজ (অভিজ্ঞতা, সাপোর্ট, পেমেন্ট…)। প্রতিটিতে একটি আইকন ও লেখা দিন।",
    fields: [
      { path: "icon", label: "Icon", labelBn: "আইকন", type: "icon", hint: ICON_HINT },
      { path: "en", label: "Label (EN)", labelBn: "লেবেল (EN)", translateFrom: "bn" },
      { path: "bn", label: "Label (BN)", labelBn: "লেবেল (বাংলা)" },
    ],
    newItem: () => ({ icon: "award", en: "", bn: "" }),
  },
  {
    key: "site_why_choose_json",
    title: "Why Choose Us",
    titleBn: "কেন আমরা",
    desc: "Feature cards explaining why customers should pick you.",
    descBn: "কেন কাস্টমার আপনাকে বেছে নেবে — সেই কারণগুলো কার্ড আকারে। আইকন, শিরোনাম ও বিবরণ দিন।",
    fields: [
      { path: "icon", label: "Icon", labelBn: "আইকন", type: "icon", hint: ICON_HINT },
      { path: "title_en", label: "Title (EN)", labelBn: "শিরোনাম (EN)", translateFrom: "title_bn" },
      { path: "title_bn", label: "Title (BN)", labelBn: "শিরোনাম (বাংলা)" },
      { path: "desc_en", label: "Description (EN)", labelBn: "বিবরণ (EN)", type: "textarea", translateFrom: "desc_bn" },
      { path: "desc_bn", label: "Description (BN)", labelBn: "বিবরণ (বাংলা)", type: "textarea" },
    ],
    newItem: () => ({ icon: "award", title_en: "", title_bn: "", desc_en: "", desc_bn: "" }),
  },
  {
    key: "site_faq_json",
    title: "FAQ",
    titleBn: "প্রশ্নোত্তর",
    desc: "Questions shown on the homepage and the FAQ page.",
    descBn: "হোমপেজ ও FAQ পেজে দেখানো প্রশ্ন-উত্তর। প্রশ্ন ও উত্তর দুই ভাষায় দিন।",
    fields: [
      { path: "q_en", label: "Question (EN)", labelBn: "প্রশ্ন (EN)", translateFrom: "q_bn" },
      { path: "q_bn", label: "Question (BN)", labelBn: "প্রশ্ন (বাংলা)" },
      { path: "a_en", label: "Answer (EN)", labelBn: "উত্তর (EN)", type: "textarea", translateFrom: "a_bn" },
      { path: "a_bn", label: "Answer (BN)", labelBn: "উত্তর (বাংলা)", type: "textarea" },
      { path: "category", label: "Category", labelBn: "ক্যাটাগরি", hint: "general, products, services, software, payment, shipping" },
    ],
    newItem: () => ({ q_en: "", q_bn: "", a_en: "", a_bn: "", category: "general" }),
  },
  {
    key: "site_quick_categories_json",
    title: "Quick Category Tiles",
    titleBn: "কুইক ক্যাটাগরি",
    desc: "The tappable category shortcuts near the top of the homepage.",
    descBn: "হোমপেজের উপরের দিকের ক্যাটাগরি শর্টকাট (দোকান/সেবা/সফটওয়্যার)। আইকন, নাম ও লিংক দিন।",
    fields: [
      { path: "icon", label: "Icon", labelBn: "আইকন", type: "icon", hint: ICON_HINT },
      { path: "label_en", label: "Label (EN)", labelBn: "লেবেল (EN)", translateFrom: "label_bn" },
      { path: "label_bn", label: "Label (BN)", labelBn: "লেবেল (বাংলা)" },
      { path: "desc_en", label: "Description (EN)", labelBn: "বিবরণ (EN)", translateFrom: "desc_bn" },
      { path: "desc_bn", label: "Description (BN)", labelBn: "বিবরণ (বাংলা)" },
      { path: "href", label: "Link", labelBn: "লিংক", hint: "e.g. /products" },
    ],
    newItem: () => ({ icon: "smartphone", label_en: "", label_bn: "", desc_en: "", desc_bn: "", href: "/products" }),
  },
  {
    key: "site_entry_points_json",
    title: "Entry Point Cards",
    titleBn: "এন্ট্রি পয়েন্ট কার্ড",
    desc: "The large call-to-action cards (Shop, Book, Software…).",
    descBn: "বড় অ্যাকশন কার্ড (কিনুন, বুক করুন, সফটওয়্যার…)। আইকন, শিরোনাম, বিবরণ, বাটন ও লিংক দিন।",
    fields: [
      { path: "icon", label: "Icon", labelBn: "আইকন", type: "icon", hint: ICON_HINT },
      { path: "title_en", label: "Title (EN)", labelBn: "শিরোনাম (EN)", translateFrom: "title_bn" },
      { path: "title_bn", label: "Title (BN)", labelBn: "শিরোনাম (বাংলা)" },
      { path: "desc_en", label: "Description (EN)", labelBn: "বিবরণ (EN)", type: "textarea", translateFrom: "desc_bn" },
      { path: "desc_bn", label: "Description (BN)", labelBn: "বিবরণ (বাংলা)", type: "textarea" },
      { path: "cta_en", label: "Button (EN)", labelBn: "বাটন (EN)", translateFrom: "cta_bn" },
      { path: "cta_bn", label: "Button (BN)", labelBn: "বাটন (বাংলা)" },
      { path: "href", label: "Link", labelBn: "লিংক", hint: "e.g. /products" },
    ],
    newItem: () => ({ icon: "package", title_en: "", title_bn: "", desc_en: "", desc_bn: "", cta_en: "", cta_bn: "", href: "/" }),
  },
];
