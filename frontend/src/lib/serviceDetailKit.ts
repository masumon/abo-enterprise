/**
 * Helpers for the service "more details" lists (steps, benefits,
 * requirements, documents, FAQ) and packages: one stored shape, Bangla-first
 * editing, paste-many parsing and ready-made sets. Stored shapes are exactly
 * what the service record already uses — nothing new is saved.
 */

export type Pair = { en: string; bn: string };
export type Step = { step: number; title: string; title_bn?: string; description: string; description_bn?: string };
export type Faq = { question: string; answer: string; question_bn?: string; answer_bn?: string };
export type ListKey = "process_steps" | "benefits" | "requirements" | "required_documents" | "faq";

export interface DetailLists {
  process_steps: Step[];
  benefits: Pair[];
  requirements: Pair[];
  required_documents: Pair[];
  faq: Faq[];
}

/** Legacy items may be plain strings (= English). */
export function toPair(v: unknown): Pair {
  if (typeof v === "string") return { en: v, bn: "" };
  const o = (v ?? {}) as Partial<Pair>;
  return { en: o.en ?? "", bn: o.bn ?? "" };
}

export const renumber = (steps: Step[]): Step[] => steps.map((s, i) => ({ ...s, step: i + 1 }));

/** Text of an item for de-duplication / summaries. */
export function itemText(key: ListKey, it: Step | Pair | Faq): string {
  if (key === "process_steps") return ((it as Step).title_bn || (it as Step).title || "").trim();
  if (key === "faq") return ((it as Faq).question_bn || (it as Faq).question || "").trim();
  return ((it as Pair).bn || (it as Pair).en || "").trim();
}

/** One line = one item; bullets/numbers at line start are dropped. */
export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[•\-*✓✔▪●◦]|[0-9০-৯]+[.)])\s*/, "").trim())
    .filter(Boolean);
}

/** "Question?" lines start a new FAQ; following lines are its answer. Also "প্রশ্ন:/উত্তর:" and "Q:/A:". */
export function parseFaq(text: string): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const q = line.match(/^(?:প্রশ্ন|Q)\s*[:：]\s*(.+)$/i);
    const a = line.match(/^(?:উত্তর|A)\s*[:：]\s*(.+)$/i);
    if (q || (!a && /[?？]$/.test(line))) out.push({ q: (q ? q[1] : line).trim(), a: "" });
    else if (out.length) out[out.length - 1].a = [out[out.length - 1].a, a ? a[1] : line].filter(Boolean).join("\n");
  }
  return out.filter((x) => x.q);
}

type Template = { id: string; icon: string; bn: string; steps: [string, string][]; benefits: string[]; requirements: string[]; documents: string[]; faq: [string, string][] };

