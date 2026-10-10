/**
 * Bangla upload guidance per image/video purpose, shown by
 * `components/admin/ImageUpload.tsx` when it gets a `purpose` prop.
 *
 * One place for "what to upload and how": size/ratio, background, where to
 * keep the main subject, format and max size, plus how the site frames it
 * (ratio, cover vs contain, round or square) for the small live preview.
 * Written for a non-technical admin — short, plain Bangla.
 */

export type UploadPurpose =
  | "product-main"
  | "product-gallery"
  | "product-og"
  | "brand-logo"
  | "category"
  | "combo"
  | "service-image"
  | "service-icon"
  | "project"
  | "team"
  | "testimonial"
  | "gallery-photo"
  | "gallery-video"
  | "blog-cover"
  | "og-image"
  | "site-logo"
  | "favicon"
  | "app-icon"
  | "promo-hero"
  | "promo-flash"
  | "announcement"
  | "page-banner"
  | "hero-banner"
  | "login-bg"
  | "about-story"
  | "payment-strip"
  | "apon-icon"
  | "apon-screenshot"
  | "generic";

export interface UploadGuide {
  /** Short Bangla name of the slot, e.g. "পণ্যের মূল ছবি". */
  titleBn: string;
  /** One-line summary shown under the upload button. */
  size: string;
  /** Width ÷ height used for the preview frame and the ratio check. */
  ratio: number;
  ratioLabel: string;
  /** How the site draws it: `contain` keeps the whole image, `cover` crops edges. */
  fit: "contain" | "cover";
  shape?: "rect" | "circle";
  /** Background the site puts behind the image (for the preview). */
  previewBg?: "white" | "checker" | "dark";
  background: string;
  subject: string;
  format: string;
  maxSize: string;
  /** Where it appears on the site. */
  whereBn: string;
  tips?: string[];
}

const IMG = "JPG, PNG বা WebP";
const IMG_MAX = "ছবি সর্বোচ্চ ৩০MB (ভালো হয় ১MB-এর কম)";

