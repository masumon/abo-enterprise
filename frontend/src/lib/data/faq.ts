export interface FaqItem {
  q: { en: string; bn: string };
  a: { en: string; bn: string };
  category: "general" | "products" | "services" | "software" | "payment" | "shipping";
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    category: "products",
    q: { en: "What products do you sell?", bn: "আপনারা কী কী পণ্য বিক্রি করেন?" },
    a: {
      en: "We sell mobile accessories, phone cases, chargers, cables, power banks, gadgets and more. Delivery available across Sylhet.",
      bn: "আমরা মোবাইল এক্সেসরিজ, ফোন কেস, চার্জার, কেবল, পাওয়ার ব্যাংক, গ্যাজেট ও আরও অনেক পণ্য বিক্রি করি। সিলেটে ডেলিভারি পাওয়া যায়।",
    },
  },
  {
    category: "services",
    q: { en: "How can I book a service?", bn: "কিভাবে সেবা বুক করব?" },
    a: {
      en: "Click 'Book a Service', fill the form with your details and requirements. We'll confirm within 2-4 hours.",
      bn: "'সেবা বুক করুন' ক্লিক করুন, ফর্মে আপনার তথ্য ও প্রয়োজন লিখুন। আমরা ২-৪ ঘন্টার মধ্যে নিশ্চিত করব।",
    },
  },
  {
    category: "software",
    q: { en: "Do you develop custom software?", bn: "আপনারা কি কাস্টম সফটওয়্যার বানান?" },
    a: {
      en: "Yes! We build POS, ERP, CRM, school/hospital management systems, AI chatbots and any custom software your business needs.",
      bn: "হ্যাঁ! আমরা POS, ERP, CRM, স্কুল/হাসপাতাল ম্যানেজমেন্ট সিস্টেম, AI চ্যাটবট এবং আপনার ব্যবসার যেকোনো কাস্টম সফটওয়্যার তৈরি করি।",
    },
  },
  {
    category: "payment",
    q: { en: "What are your payment methods?", bn: "পেমেন্টের পদ্ধতি কী কী?" },
    a: {
      en: "We accept bKash, Nagad, bank transfer and cash on delivery (for products in Sylhet).",
      bn: "আমরা bKash, Nagad, ব্যাংক ট্রান্সফার এবং ক্যাশ অন ডেলিভারি (সিলেটে পণ্যের জন্য) গ্রহণ করি।",
    },
  },
  {
    category: "software",
    q: { en: "How long does software development take?", bn: "সফটওয়্যার ডেভেলপমেন্ট কতদিন লাগে?" },
    a: {
      en: "Simple projects take 1-2 weeks, medium projects 1-2 months, and complex enterprise systems 2-4 months. We always provide a timeline before starting.",
      bn: "সহজ প্রজেক্ট ১-২ সপ্তাহ, মাঝারি প্রজেক্ট ১-২ মাস এবং জটিল এন্টারপ্রাইজ সিস্টেম ২-৪ মাস লাগে। শুরু করার আগে আমরা সবসময় টাইমলাইন দিই।",
    },
  },
  {
    category: "general",
    q: { en: "Do you offer after-sales support?", bn: "বিক্রয়ের পর সাপোর্ট দেন কি?" },
    a: {
      en: "Yes! All software projects include 3 months free support. Products have 7-day return policy for defects.",
      bn: "হ্যাঁ! সব সফটওয়্যার প্রজেক্টে ৩ মাস ফ্রি সাপোর্ট আছে। পণ্যে ত্রুটি থাকলে ৭ দিনের রিটার্ন পলিসি আছে।",
    },
  },
  {
    category: "shipping",
    q: { en: "What are your delivery charges?", bn: "ডেলিভারি চার্জ কত?" },
    a: {
      en: "Free delivery in Sylhet city. Nationwide delivery starts from ৳60 depending on weight and location.",
      bn: "সিলেট শহরে ফ্রি ডেলিভারি। সারাদেশে ওজন ও লোকেশন অনুযায়ী ৳৬০ থেকে শুরু।",
    },
  },
  {
    category: "shipping",
    q: { en: "How long does delivery take?", bn: "ডেলিভারি কতদিন লাগে?" },
    a: {
      en: "Same-day in Sylhet, 2-3 business days nationwide. Express options available on request.",
      bn: "সিলেটে একই দিনে, সারাদেশে ২-৩ কর্মদিবস। অনুরোধে এক্সপ্রেস অপশন পাওয়া যায়।",
    },
  },
];

export const FAQ_CATEGORIES = [
  { id: "all" as const, label: { en: "All", bn: "সব" } },
  { id: "general" as const, label: { en: "General", bn: "সাধারণ" } },
  { id: "products" as const, label: { en: "Products", bn: "পণ্য" } },
  { id: "services" as const, label: { en: "Services", bn: "সেবা" } },
  { id: "software" as const, label: { en: "Software", bn: "সফটওয়্যার" } },
  { id: "payment" as const, label: { en: "Payment", bn: "পেমেন্ট" } },
  { id: "shipping" as const, label: { en: "Shipping", bn: "ডেলিভারি" } },
];