/** Ready-made Bangla sets (English is translated on save). */
export const DETAIL_TEMPLATES: Template[] = [
  {
    id: "printing", icon: "🖨️", bn: "প্রিন্টিং ও ফটোকপি",
    steps: [["চাহিদা জানান", "কী প্রিন্ট/কপি করবেন, কাগজের সাইজ, রঙ ও কপির সংখ্যা জানান।"], ["ফাইল দিন", "PDF/Word ফাইল পাঠান বা মূল কাগজ নিয়ে আসুন।"], ["দাম নিশ্চিত করুন", "আমরা দাম ও সময় জানাব — আপনি সম্মতি দিলে কাজ শুরু।"], ["সংগ্রহ বা ডেলিভারি", "দোকান থেকে নিন বা ডেলিভারি নিন।"]],
    benefits: ["সাদা-কালো ও কালার প্রিন্ট", "দ্রুত ও পরিষ্কার কাজ", "অল্প বা বেশি — যেকোনো পরিমাণ", "দাম আগেই জানিয়ে দেওয়া হয়"],
    requirements: ["পরিষ্কার ও সম্পূর্ণ ফাইল/কাগজ", "কাগজের সাইজ ও কপির সংখ্যা জানাতে হবে", "কপিরাইট আছে এমন কিছু অনুমতি ছাড়া কপি করা হয় না"],
    documents: ["PDF/Word ফাইল বা মূল কাগজ", "ছবি প্রিন্ট হলে ভালো মানের ছবি"],
    faq: [["কোন ফাইল দিলে ভালো হয়?", "PDF দিলে লেআউট ঠিক থাকে; Word ও ছবিও চলে।"], ["কত সময় লাগে?", "সাধারণত একই দিনে; বেশি পরিমাণ হলে সময় জানিয়ে দেওয়া হবে।"], ["দাম কীভাবে ঠিক হয়?", "পৃষ্ঠা, কপি, কাগজ ও রঙ অনুযায়ী — কাজের আগেই জানানো হয়।"]],
  },
  {
    id: "repair", icon: "🔧", bn: "মেরামত / সার্ভিসিং",
    steps: [["সমস্যা জানান", "ডিভাইস, মডেল ও সমস্যার কথা লিখুন বা ছবি দিন।"], ["ডিভাইস পরীক্ষা", "আমরা পরীক্ষা করে কারণ খুঁজে বের করি।"], ["খরচ জানাই", "খরচ ও সময় জানাই — সম্মতি দিলে মেরামত শুরু।"], ["মেরামত ও যাচাই", "মেরামত শেষে ভালোভাবে পরীক্ষা করা হয়।"], ["ডিভাইস ফেরত", "দোকান থেকে নিন বা ডেলিভারি নিন।"]],
    benefits: ["অভিজ্ঞ টেকনিশিয়ান", "খরচ আগেই জানানো হয়", "মানসম্মত যন্ত্রাংশ", "মেরামতের পর পরীক্ষা"],
    requirements: ["ডিভাইসের পাসওয়ার্ড/প্যাটার্ন প্রয়োজনে জানাতে হবে", "জরুরি ডেটার ব্যাকআপ রাখুন", "চার্জার/আনুষঙ্গিক জিনিস প্রয়োজনে সাথে আনুন"],
    documents: ["ক্রয়ের রসিদ বা ওয়ারেন্টি কার্ড (থাকলে)"],
    faq: [["মেরামতে কত সময় লাগে?", "সমস্যা অনুযায়ী — পরীক্ষার পর সময় জানানো হয়।"], ["আমার ডেটা কি নিরাপদ?", "আমরা ডেটায় হাত দিই না; তবু ব্যাকআপ রাখা ভালো।"], ["মেরামতের ওয়ারেন্টি আছে?", "যন্ত্রাংশ ও কাজ অনুযায়ী — কাজের সময় জানানো হয়।"]],
  },
  {
    id: "install", icon: "📡", bn: "ইনস্টলেশন / সেটআপ",
    steps: [["প্রয়োজন জানান", "কী ইনস্টল করবেন, কয়টি ও কোথায় — জানান।"], ["পরিদর্শন ও খরচ", "প্রয়োজনে জায়গা দেখে খরচ ও সময় জানানো হয়।"], ["ইনস্টলেশন", "নির্ধারিত দিনে টেকনিশিয়ান কাজ করবেন।"], ["চালু করে বুঝিয়ে দেওয়া", "সব ঠিকমতো চালু করে ব্যবহার বুঝিয়ে দেওয়া হয়।"]],
    benefits: ["দক্ষ টেকনিশিয়ান", "পরিষ্কার ও নিরাপদ ওয়্যারিং", "চালু করে বুঝিয়ে দেওয়া", "পরবর্তী সহায়তা"],
    requirements: ["বিদ্যুৎ সংযোগ ও জায়গা প্রস্তুত রাখতে হবে", "নির্ধারিত সময়ে কেউ উপস্থিত থাকতে হবে"],
    documents: ["যন্ত্রের রসিদ/মডেল নম্বর (থাকলে)"],
    faq: [["যন্ত্রও কি আপনাদের কাছ থেকে কিনতে হবে?", "না, আপনার যন্ত্রও ইনস্টল করা যায়।"], ["কত সময় লাগে?", "কাজের পরিমাণ অনুযায়ী — আগেই জানানো হয়।"], ["পরে সমস্যা হলে?", "যোগাযোগ করুন — আমরা সহায়তা করব।"]],
  },
  {
    id: "software", icon: "💻", bn: "সফটওয়্যার / ওয়েবসাইট",
    steps: [["আলোচনা", "আপনার ব্যবসা ও প্রয়োজন বুঝে নিই।"], ["প্রস্তাব ও খরচ", "কাজের পরিধি, সময় ও খরচ লিখিতভাবে জানাই।"], ["ডিজাইন ও তৈরি", "ধাপে ধাপে কাজ করে আপনাকে দেখাই।"], ["পরীক্ষা ও হস্তান্তর", "সব পরীক্ষা করে চালু করে দিই।"], ["সহায়তা", "চালুর পরও সহায়তা পাবেন।"]],
    benefits: ["আপনার প্রয়োজন অনুযায়ী তৈরি", "মোবাইল-বান্ধব ও দ্রুত", "বাংলা ও ইংরেজি সুবিধা", "চালুর পর সহায়তা"],
    requirements: ["কাজের বিবরণ ও উদাহরণ দিতে হবে", "লোগো, লেখা ও ছবি সরবরাহ করতে হবে", "অগ্রিম অংশ পরিশোধের পর কাজ শুরু"],
    documents: ["লোগো ও ব্র্যান্ডের রঙ", "লেখা/পণ্যের তালিকা ও ছবি"],
    faq: [["কত দিন লাগে?", "কাজের পরিধি অনুযায়ী — প্রস্তাবে সময় লেখা থাকে।"], ["পরে বদলানো যাবে?", "হ্যাঁ, সম্মত পরিধির মধ্যে পরিবর্তন করা যায়।"], ["ডোমেইন-হোস্টিং কে দেবে?", "আপনার থাকলে সেটিই, না থাকলে আমরা ব্যবস্থা করে দিতে পারি।"]],
  },
  {
    id: "design", icon: "🎨", bn: "ডিজাইন",
    steps: [["তথ্য দিন", "কী ডিজাইন, সাইজ, লেখা ও লোগো পাঠান।"], ["প্রথম নকশা", "আমরা নকশা তৈরি করে দেখাই।"], ["সংশোধন", "আপনার মতামত অনুযায়ী ঠিক করি।"], ["চূড়ান্ত ফাইল/প্রিন্ট", "চূড়ান্ত ফাইল দিই বা প্রিন্ট করে দিই।"]],
    benefits: ["পেশাদার নকশা", "সংশোধনের সুযোগ", "প্রিন্ট-উপযোগী ফাইল", "দ্রুত ডেলিভারি"],
    requirements: ["লেখা ও তথ্য নির্ভুলভাবে দিতে হবে", "চূড়ান্ত অনুমোদনের আগে বানান যাচাই করতে হবে"],
    documents: ["লোগো (ভালো মানের)", "প্রয়োজনীয় ছবি"],
    faq: [["কয়বার সংশোধন করা যায়?", "সাধারণত ২-৩ বার; বেশি হলে আগে জানানো হয়।"], ["ফাইল কোন ফরম্যাটে পাব?", "প্রিন্টের জন্য PDF, অনলাইনের জন্য PNG/JPG।"]],
  },
  {
    id: "documents", icon: "🗂️", bn: "অনলাইন আবেদন / কাগজপত্র",
    steps: [["কী আবেদন জানান", "কোন আবেদন বা কাজ তা জানান।"], ["কাগজপত্র দিন", "প্রয়োজনীয় কাগজের ছবি বা মূল কপি দিন।"], ["আবেদন জমা", "আমরা সঠিকভাবে পূরণ করে জমা দিই।"], ["কপি ও রসিদ", "আবেদনের কপি ও রসিদ আপনাকে দেওয়া হয়।"]],
    benefits: ["নির্ভুলভাবে পূরণ", "সময় বাঁচে", "রসিদ ও কপি পাবেন", "তথ্য গোপন রাখা হয়"],
    requirements: ["সব তথ্য সঠিক ও নিজের হতে হবে", "সরকারি ফি থাকলে আলাদা দিতে হবে"],
    documents: ["জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন", "ছবি (প্রয়োজনে)", "সংশ্লিষ্ট অন্যান্য কাগজ"],
    faq: [["কত সময় লাগে?", "আবেদন জমায় সাধারণত একই দিন; অনুমোদন কর্তৃপক্ষের ওপর নির্ভর করে।"], ["সরকারি ফি কি দামের মধ্যে?", "না, সরকারি ফি আলাদা — আগেই জানানো হয়।"]],
  },
  {
    id: "consult", icon: "💬", bn: "পরামর্শ",
    steps: [["সময় নিন", "পছন্দের সময় ও বিষয় জানান।"], ["আলোচনা", "ফোনে, অনলাইনে বা দোকানে কথা বলি।"], ["পরামর্শ ও পরিকল্পনা", "আপনার জন্য সঠিক সমাধান জানাই।"]],
    benefits: ["অভিজ্ঞ পরামর্শ", "সময় ও খরচ বাঁচে", "নিরপেক্ষ মতামত"],
    requirements: ["বিষয় ও প্রশ্ন আগে থেকে জানালে ভালো হয়"],
    documents: ["সংশ্লিষ্ট কাগজ বা তথ্য (থাকলে)"],
    faq: [["পরামর্শ কি অনলাইনে হয়?", "হ্যাঁ, ফোন বা অনলাইনেও হয়।"], ["ফি কত?", "বিষয় অনুযায়ী — আগে জানানো হয়।"]],
  },
];

