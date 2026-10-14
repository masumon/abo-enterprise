/**
 * Plain-language helpers for the service booking-form builder: Bangla type
 * names, ready-made question sets, validation presets and automatic machine
 * names — so a non-technical admin never types `field_name` or a regex.
 * Every value written here is one the booking engine already understands
 * (core/booking_form.py); nothing new is stored.
 */
import type { ServiceBookingFormField } from "@/types";

export type FieldDraft = Partial<ServiceBookingFormField>;

export const FIELD_TYPES: { value: string; icon: string; bn: string; en: string }[] = [
  { value: "text", icon: "📝", bn: "ছোট লেখা", en: "Short text" },
  { value: "textarea", icon: "📄", bn: "বড় লেখা", en: "Long text" },
  { value: "number", icon: "🔢", bn: "সংখ্যা", en: "Number" },
  { value: "select", icon: "🔽", bn: "তালিকা থেকে একটি", en: "Dropdown (one)" },
  { value: "radio", icon: "🔘", bn: "একটি বাছাই (বোতাম)", en: "Choose one (buttons)" },
  { value: "multiselect", icon: "☑️", bn: "একাধিক বাছাই", en: "Choose many" },
  { value: "checkbox", icon: "✅", bn: "হ্যাঁ/না টিক", en: "Yes/No tick" },
  { value: "date", icon: "📅", bn: "তারিখ", en: "Date" },
  { value: "datetime", icon: "🕒", bn: "তারিখ ও সময়", en: "Date & time" },
  { value: "file", icon: "📎", bn: "ফাইল/ছবি পাঠানো", en: "File / photo" },
  { value: "phone", icon: "📞", bn: "ফোন নম্বর", en: "Phone" },
  { value: "email", icon: "✉️", bn: "ইমেইল", en: "E-mail" },
  { value: "url", icon: "🔗", bn: "লিংক", en: "Link" },
];

export const typeMeta = (v?: string) => FIELD_TYPES.find((t) => t.value === v) ?? FIELD_TYPES[0];
export const hasOptions = (v?: string) => ["select", "multiselect", "radio"].includes(v ?? "");

/** Validation presets → validation_rules (pattern + Bangla message). */
export const VALIDATION_PRESETS: { id: string; bn: string; rules: Record<string, unknown> | null }[] = [
  { id: "", bn: "কোনো শর্ত নেই", rules: null },
  { id: "bd_phone", bn: "বাংলাদেশি মোবাইল নম্বর", rules: { pattern: "^(?:\\+?88)?01[3-9]\\d{8}$", pattern_message: "সঠিক মোবাইল নম্বর দিন (যেমন 017XXXXXXXX)" } },
  { id: "nid", bn: "জাতীয় পরিচয়পত্র (NID) নম্বর", rules: { pattern: "^(\\d{10}|\\d{13}|\\d{17})$", pattern_message: "১০, ১৩ বা ১৭ অঙ্কের NID নম্বর দিন" } },
  { id: "digits", bn: "শুধু সংখ্যা", rules: { pattern: "^[0-9০-৯]+$", pattern_message: "শুধু সংখ্যা লিখুন" } },
  { id: "short", bn: "ছোট উত্তর (সর্বোচ্চ ১০০ অক্ষর)", rules: { max_length: 100 } },
  { id: "detail", bn: "বিস্তারিত উত্তর (কমপক্ষে ১০ অক্ষর)", rules: { min_length: 10 } },
];

export function presetOf(rules?: Record<string, unknown> | null): string {
  if (!rules || !Object.keys(rules).length) return "";
  const hit = VALIDATION_PRESETS.find((p) => p.rules && JSON.stringify(p.rules) === JSON.stringify(rules));
  return hit ? hit.id : "custom";
}

/** "সাদা-কালো" + "Black & white" → "সাদা-কালো (Black & white)"; same text once. */
export function optionLabel(bn: string, en: string): string {
  const b = (bn || "").trim();
  const e = (en || "").trim();
  if (!b || !e || b.toLowerCase() === e.toLowerCase()) return b || e;
  return `${b} (${e})`;
}

