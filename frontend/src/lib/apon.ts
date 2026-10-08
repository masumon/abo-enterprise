/**
 * "Apon" (আপন) mobile-app download page — types, built-in default content and helpers.
 *
 * Everything shown on the public page can be overridden from the admin panel through the
 * `apon_*` settings; the defaults below only make the page complete on day one. The APK
 * address itself never reaches the browser: downloads go through the website's own API.
 */
import { getSettingValue } from "@/lib/settingValue";

export interface AponRelease {
  version_name: string;
  version_code: number;
  file_name: string;
  size_bytes: number | null;
  sha256: string | null;
  min_android: string | null;
  changelog_bn: string | null;
  changelog_en: string | null;
  updated_at: string | null;
  download_count: number;
}

export interface AponInfo {
  enabled: boolean;
  captcha: boolean;
  release: AponRelease | null;
}

export interface Bi {
  bn: string;
  en: string;
}

export interface AponShot {
  src: string;
  alt_bn: string;
  alt_en: string;
}
export interface AponFeature {
  icon: string;
  title_bn: string;
  title_en: string;
  desc_bn: string;
  desc_en: string;
}
export interface AponPermission {
  icon: string;
  name_bn: string;
  name_en: string;
  why_bn: string;
  why_en: string;
  optional: boolean;
}
export interface AponFaq {
  q_bn: string;
  q_en: string;
  a_bn: string;
  a_en: string;
}

export const APON_SETTING_KEYS = [
  "apon_enabled", "apon_downloads_enabled", "apon_captcha_enabled",
  "apon_name_bn", "apon_name_en", "apon_tagline_bn", "apon_tagline_en",
  "apon_description_bn", "apon_description_en", "apon_button_label_bn", "apon_button_label_en",
  "apon_icon_url", "apon_og_image_url", "apon_package_name", "apon_cert_sha256",
  "apon_screenshots_json", "apon_features_json", "apon_permissions_json", "apon_faq_json",
  "apon_show_nav", "apon_show_drawer", "apon_show_home", "apon_show_footer", "apon_show_banner",
  "play_store_url",
] as const;

// ---------------------------------------------------------------- default content
export const DEFAULT_NAME: Bi = { bn: "আপন", en: "Apon" };
export const DEFAULT_TAGLINE: Bi = {
  bn: "আপনার নিজের জীবনের একটি খাতা — সব কিছু আপনার ফোনেই",
  en: "A book for your own life — all on your phone",
};
export const DEFAULT_DESCRIPTION: Bi = {
  bn: "কাজ ও মনে রাখার বিষয়, ধার-দেনা ও টাকা-পয়সা, ওষুধ ও ডাক্তার — সবকিছু এক জায়গায়। সব তথ্য আপনার ফোনেই থাকে, কোনো সার্ভারে নিজে থেকে যায় না, ইন্টারনেট ছাড়াই চলে।",
  en: "Tasks and things to remember, debts and money, medicines and doctors — all in one place. Your data stays on your phone, is never sent to a server on its own, and works without internet.",
};
export const DEFAULT_BUTTON: Bi = { bn: "আপন ডাউনলোড করুন", en: "Download Apon" };

export const DEFAULT_SHOTS: AponShot[] = [
  { src: "/apon/shot-2.webp", alt_bn: "আপন — হোম: এক লাইনে লিখুন বা বলুন", alt_en: "Apon — Home: write or say one line" },
  { src: "/apon/shot-3.webp", alt_bn: "আপন — দিনের পরিকল্পনা", alt_en: "Apon — daily planning" },
  { src: "/apon/shot-4.webp", alt_bn: "আপন — স্মৃতি", alt_en: "Apon — memory" },
  { src: "/apon/shot-5.webp", alt_bn: "আপন — আয়-ব্যয় ও টাকার হিসাব", alt_en: "Apon — income and spending" },
  { src: "/apon/shot-6.webp", alt_bn: "আপন — স্বাস্থ্য: ওষুধ, ডাক্তার, টেস্ট", alt_en: "Apon — health: medicines, doctors, tests" },
  { src: "/apon/shot-8.webp", alt_bn: "আপন — আরও", alt_en: "Apon — more" },
  { src: "/apon/shot-7.webp", alt_bn: "আপন — অ্যাপ পরিচিতি ও গোপনীয়তা", alt_en: "Apon — about and privacy" },
];