export function templateLists(id: string): Partial<DetailLists> {
  const t = DETAIL_TEMPLATES.find((x) => x.id === id);
  if (!t) return {};
  const pair = (bn: string): Pair => ({ bn, en: "" });
  return {
    process_steps: t.steps.map(([title_bn, description_bn], i) => ({ step: i + 1, title: "", title_bn, description: "", description_bn })),
    benefits: t.benefits.map(pair),
    requirements: t.requirements.map(pair),
    required_documents: t.documents.map(pair),
    faq: t.faq.map(([question_bn, answer_bn]) => ({ question: "", answer: "", question_bn, answer_bn })),
  };
}

/** Append items whose text is not already present. */
export function mergeLists(cur: DetailLists, add: Partial<DetailLists>): DetailLists {
  const out = { ...cur };
  (Object.keys(add) as ListKey[]).forEach((k) => {
    const have = new Set((cur[k] as (Step | Pair | Faq)[]).map((it) => itemText(k, it).toLowerCase()));
    const extra = ((add[k] ?? []) as (Step | Pair | Faq)[]).filter((it) => itemText(k, it) && !have.has(itemText(k, it).toLowerCase()));
    (out as Record<ListKey, unknown[]>)[k] = [...(cur[k] as unknown[]), ...extra];
  });
  out.process_steps = renumber(out.process_steps);
  return out;
}