/** Machine name from the English (or any) label; unique within `taken`. */
export function nameFromLabel(label: string, taken: string[]): string {
  const base = (label || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "question";
  let name = base;
  for (let i = 2; taken.includes(name); i++) name = `${base}_${i}`;
  return name;
}

const opt = (...pairs: [string, string][]) => pairs.map(([bn, en]) => optionLabel(bn, en));

/** Ready-made question sets the admin can add with one tap. */
export const FIELD_TEMPLATES: { id: string; icon: string; bn: string; fields: FieldDraft[] }[] = [
  {
    id: "printing", icon: "🖨️", bn: "প্রিন্টিং ও ফটোকপি",
    fields: [
      { field_label_bn: "কী প্রিন্ট/কপি করবেন", field_label_en: "What to print / copy", field_type: "select", is_required: true, options: opt(["সাদা-কালো প্রিন্ট", "Black & white print"], ["কালার প্রিন্ট", "Colour print"], ["ফটোকপি", "Photocopy"], ["ছবি প্রিন্ট", "Photo print"]) },
      { field_label_bn: "কাগজের সাইজ", field_label_en: "Paper size", field_type: "radio", is_required: true, options: opt(["A4", "A4"], ["A3", "A3"], ["Legal", "Legal"], ["অন্য", "Other"]) },
      { field_label_bn: "পৃষ্ঠার সংখ্যা", field_label_en: "Number of pages", field_type: "number", is_required: true, validation_rules: { min: 1 } },
      { field_label_bn: "কপির সংখ্যা", field_label_en: "Number of copies", field_type: "number", is_required: true, default_value: "1", validation_rules: { min: 1 } },
      { field_label_bn: "ফাইল পাঠান", field_label_en: "Upload your file", field_type: "file" },
      { field_label_bn: "বিশেষ নির্দেশনা", field_label_en: "Special instructions", field_type: "textarea" },
    ],
  },
  {
    id: "repair", icon: "🔧", bn: "মেরামত / সার্ভিসিং",
    fields: [
      { field_label_bn: "ডিভাইসের ধরন", field_label_en: "Device type", field_type: "select", is_required: true, options: opt(["মোবাইল", "Mobile"], ["ল্যাপটপ", "Laptop"], ["কম্পিউটার", "Computer"], ["প্রিন্টার", "Printer"], ["অন্য", "Other"]) },
      { field_label_bn: "ব্র্যান্ড ও মডেল", field_label_en: "Brand & model", field_type: "text", is_required: true, placeholder: "যেমন: Samsung A15" },
      { field_label_bn: "কী সমস্যা হচ্ছে", field_label_en: "What is the problem", field_type: "textarea", is_required: true, validation_rules: { min_length: 10 } },
      { field_label_bn: "সমস্যার ছবি/ভিডিও", field_label_en: "Photo / video of the problem", field_type: "file" },
      { field_label_bn: "ওয়ারেন্টি আছে?", field_label_en: "Under warranty?", field_type: "radio", options: opt(["হ্যাঁ", "Yes"], ["না", "No"], ["জানি না", "Not sure"]) },
    ],
  },
  {
    id: "install", icon: "📡", bn: "ইনস্টলেশন / সেটআপ",
    fields: [
      { field_label_bn: "কী ইনস্টল করবেন", field_label_en: "What to install", field_type: "text", is_required: true, placeholder: "যেমন: CCTV ক্যামেরা, Wi-Fi রাউটার" },
      { field_label_bn: "কয়টি", field_label_en: "How many", field_type: "number", default_value: "1", validation_rules: { min: 1 } },
      { field_label_bn: "কোথায় (বাসা/অফিস/দোকান)", field_label_en: "Where (home / office / shop)", field_type: "radio", options: opt(["বাসা", "Home"], ["অফিস", "Office"], ["দোকান", "Shop"]) },
      { field_label_bn: "পছন্দের তারিখ", field_label_en: "Preferred date", field_type: "date" },
      { field_label_bn: "অতিরিক্ত তথ্য", field_label_en: "Anything else", field_type: "textarea" },
    ],
  },
  {
    id: "software", icon: "💻", bn: "সফটওয়্যার / ওয়েবসাইট",
    fields: [
      { field_label_bn: "কী ধরনের কাজ", field_label_en: "Type of work", field_type: "select", is_required: true, options: opt(["নতুন ওয়েবসাইট", "New website"], ["সফটওয়্যার", "Software"], ["মোবাইল অ্যাপ", "Mobile app"], ["আপডেট/ঠিক করা", "Update / fix"]) },
      { field_label_bn: "ব্যবসার নাম", field_label_en: "Business name", field_type: "text" },
      { field_label_bn: "কাজের বিবরণ", field_label_en: "Describe the work", field_type: "textarea", is_required: true, validation_rules: { min_length: 10 } },
      { field_label_bn: "বাজেট (আনুমানিক)", field_label_en: "Budget (approx.)", field_type: "select", options: opt(["৳১০,০০০-এর কম", "Under ৳10,000"], ["৳১০,০০০–৫০,০০০", "৳10,000–50,000"], ["৳৫০,০০০-এর বেশি", "Over ৳50,000"], ["আলোচনা করে", "To discuss"]) },
      { field_label_bn: "নমুনা/রেফারেন্স লিংক", field_label_en: "Example / reference link", field_type: "url" },
    ],
  },
  {
    id: "design", icon: "🎨", bn: "ডিজাইন (কার্ড, ব্যানার, লোগো)",
    fields: [
      { field_label_bn: "কী ডিজাইন", field_label_en: "What to design", field_type: "select", is_required: true, options: opt(["ভিজিটিং কার্ড", "Visiting card"], ["ব্যানার", "Banner"], ["লোগো", "Logo"], ["লিফলেট", "Leaflet"], ["অন্য", "Other"]) },
      { field_label_bn: "সাইজ/মাপ", field_label_en: "Size", field_type: "text", placeholder: "যেমন: 3.5×2 ইঞ্চি" },
      { field_label_bn: "লেখা ও তথ্য", field_label_en: "Text to include", field_type: "textarea", is_required: true },
      { field_label_bn: "লোগো/ছবি পাঠান", field_label_en: "Send logo / photos", field_type: "file" },
      { field_label_bn: "প্রিন্টও লাগবে?", field_label_en: "Need printing too?", field_type: "radio", options: opt(["হ্যাঁ", "Yes"], ["না", "No"]) },
    ],
  },
  {
    id: "documents", icon: "🗂️", bn: "অনলাইন আবেদন / কাগজপত্র",
    fields: [
      { field_label_bn: "কোন আবেদন", field_label_en: "Which application", field_type: "text", is_required: true, placeholder: "যেমন: পাসপোর্ট, জন্ম নিবন্ধন" },
      { field_label_bn: "আবেদনকারীর নাম (কাগজ অনুযায়ী)", field_label_en: "Applicant name (as on documents)", field_type: "text", is_required: true },
      { field_label_bn: "প্রয়োজনীয় কাগজের ছবি", field_label_en: "Photos of required documents", field_type: "file" },
      { field_label_bn: "জরুরি?", field_label_en: "Urgent?", field_type: "radio", options: opt(["হ্যাঁ", "Yes"], ["না", "No"]) },
    ],
  },
  {
    id: "consult", icon: "💬", bn: "পরামর্শ",
    fields: [
      { field_label_bn: "কোন বিষয়ে পরামর্শ", field_label_en: "Topic", field_type: "text", is_required: true },
      { field_label_bn: "কীভাবে কথা বলবেন", field_label_en: "How to talk", field_type: "radio", options: opt(["ফোনে", "Phone"], ["দোকানে এসে", "At the shop"], ["অনলাইনে", "Online"]) },
      { field_label_bn: "পছন্দের সময়", field_label_en: "Preferred time", field_type: "datetime" },
      { field_label_bn: "বিস্তারিত", field_label_en: "Details", field_type: "textarea" },
    ],
  },
];