export const DEFAULT_FEATURES: AponFeature[] = [
  { icon: "mic", title_bn: "এক লাইনে লিখুন বা বলুন", title_en: "Write or say one line", desc_bn: "টাইপ করুন, মুখে বলুন বা ছবি তুলুন — বাকিটা অ্যাপ নিজে গুছিয়ে নেয়।", desc_en: "Type, speak or snap a photo — the app organises the rest." },
  { icon: "calendar", title_bn: "দিনের পরিকল্পনা", title_en: "Daily planning", desc_bn: "প্রতিদিনের কাজ সময় অনুযায়ী সাজানো; বাকি, চলমান ও আজকের কাজ এক নজরে।", desc_en: "Each day's tasks laid out by time; overdue, in progress and today at a glance." },
  { icon: "book", title_bn: "স্মৃতি", title_en: "Memory", desc_bn: "যা মনে রাখতে চান, লিখে রাখুন — খুঁজলেই পাবেন।", desc_en: "Keep what you want to remember — and find it again by searching." },
  { icon: "wallet", title_bn: "টাকার খাতা", title_en: "Money book", desc_bn: "আয়-ব্যয়, ক্যাশ/bKash/ব্যাংক ওয়ালেট ও ধার-দেনার হিসাব; মাসের পরিকল্পনা।", desc_en: "Income and spending, cash/bKash/bank wallets and debts; plan the month." },
  { icon: "heart", title_bn: "স্বাস্থ্য", title_en: "Health", desc_bn: "ওষুধ, ডাক্তার, টেস্ট, প্রেসক্রিপশন এবং ওজন, প্রেসার, সুগার, হাঁটা, ঘুমের হিসাব।", desc_en: "Medicines, doctors, tests, prescriptions, and weight, blood pressure, sugar, steps and sleep." },
  { icon: "bot", title_bn: "অফলাইন সহকারী “আপন”", title_en: "Offline assistant “Apon”", desc_bn: "ইন্টারনেট ছাড়াই বোঝে ও সাহায্য করে।", desc_en: "Understands and helps without internet." },
  { icon: "bell", title_bn: "অফলাইন রিমাইন্ডার", title_en: "Offline reminders", desc_bn: "নেট না থাকলেও সময়মতো মনে করিয়ে দেয়।", desc_en: "Reminds you on time even with no connection." },
  { icon: "shield", title_bn: "গোপনীয়তা সবার আগে", title_en: "Privacy first", desc_bn: "সব তথ্য ফোনে। আপনি নিজে ব্যাকআপ শেয়ার না করলে কিছুই ফোন ছাড়ে না।", desc_en: "All data on the phone. Nothing leaves it unless you share a backup yourself." },
];