/**
 * Fill blank English text in every list from Bangla (translator passed in),
 * a few at a time. Items keep everything else as typed.
 */
export async function fillEnglish(lists: DetailLists, tr: (bn: string) => Promise<string>): Promise<DetailLists> {
  const jobs: (() => Promise<void>)[] = [];
  const out: DetailLists = {
    process_steps: lists.process_steps.map((s) => ({ ...s })),
    benefits: lists.benefits.map(toPair),
    requirements: lists.requirements.map(toPair),
    required_documents: lists.required_documents.map(toPair),
    faq: lists.faq.map((f) => ({ ...f })),
  };
  const need = <T extends object>(obj: T, en: keyof T, bn: keyof T) => {
    const b = String(obj[bn] ?? "").trim();
    if (b && !String(obj[en] ?? "").trim()) jobs.push(async () => { (obj as Record<keyof T, unknown>)[en] = await tr(b); });
  };
  out.process_steps.forEach((s) => { need(s, "title", "title_bn"); need(s, "description", "description_bn"); });
  [out.benefits, out.requirements, out.required_documents].forEach((l) => l.forEach((p) => need(p, "en", "bn")));
  out.faq.forEach((f) => { need(f, "question", "question_bn"); need(f, "answer", "answer_bn"); });
  for (let i = 0; i < jobs.length; i += 4) await Promise.all(jobs.slice(i, i + 4).map((j) => j()));
  return out;
}