export const UPLOAD_GUIDES: Record<UploadPurpose, UploadGuide> = {
  "product-main": {
    titleBn: "পণ্যের মূল ছবি",
    size: "১০০০×১০০০px (১:১ বর্গাকার) · সাদা ব্যাকগ্রাউন্ড",
    ratio: 1, ratioLabel: "১:১", fit: "contain", previewBg: "white",
    background: "সাদা (#FFFFFF) বা স্বচ্ছ (PNG) — ঘরের মেঝে/টেবিল যেন না দেখা যায়",
    subject: "পণ্যটি মাঝখানে রাখুন, চারপাশে সামান্য ফাঁকা জায়গা থাকুক; পুরো পণ্য যেন দেখা যায়",
    format: IMG, maxSize: IMG_MAX,
    whereBn: "পণ্যের কার্ড (/products), পণ্যের পাতা, কার্ট ও ইনভয়েস",
    tips: ["ভালো আলোয়, ঝাপসা ছাড়া ছবি তুলুন", "ছবির উপর লেখা, দাম বা ওয়াটারমার্ক দেবেন না", "বক্সসহ ও বক্স ছাড়া — দুই রকম ছবি গ্যালারিতে দিন"],
  },
  "product-gallery": {
    titleBn: "পণ্যের অতিরিক্ত ছবি (গ্যালারি)",
    size: "১০০০×১০০০px (১:১) · সাদা ব্যাকগ্রাউন্ড",
    ratio: 1, ratioLabel: "১:১", fit: "contain", previewBg: "white",
    background: "সাদা বা স্বচ্ছ — মূল ছবির মতোই রাখুন যেন সব ছবি একরকম দেখায়",
    subject: "বিভিন্ন দিক থেকে (সামনে, পেছনে, পাশে), পোর্ট/বাটনের কাছ থেকে, বক্সের ভেতরের জিনিস",
    format: IMG, maxSize: IMG_MAX,
    whereBn: "পণ্যের পাতার ছবি-গ্যালারি (সোয়াইপ/জুম করা যায়)",
    tips: ["৩–৬টি ছবি যথেষ্ট", "একই ছবি বারবার দেবেন না"],
  },
  "product-og": {
    titleBn: "সোশ্যাল শেয়ার ছবি (পণ্য)",
    size: "১২০০×৬৩০px (১.৯১:১) · ঐচ্ছিক — খালি রাখলে মূল ছবি যাবে",
    ratio: 1.91, ratioLabel: "১.৯১:১", fit: "cover",
    background: "সাদা বা ব্র্যান্ড রঙ",
    subject: "পণ্য ও লেখা মাঝখানে রাখুন — Facebook কিনারা কেটে দিতে পারে",
    format: "JPG বা PNG", maxSize: "১MB-এর কম রাখুন",
    whereBn: "Facebook/WhatsApp-এ লিংক শেয়ার করলে যে ছবি দেখায়",
  },
  "brand-logo": {
    titleBn: "লোগো (পণ্যের ব্র্যান্ড বা ক্লায়েন্ট/পার্টনার)",
    size: "৫০০×৫০০px (১:১) · স্বচ্ছ বা সাদা ব্যাকগ্রাউন্ড",
    ratio: 1, ratioLabel: "১:১", fit: "contain", previewBg: "checker",
    background: "স্বচ্ছ PNG সবচেয়ে ভালো; না হলে একদম সাদা",
    subject: "লোগো মাঝখানে, চারপাশে সামান্য ফাঁকা; লোগোর বাইরে অন্য কিছু নয়",
    format: "PNG (স্বচ্ছ) বা SVG", maxSize: "৫০০KB-এর কম যথেষ্ট",
    whereBn: "হোমপেজের 'আমাদের ব্র্যান্ড পার্টনার' লোগো সারি (ক্লায়েন্ট/পার্টনার), বা পণ্যের ব্র্যান্ডের লোগো",
    tips: ["অফিসিয়াল লোগো ব্যবহার করুন — স্ক্রিনশট নয়", "লম্বা লোগো হলেও চলবে, পুরোটা দেখাবে"],
  },
  category: {
    titleBn: "ক্যাটাগরির ছবি",
    size: "৬০০×৬০০px (১:১) · সাদা বা হালকা ব্যাকগ্রাউন্ড",
    ratio: 1, ratioLabel: "১:১", fit: "cover",
    background: "সাদা বা হালকা এক রঙের",
    subject: "ক্যাটাগরির একটি পরিচিত পণ্য মাঝখানে (যেমন চার্জার ক্যাটাগরিতে চার্জার)",
    format: IMG, maxSize: "১MB-এর কম রাখুন",
    whereBn: "হোমপেজ ও পণ্য পাতার ক্যাটাগরি তালিকা",
    tips: ["ছবিতে লেখা দেবেন না — নাম ওয়েবসাইট নিজেই দেখায়"],
  },
  combo: {
    titleBn: "কম্বো অফারের ছবি",
    size: "১২০০×৯০০px (৪:৩)",
    ratio: 4 / 3, ratioLabel: "৪:৩", fit: "cover",
    background: "সাদা বা হালকা রঙ",
    subject: "কম্বোর সব পণ্য একসাথে মাঝখানে সাজিয়ে রাখুন; কিনারায় কিছু রাখবেন না",
    format: IMG, maxSize: "১MB-এর কম রাখুন",
    whereBn: "হোমপেজের কম্বো অফার সেকশন",
  },
  "service-image": {
    titleBn: "সেবার ছবি",
    size: "১২৮০×৭২০px (১৬:৯)",
    ratio: 16 / 9, ratioLabel: "১৬:৯", fit: "cover",
    background: "বাস্তব কাজের ছবি বা পরিষ্কার ব্যাকগ্রাউন্ড",
    subject: "মূল বিষয় মাঝখানে রাখুন — মোবাইলে দুই পাশ কেটে যেতে পারে",
    format: IMG, maxSize: "১MB-এর কম রাখুন",
    whereBn: "সেবার কার্ড ও সেবার বিস্তারিত পাতা",
  },
  "service-icon": {
    titleBn: "সেবার আইকন",
    size: "২৫৬×২৫৬px (১:১) · স্বচ্ছ ব্যাকগ্রাউন্ড",
    ratio: 1, ratioLabel: "১:১", fit: "contain", previewBg: "checker",
    background: "স্বচ্ছ PNG বা SVG",
    subject: "সহজ, এক রঙের চিহ্ন; ছোট আকারেও যেন বোঝা যায়",
    format: "PNG (স্বচ্ছ) বা SVG", maxSize: "২০০KB-এর কম",
    whereBn: "সেবার কার্ডের ছোট আইকন",
  },
  project: {
    titleBn: "প্রজেক্ট/সফটওয়্যার স্ক্রিনশট",
    size: "১৬০০×১০০০px (১৬:১০)",
    ratio: 16 / 10, ratioLabel: "১৬:১০", fit: "cover",
    background: "ওয়েবসাইট/অ্যাপের আসল স্ক্রিনশট",
    subject: "গুরুত্বপূর্ণ অংশ মাঝখানে ও উপরের দিকে রাখুন",
    format: "PNG বা WebP (স্ক্রিনশট পরিষ্কার থাকে)", maxSize: "২MB-এর কম রাখুন",
    whereBn: "সফটওয়্যার সেবা/শোকেস পাতার প্রজেক্ট কার্ড",
    tips: ["গ্রাহকের ব্যক্তিগত তথ্য (নাম/ফোন) ঝাপসা করে দিন"],
  },
  team: {
    titleBn: "টিম সদস্যের ছবি",
    size: "৬০০×৬০০px (১:১) · মুখ মাঝখানে",
    ratio: 1, ratioLabel: "১:১", fit: "cover", shape: "circle",
    background: "সাধারণ, হালকা ব্যাকগ্রাউন্ড",
    subject: "মুখ ও কাঁধ মাঝখানে — ছবিটি গোল করে কাটা হয়, তাই কিনারায় কিছু রাখবেন না",
    format: "JPG বা WebP", maxSize: "৫০০KB-এর কম যথেষ্ট",
    whereBn: "আমাদের সম্পর্কে (/about) পাতা ও ফুটারের ক্রেডিট",
  },
  testimonial: {
    titleBn: "গ্রাহকের ছবি (রিভিউ)",
    size: "৪০০×৪০০px (১:১) · মুখ মাঝখানে",
    ratio: 1, ratioLabel: "১:১", fit: "cover", shape: "circle",
    background: "যেকোনো সাধারণ ব্যাকগ্রাউন্ড",
    subject: "মুখ মাঝখানে — গোল করে কাটা হয়",
    format: "JPG বা WebP", maxSize: "৩০০KB-এর কম যথেষ্ট",
    whereBn: "রিভিউ/টেস্টিমোনিয়াল কার্ড",
    tips: ["গ্রাহকের অনুমতি নিয়ে ছবি দিন", "ছবি না দিলে নামের প্রথম অক্ষর দেখাবে"],
  },
  "gallery-photo": {
    titleBn: "গ্যালারি ছবি",
    size: "১৯২০×১০৮০px (১৬:৯) বা ১২০০×১২০০px",
    ratio: 16 / 9, ratioLabel: "১৬:৯", fit: "cover",
    background: "বাস্তব ছবি — দোকান, অফিস, ইভেন্ট",
    subject: "মূল বিষয় মাঝখানে; তালিকায় বর্গাকার করে কাটা হয়, খুললে পুরোটা দেখায়",
    format: "JPG বা WebP", maxSize: IMG_MAX,
    whereBn: "গ্যালারি (/gallery) পাতা",
  },
  "gallery-video": {
    titleBn: "গ্যালারি ভিডিও",
    size: "১৯২০×১০৮০px (১৬:৯) · MP4",
    ratio: 16 / 9, ratioLabel: "১৬:৯", fit: "cover", previewBg: "dark",
    background: "আনুভূমিক (শুয়ানো) ভিডিও",
    subject: "মূল দৃশ্য মাঝখানে; ৩০–৬০ সেকেন্ডের ছোট ভিডিও ভালো",
    format: "MP4 (H.264)", maxSize: "ভিডিও সর্বোচ্চ ৫০MB",
    whereBn: "গ্যালারি ও হোমপেজের ভিডিও অংশ",
  },
  "blog-cover": {
    titleBn: "ব্লগের কভার ছবি",
    size: "১২০০×৬৭৫px (১৬:৯)",
    ratio: 16 / 9, ratioLabel: "১৬:৯", fit: "cover",
    background: "লেখার বিষয়ের সাথে মিল আছে এমন ছবি",
    subject: "মূল বিষয় মাঝখানে; ছবিতে বেশি লেখা দেবেন না (মোবাইলে ছোট হয়ে যায়)",
    format: "JPG বা WebP", maxSize: "১MB-এর কম রাখুন",
    whereBn: "ব্লগ তালিকা, ব্লগ পোস্টের উপরে ও শেয়ার করার সময়",
  },
  "og-image": {
    titleBn: "সোশ্যাল শেয়ার ছবি",
    size: "১২০০×৬৩০px (১.৯১:১) · ঐচ্ছিক",
    ratio: 1.91, ratioLabel: "১.৯১:১", fit: "cover",
    background: "ব্র্যান্ড রঙ বা পরিষ্কার ছবি",
    subject: "লোগো ও লেখা মাঝখানে রাখুন — কিনারা কেটে যেতে পারে",
    format: "JPG বা PNG", maxSize: "১MB-এর কম রাখুন",
    whereBn: "Facebook/WhatsApp-এ লিংক শেয়ার করলে যে ছবি দেখায়",
  },
  "site-logo": {
    titleBn: "সাইট লোগো",
    size: "৫১২×৫১২px (১:১) · স্বচ্ছ PNG",
    ratio: 1, ratioLabel: "১:১", fit: "contain", previewBg: "checker",
    background: "স্বচ্ছ (transparent) — সাদা ও গাঢ় দুই থিমেই যেন দেখা যায়",
    subject: "লোগো মাঝখানে, চারপাশে খুব সামান্য ফাঁকা",
    format: "PNG (স্বচ্ছ) বা SVG", maxSize: "৫০০KB-এর কম",
    whereBn: "মেনু বার, ফুটার, ইনভয়েস",
  },
  favicon: {
    titleBn: "ফ্যাভিকন (ব্রাউজার ট্যাবের আইকন)",
    size: "৬৪×৬৪px বা ২৫৬×২৫৬px (১:১)",
    ratio: 1, ratioLabel: "১:১", fit: "contain", previewBg: "checker",
    background: "স্বচ্ছ PNG",
    subject: "লোগোর শুধু চিহ্ন অংশ — লেখা খুব ছোট হয়ে পড়া যায় না",
    format: "PNG বা ICO", maxSize: "১০০KB-এর কম",
    whereBn: "ব্রাউজার ট্যাব ও বুকমার্ক",
  },
  "app-icon": {
    titleBn: "অ্যাপ আইকন",
    size: "৫১২×৫১২px (১:১) · PNG",
    ratio: 1, ratioLabel: "১:১", fit: "contain", previewBg: "white",
    background: "পূর্ণ রঙের ব্যাকগ্রাউন্ড (ফোন নিজে কোণা গোল করে)",
    subject: "চিহ্নটি মাঝখানের ৮০% জায়গায় রাখুন",
    format: "PNG", maxSize: "৫০০KB-এর কম",
    whereBn: "মোবাইলের হোম স্ক্রিনের আইকন",
  },
  "promo-hero": {
    titleBn: "হোমপেজ প্রোমো স্লাইড",
    size: "১২৮০×৭২০px (১৬:৯)",
    ratio: 16 / 9, ratioLabel: "১৬:৯", fit: "cover",
    background: "ব্র্যান্ড রঙ বা অফারের ছবি",
    subject: "লেখা, দাম ও লোগো মাঝখানের অংশে রাখুন — চারদিকের কিনারা কেটে যেতে পারে",
    format: IMG, maxSize: "১MB-এর কম রাখুন (দ্রুত লোড হবে)",
    whereBn: "হোমপেজের উপরের প্রোমো কার্ড (মোবাইলে উপরে, ডেস্কটপে শিরোনামের পাশে)",
  },
  "promo-flash": {
    titleBn: "ফ্ল্যাশ সেল ব্যানার",
    size: "১৫০০×৫০০px (৩:১ চওড়া)",
    ratio: 3, ratioLabel: "৩:১", fit: "cover",
    background: "ব্র্যান্ড রঙ বা অফারের ছবি",
    subject: "লেখা মাঝখানে রাখুন — মোবাইলে দুই পাশ কেটে যায়",
    format: IMG, maxSize: "১MB-এর কম রাখুন",
    whereBn: "ফ্ল্যাশ সেল কাউন্টডাউনের নিচে (সেল চলাকালীন)",
  },
  announcement: {
    titleBn: "ঘোষণার ছবি",
    size: "১২০০×৬০০px (২:১)",
    ratio: 2, ratioLabel: "২:১", fit: "cover",
    background: "ব্র্যান্ড রঙ",
    subject: "লেখা মাঝখানে, বড় ও পরিষ্কার অক্ষরে",
    format: IMG, maxSize: "১MB-এর কম রাখুন",
    whereBn: "ঘোষণা/নোটিশ অংশ",
  },
  "page-banner": {
    titleBn: "পাতার ব্যানার",
    size: "১৯২০×৬০০px (চওড়া) · JPG/WebP",
    ratio: 3.2, ratioLabel: "৩.২:১", fit: "cover", previewBg: "dark",
    background: "গাঢ় বা মাঝারি রঙের ছবি — উপরে সাদা লেখা বসে",
    subject: "গুরুত্বপূর্ণ অংশ মাঝখানে রাখুন; মোবাইলে দুই পাশ কেটে যায়",
    format: "JPG বা WebP", maxSize: "১MB-এর কম রাখুন",
    whereBn: "প্রতিটি পাতার উপরের ব্যানার",
    tips: ["ছবিতে নিজে লেখা দেবেন না — পাতার শিরোনাম ওয়েবসাইট বসায়"],
  },
  "hero-banner": {
    titleBn: "হোমপেজ ব্যানার",
    size: "১৯২০×১০৮০px (১৬:৯) · ছবি বা MP4",
    ratio: 16 / 9, ratioLabel: "১৬:৯", fit: "cover", previewBg: "dark",
    background: "গাঢ় বা মাঝারি রঙ — উপরে লেখা বসে",
    subject: "মূল বিষয় ডান দিকে/মাঝখানে রাখুন; বাম দিকে লেখা বসে",
    format: "JPG, WebP বা MP4", maxSize: "ছবি ১MB, ভিডিও ১০MB-এর কম ভালো",
    whereBn: "হোমপেজের একদম উপরের অংশ",
  },
  "login-bg": {
    titleBn: "লগইন পাতার ব্যাকগ্রাউন্ড",
    size: "১৯২০×১০৮০px (১৬:৯)",
    ratio: 16 / 9, ratioLabel: "১৬:৯", fit: "cover", previewBg: "dark",
    background: "শান্ত, কম ডিটেইলের ছবি — উপরে লগইন ফর্ম বসে",
    subject: "মাঝখানে ফর্ম থাকে, তাই গুরুত্বপূর্ণ কিছু মাঝখানে রাখবেন না",
    format: "JPG, WebP বা MP4", maxSize: "ছবি ১MB-এর কম ভালো",
    whereBn: "লগইন/রেজিস্টার পাতা",
  },
  "about-story": {
    titleBn: "আমাদের গল্পের ছবি",
    size: "১২০০×৮০০px (৩:২)",
    ratio: 3 / 2, ratioLabel: "৩:২", fit: "cover",
    background: "দোকান/অফিস/টিমের বাস্তব ছবি",
    subject: "মানুষ বা দোকান মাঝখানে",
    format: "JPG বা WebP", maxSize: "১MB-এর কম রাখুন",
    whereBn: "আমাদের সম্পর্কে (/about) পাতা",
  },
  "payment-strip": {
    titleBn: "পেমেন্ট পদ্ধতির ছবি",
    size: "১২০০×২০০px (৬:১ চওড়া) · স্বচ্ছ বা সাদা",
    ratio: 6, ratioLabel: "৬:১", fit: "contain", previewBg: "white",
    background: "স্বচ্ছ PNG বা সাদা",
    subject: "সব লোগো এক সারিতে, সমান আকারে",
    format: "PNG", maxSize: "৫০০KB-এর কম",
    whereBn: "ফুটারের 'পেমেন্ট পদ্ধতি' অংশ",
  },
  "apon-icon": {
    titleBn: "আপন অ্যাপের আইকন",
    size: "৫১২×৫১২px (১:১) · PNG",
    ratio: 1, ratioLabel: "১:১", fit: "contain", previewBg: "white",
    background: "পূর্ণ রঙ বা স্বচ্ছ",
    subject: "চিহ্নটি মাঝখানে, কিনারায় কিছু নয়",
    format: "PNG", maxSize: "৫০০KB-এর কম",
    whereBn: "অ্যাপ ডাউনলোড (/app) পাতা",
  },
  "apon-screenshot": {
    titleBn: "আপন অ্যাপের স্ক্রিনশট",
    size: "১০৮০×১৯২০px (৯:১৬ লম্বা)",
    ratio: 9 / 16, ratioLabel: "৯:১৬", fit: "contain", previewBg: "white",
    background: "ফোনের আসল স্ক্রিনশট",
    subject: "পুরো স্ক্রিন — কাটবেন না",
    format: "PNG বা JPG", maxSize: "১MB-এর কম রাখুন",
    whereBn: "অ্যাপ ডাউনলোড (/app) পাতার স্ক্রিনশট সারি",
    tips: ["ব্যক্তিগত তথ্য/নোটিফিকেশন লুকিয়ে স্ক্রিনশট নিন"],
  },
  generic: {
    titleBn: "ছবি",
    size: "১২০০px চওড়া বা বেশি",
    ratio: 16 / 9, ratioLabel: "১৬:৯", fit: "cover",
    background: "পরিষ্কার, ঝাপসা নয়",
    subject: "মূল বিষয় মাঝখানে রাখুন",
    format: IMG, maxSize: IMG_MAX,
    whereBn: "ওয়েবসাইটে",
  },
};

export function getUploadGuide(purpose?: UploadPurpose | null): UploadGuide | null {
  return purpose ? UPLOAD_GUIDES[purpose] ?? null : null;
}

/** True when an uploaded image's ratio is far (>20%) from the recommended one. */
export function ratioMismatch(guide: UploadGuide, width: number, height: number): boolean {
  if (!width || !height) return false;
  const actual = width / height;
  return Math.abs(actual - guide.ratio) / guide.ratio > 0.2;
}