export const DEFAULT_PERMISSIONS: AponPermission[] = [
  { icon: "camera", name_bn: "ক্যামেরা", name_en: "Camera", why_bn: "শুধু আপনি ছবি তুলতে চাপলে — রশিদ, প্রেসক্রিপশন বা কাগজের লেখা পড়াতে। লেখা পড়া হয় ফোনের ভেতরেই।", why_en: "Only when you tap to take a photo — receipts, prescriptions or text on paper. Reading the text happens inside the phone.", optional: true },
  { icon: "mic", name_bn: "মাইক্রোফোন", name_en: "Microphone", why_bn: "শুধু আপনি মাইক চাপলে, কথা বলে লিখতে। অ্যাপ নিজে কোনো শব্দ রেকর্ড করে রাখে না।", why_en: "Only when you tap the mic, to write by speaking. The app does not record or keep any sound itself.", optional: true },
  { icon: "contacts", name_bn: "কন্ট্যাক্ট", name_en: "Contacts", why_bn: "শুধু “কন্টাক্ট থেকে নিন” চাপলে; আপনি যাকে বাছেন শুধু তার তথ্য আসে, পুরো ফোনবুক নয়।", why_en: "Only when you tap “Import from contacts”; only the person you pick comes in, never the whole phonebook.", optional: true },
  { icon: "photos", name_bn: "ছবি ও স্টোরেজ", name_en: "Photos and storage", why_bn: "ছবি যুক্ত করা এবং ব্যাকআপ ফাইল সংরক্ষণ/পুনরুদ্ধারের জন্য।", why_en: "To attach photos and save or restore backup files.", optional: true },
  { icon: "location", name_bn: "লোকেশন", name_en: "Location", why_bn: "শুধু আপনি “জায়গা যোগ করুন” চাপলে, সেই মুহূর্তে একবার। অ্যাপ বন্ধ থাকলে অবস্থান নেয় না।", why_en: "Only when you tap “Add place”, once, at that moment. Never while the app is closed.", optional: true },
  { icon: "bell", name_bn: "নোটিফিকেশন ও নির্ভুল অ্যালার্ম", name_en: "Notifications and exact alarms", why_bn: "কাজ ও ওষুধের রিমাইন্ডার ঠিক যে মিনিটে দিয়েছেন সেই মিনিটে বাজাতে, অ্যাপ বন্ধ থাকলেও।", why_en: "To ring task and medicine reminders at the exact minute you set, even when the app is closed.", optional: false },
  { icon: "battery", name_bn: "ব্যাটারি অপটিমাইজেশন ছাড় ও চালুর সময় সক্রিয়", name_en: "Battery exemption and start at boot", why_bn: "ফোন যেন ব্যাটারি বাঁচাতে গিয়ে রিমাইন্ডার বন্ধ না করে, আর ফোন আবার চালু হলে রিমাইন্ডার আবার সেট হয়।", why_en: "So the phone does not switch reminders off to save battery, and reminders are set again after a restart.", optional: true },
  { icon: "fingerprint", name_bn: "ফিঙ্গারপ্রিন্ট/বায়োমেট্রিক", name_en: "Fingerprint / biometrics", why_bn: "শুধু অ্যাপ লক চালু করলে, অ্যাপ খুলতে।", why_en: "Only if you turn on app lock, to open the app.", optional: true },
  { icon: "globe", name_bn: "ইন্টারনেট", name_en: "Internet", why_bn: "আপনি নিজে কিছু শেয়ার করলে এবং নোটিফিকেশন সেবার জন্য। অ্যাপ আপনার তথ্য নিজে থেকে কোথাও পাঠায় না।", why_en: "When you share something yourself and for the notification service. The app does not send your data anywhere on its own.", optional: false },
];

export const DEFAULT_FAQ: AponFaq[] = [
  { q_bn: "আপন কি ফ্রি?", q_en: "Is Apon free?", a_bn: "হ্যাঁ, ডাউনলোড ও ব্যবহার সম্পূর্ণ বিনামূল্যে।", a_en: "Yes — downloading and using it is completely free." },
  { q_bn: "আমার তথ্য কোথায় থাকে?", q_en: "Where is my data kept?", a_bn: "সব তথ্য আপনার ফোনেই থাকে। আপনি নিজে ব্যাকআপ শেয়ার না করলে কিছুই ফোন ছেড়ে যায় না।", a_en: "All of it stays on your phone. Nothing leaves it unless you share a backup yourself." },
  { q_bn: "ইন্টারনেট লাগে কি?", q_en: "Does it need internet?", a_bn: "না। কাজ, রিমাইন্ডার ও সহকারী অফলাইনেই চলে।", a_en: "No. Tasks, reminders and the assistant work offline." },
  { q_bn: "ইনস্টলের সময় “অজানা অ্যাপ” সতর্কতা কেন আসে?", q_en: "Why does Android warn about an “unknown app”?", a_bn: "এখনো অ্যাপটি Play Store এ নেই, তাই Android সতর্ক করে। ডাউনলোডের ফাইলের SHA-256 এই পেজের সাথে মিলিয়ে নিলে নিশ্চিত হবেন যে এটি আসল। Play Store এ এলে এই সতর্কতা আর থাকবে না।", a_en: "The app is not on the Play Store yet, so Android warns you. Compare the file's SHA-256 with the one on this page to be sure it is genuine. The warning goes away once it is on the Play Store." },
  { q_bn: "iPhone এ চলবে?", q_en: "Does it work on iPhone?", a_bn: "এখন শুধু Android ফোনে (Android 7.0 বা তার পরের)।", a_en: "For now Android phones only (Android 7.0 or newer)." },
  { q_bn: "আপডেট কীভাবে করব?", q_en: "How do I update?", a_bn: "এই পেজ থেকে নতুন সংস্করণ নামিয়ে ইনস্টল করুন। একই অ্যাপের ওপরে বসে যাবে, আপনার তথ্য থাকবে।", a_en: "Download the new version from this page and install it over the old one — your data stays." },
  { q_bn: "সমস্যা হলে কার সাথে যোগাযোগ করব?", q_en: "Who do I contact if something goes wrong?", a_bn: "নিচের “সহায়তা” অংশে কল বা WhatsApp এ জানান।", a_en: "Use Call or WhatsApp in the “Support” section below." },
];

