export interface ProjectCase {
  slug: string;
  title: { en: string; bn: string };
  client: { en: string; bn: string };
  category: { en: string; bn: string };
  technologies: string[];
  problem: { en: string; bn: string };
  solution: { en: string; bn: string };
  result: { en: string; bn: string };
  image: string;
  screenshots: string[];
  year: number;
}

export const PROJECTS: ProjectCase[] = [
  {
    slug: "sylhet-retail-pos",
    title: { en: "Retail POS System", bn: "রিটেইল POS সিস্টেম" },
    client: { en: "Sylhet Retail Shop", bn: "সিলেট রিটেইল শপ" },
    category: { en: "POS", bn: "POS" },
    technologies: ["React", "Node.js", "PostgreSQL", "Thermal Print"],
    problem: { en: "Manual billing caused errors and slow checkout.", bn: "ম্যানুয়াল বিলিং-এ ভুল ও ধীর চেকআউট।" },
    solution: { en: "Custom POS with inventory sync and receipt printing.", bn: "ইনভেন্টরি সিঙ্ক ও রসিদ প্রিন্ট সহ কাস্টম POS।" },
    result: { en: "50% faster billing, zero calculation errors.", bn: "৫০% দ্রুত বিলিং, শূন্য হিসাব ভুল।" },
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
    ],
    year: 2025,
  },
  {
    slug: "clinic-hms",
    title: { en: "Hospital Management System", bn: "হাসপাতাল ম্যানেজমেন্ট সিস্টেম" },
    client: { en: "Local Clinic, Sylhet", bn: "স্থানীয় ক্লিনিক, সিলেট" },
    category: { en: "Healthcare", bn: "স্বাস্থ্য" },
    technologies: ["Next.js", "FastAPI", "PostgreSQL"],
    problem: { en: "Paper records and delayed billing.", bn: "কাগজের রেকর্ড ও বিলিং বিলম্ব।" },
    solution: { en: "Digital patient records and automated billing.", bn: "ডিজিটাল রোগী রেকর্ড ও অটো বিলিং।" },
    result: { en: "100% digital records, 3x faster billing.", bn: "১০০% ডিজিটাল রেকর্ড, ৩x দ্রুত বিলিং।" },
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80",
    ],
    year: 2024,
  },
  {
    slug: "ecommerce-ai-chatbot",
    title: { en: "E-Commerce + AI Chatbot", bn: "ই-কমার্স + AI চ্যাটবট" },
    client: { en: "E-Commerce Brand", bn: "ই-কমার্স ব্র্যান্ড" },
    category: { en: "Web + AI", bn: "ওয়েব + AI" },
    technologies: ["Next.js", "OpenAI API", "Vercel"],
    problem: { en: "No online presence, losing customers.", bn: "অনলাইনে উপস্থিতি নেই, গ্রাহক হারানো।" },
    solution: { en: "Full storefront with 24/7 AI customer support.", bn: "২৪/৭ AI সাপোর্ট সহ সম্পূর্ণ স্টোরফ্রন্ট।" },
    result: { en: "200% more leads in 3 months.", bn: "৩ মাসে ২০০% বেশি লিড।" },
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80",
    screenshots: [
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80",
    ],
    year: 2025,
  },
];

export function getProject(slug: string) {
  return PROJECTS.find((p) => p.slug === slug);
}
