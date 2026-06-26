"use client";

import Link from "next/link";
import { Bot, Target, Eye, Heart, CheckCircle, Users, Briefcase, ShoppingCart } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const VALUES = [
  { icon: Heart, title: { en: "Customer First", bn: "গ্রাহক প্রথম" }, desc: { en: "Every decision starts with what's best for our customers.", bn: "সব সিদ্ধান্ত গ্রাহকের স্বার্থে।" } },
  { icon: Target, title: { en: "Excellence", bn: "উৎকর্ষ" }, desc: { en: "Quality that exceeds expectations.", bn: "প্রত্যাশা ছাড়িয়ে মান।" } },
  { icon: CheckCircle, title: { en: "Integrity", bn: "সততা" }, desc: { en: "Honest pricing and transparent communication.", bn: "সৎ মূল্য ও স্বচ্ছ যোগাযোগ।" } },
  { icon: Bot, title: { en: "Innovation", bn: "উদ্ভাবন" }, desc: { en: "Latest technology including AI.", bn: "AI সহ আধুনিক প্রযুক্তি।" } },
];

export default function AboutPage() {
  const { lang } = useLanguageStore();
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  return (
    <main className="min-h-screen">
      <section className="gradient-brand text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Bot className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">ABO Enterprise</h1>
          <p className="text-xl text-brand-100">{t({ en: "Products, printing, legal help & software — one platform.", bn: "পণ্য, প্রিন্টিং, আইনি সহায়তা ও সফটওয়্যার — এক প্ল্যাটফর্মে।" })}</p>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <div className="section-title"><h2>{t({ en: "Our Story", bn: "আমাদের গল্প" })}</h2></div>
            <p className="text-gray-600 leading-relaxed mt-4">
              {t({
                en: "ABO Enterprise brings affordable quality products and professional services to businesses across Bangladesh — from Sylhet to nationwide.",
                bn: "ABO Enterprise বাংলাদেশ জুড়ে সাশ্রয়ী মানের পণ্য ও পেশাদার সেবা নিয়ে এসেছে — সিলেট থেকে সারাদেশে।",
              })}
            </p>
          </div>
          <div className="card p-6">
            <Eye className="w-8 h-8 text-brand-600 mb-3" />
            <h3 className="font-bold text-lg mb-2">{t({ en: "Our Vision", bn: "আমাদের ভিশন" })}</h3>
            <p className="text-gray-600 text-sm">{t({ en: "Bangladesh's most trusted integrated tech provider.", bn: "বাংলাদেশের সবচেয়ে বিশ্বস্ত ইন্টিগ্রেটেড টেক প্রদানকারী।" })}</p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="section-title text-center"><h2>{t({ en: "Our Values", bn: "আমাদের মূল্যবোধ" })}</h2></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title.en} className="card p-6 text-center">
                <Icon className="w-8 h-8 text-brand-600 mx-auto mb-3" />
                <h3 className="font-bold mb-2">{t(title)}</h3>
                <p className="text-sm text-gray-500">{t(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-900 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">{t({ en: "Ready to Work Together?", bn: "একসাথে কাজ করতে প্রস্তুত?" })}</h2>
        <Link href="/contact" className="btn btn-brand btn-lg mt-4">{t({ en: "Contact Us", bn: "যোগাযোগ করুন" })}</Link>
      </section>
    </main>
  );
}