export const INSTALL_STEPS: Bi[] = [
  { bn: "“ডাউনলোড” বাটনে চাপ দিয়ে যোগ-বিয়োগের প্রশ্নের উত্তর দিন; ডাউনলোড শুরু হবে।", en: "Tap “Download”, answer the small sum, and the download starts." },
  { bn: "ডাউনলোড শেষে নোটিফিকেশন থেকে ফাইলটি খুলুন, অথবা ফাইল ম্যানেজারের Downloads ফোল্ডারে যান।", en: "When it finishes, open the file from the notification or from Downloads in your file manager." },
  { bn: "ফোন “এই উৎস থেকে ইনস্টলের অনুমতি” চাইলে Settings এ গিয়ে আপনার ব্রাউজারের (যেমন Chrome) জন্য অনুমতি চালু করে ফিরে আসুন।", en: "If the phone asks to allow installs from this source, open Settings, allow it for your browser (e.g. Chrome), and come back." },
  { bn: "Play Protect সতর্কতা এলে “আরও বিস্তারিত” চেপে “তবুও ইনস্টল করুন” বাছুন।", en: "If Play Protect warns, tap “More details” then “Install anyway”." },
  { bn: "ইনস্টল শেষে “খুলুন” চাপুন। প্রথমবার ইচ্ছামতো অনুমতি দিন বা বাদ রাখুন।", en: "Tap “Open” when done. Grant the optional permissions only if you want those features." },
];

// ------------------------------------------------------------------------- helpers
const BN = "০১২৩৪৫৬৭৮৯";
export const toBnDigits = (v: string | number) => String(v).replace(/\d/g, (d) => BN[+d]);

export function formatMB(bytes: number | null | undefined, bn: boolean): string {
  if (!bytes) return "";
  const mb = bytes / 1_048_576;
  const text = mb >= 10 ? mb.toFixed(1) : mb.toFixed(2);
  return `${bn ? toBnDigits(text) : text} MB`;
}

export function formatDate(iso: string | null | undefined, bn: boolean): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(bn ? "bn-BD" : "en-GB", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

export function readList<T>(settings: Record<string, string>, key: string, fallback: T[]): T[] {
  const raw = getSettingValue(settings, key).trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export const flag = (settings: Record<string, string>, key: string, fallback = true): boolean => {
  const raw = getSettingValue(settings, key).trim().toLowerCase();
  return raw === "" ? fallback : ["true", "1", "yes", "on"].includes(raw);
};

export const pick = (b: Bi, bn: boolean) => (bn ? b.bn : b.en);

export function aponText(settings: Record<string, string>, base: string, fallback: Bi, bn: boolean): string {
  const own = getSettingValue(settings, `${base}_${bn ? "bn" : "en"}`).trim();
  const other = getSettingValue(settings, `${base}_${bn ? "en" : "bn"}`).trim();
  return own || (bn ? fallback.bn : fallback.en) || other;
}
