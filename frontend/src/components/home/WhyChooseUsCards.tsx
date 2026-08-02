"use client";

import { useLanguageStore } from "@/store/language";
import { Shield, Truck, Lock, RotateCcw, Award, Headphones } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

const WHY_CHOOSE_US = [
  {
    id: "guarantee",
    icon: Shield,
    label: { en: "100% Original Products", bn: "১০০% অরিজিনাল প্রোডাক্ট" },
    description: {
      en: "We guarantee 100% original and authentic products for all customers.",
      bn: "আমরা সব গ্রাহকের জন্য ১০০% অরিজিনাল এবং খাঁটি পণ্যের গ্যারান্টি দিই।",
    },
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-500/10",
  },
  {
    id: "delivery",
    icon: Truck,
    label: { en: "Free Delivery in Sylhet", bn: "সিলেটে ফ্রি ডেলিভারি" },
    description: {
      en: "Free delivery on orders above 2000 tk in Sylhet area and surrounding regions.",
      bn: "সিলেট এলাকায় ২০০০ টাকার উপরে অর্ডারে ফ্রি ডেলিভারি।",
    },
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    id: "payment",
    icon: Lock,
    label: { en: "Secure Payment", bn: "নিরাপদ পেমেন্ট" },
    description: {
      en: "Your payment information is always secure and encrypted with SSL technology.",
      bn: "আপনার পেমেন্ট তথ্য সর্বদা নিরাপদ এবং SSL প্রযুক্তি দ্বারা এনক্রিপ্ট করা।",
    },
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
  },
  {
    id: "return",
    icon: RotateCcw,
    label: { en: "Easy Returns", bn: "সহজ রিটার্ন নীতি" },
    description: {
      en: "7-day easy return policy if you're not satisfied with your purchase.",
      bn: "যদি সন্তুষ্ট না হন তাহলে ৭ দিনের মধ্যে সহজ রিটার্ন নীতি।",
    },
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-500/10",
  },
  {
    id: "warranty",
    icon: Award,
    label: { en: "Warranty Support", bn: "ওয়ারেন্টি সাপোর্ট" },
    description: {
      en: "Extended warranty and after-sales support for all electronic products.",
      bn: "সব ইলেকট্রনিক্স পণ্যের জন্য সম্প্রসারিত ওয়ারেন্টি এবং আফটার সেল সাপোর্ট।",
    },
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-500/10",
  },
  {
    id: "support",
    icon: Headphones,
    label: { en: "24/7 Customer Support", bn: "২৪/৭ কাস্টমার সাপোর্ট" },
    description: {
      en: "Our support team is available 24/7 to help you with any queries.",
      bn: "আমাদের সাপোর্ট টিম ২৪/৭ আপনার যেকোনো প্রশ্নের উত্তর দিতে প্রস্তুত।",
    },
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-500/10",
  },
];

export default function WhyChooseUsCards() {
  const { lang } = useLanguageStore();

  return (
    <section className="py-12 lg:py-16 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="text-4xl" aria-hidden>⭐</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-heading mb-4">
            {lang === "bn" ? "কেন আমাদের বেছে নেবেন?" : "Why Choose Us?"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
            {lang === "bn"
              ? "আমরা আপনার বিশ্বাস এবং সন্তুষ্টিকে সর্বোচ্চ অগ্রাধিকার দিই।"
              : "We prioritize your trust and satisfaction above everything else."}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_CHOOSE_US.map(({ id, icon: Icon, label, description, color, bgColor }) => (
            <GlassCard key={id} hover className="flex flex-col items-start gap-4 p-6">
              <div className={`w-14 h-14 rounded-xl ${bgColor} flex items-center justify-center`}>
                <Icon className={`w-7 h-7 ${color}`} aria-hidden />
              </div>
              <div>
                <h3 className="font-bold text-lg text-heading mb-2">
                  {lang === "bn" ? label.bn : label.en}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {lang === "bn" ? description.bn : description.en}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
