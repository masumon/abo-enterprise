"use client";

import Link from "next/link";
import Image from "next/image";
import { Target, Eye, Heart, CheckCircle, Users, Briefcase, ShoppingCart, Award, Calendar, TrendingUp } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const VALUES = [
  { icon: Heart, title: { en: "Customer First", bn: "গ্রাহক প্রথম" }, desc: { en: "Every decision starts with what's best for our customers.", bn: "সব সিদ্ধান্ত গ্রাহকের স্বার্থে।" } },
  { icon: Target, title: { en: "Excellence", bn: "উৎকর্ষ" }, desc: { en: "Quality that exceeds expectations.", bn: "প্রত্যাশা ছাড়িয়ে মান।" } },
  { icon: CheckCircle, title: { en: "Integrity", bn: "সততা" }, desc: { en: "Honest pricing and transparent communication.", bn: "সৎ মূল্য ও স্বচ্ছ যোগাযোগ।" } },
  { icon: TrendingUp, title: { en: "Innovation", bn: "উদ্ভাবন" }, desc: { en: "Latest technology including AI.", bn: "AI সহ আধুনিক প্রযুক্তি।" } },
];

const TIMELINE = [
  { year: "2019", title: { en: "Founded in Sylhet", bn: "সিলেটে প্রতিষ্ঠা" }, desc: { en: "Started as a mobile accessories shop at Hazi Bahar Uddin Market.", bn: "হাজি বাহার উদ্দিন মার্কেটে মোবাইল এক্সেসরিজ দোকান হিসেবে শুরু।" } },
  { year: "2021", title: { en: "Services Expansion", bn: "সেবা সম্প্রসারণ" }, desc: { en: "Added printing, legal assistance, and business consulting.", bn: "প্রিন্টিং, আইনি সহায়তা ও ব্যবসায়িক পরামর্শ যোগ।" } },
  { year: "2023", title: { en: "Software Division", bn: "সফটওয়্যার বিভাগ" }, desc: { en: "Launched custom software, POS, ERP, and AI solutions.", bn: "কাস্টম সফটওয়্যার, POS, ERP ও AI সমাধান চালু।" } },
  { year: "2025", title: { en: "Digital Platform", bn: "ডিজিটাল প্ল্যাটফর্ম" }, desc: { en: "Full e-commerce platform with AI assistant and nationwide reach.", bn: "AI সহকারী ও সারাদেশে পৌঁছানোর পূর্ণ ই-কমার্স প্ল্যাটফর্ম।" } },
];

const ACHIEVEMENTS = [
  { icon: Users, value: "500+", label: { en: "Happy Clients", bn: "সন্তুষ্ট গ্রাহক" } },
  { icon: Briefcase, value: "50+", label: { en: "Projects Delivered", bn: "সম্পন্ন প্রজেক্ট" } },
  { icon: ShoppingCart, value: "200+", label: { en: "Products", bn: "পণ্য" } },
  { icon: Award, value: "5+", label: { en: "Years Experience", bn: "বছরের অভিজ্ঞতা" } },
];

const TEAM = [
  { name: "Ahmed Brothers", role: { en: "Founding Team", bn: "প্রতিষ্ঠাতা দল" }, desc: { en: "Leading products, services & software strategy.", bn: "পণ্য, সেবা ও সফটওয়্যার কৌশল পরিচালনা।" } },
  { name: "Tech Team", role: { en: "Software Engineers", bn: "সফটওয়্যার ইঞ্জিনিয়ার" }, desc: { en: "Web, mobile, AI & automation specialists.", bn: "ওয়েব, মোবাইল, AI ও অটোমেশন বিশেষজ্ঞ।" } },
  { name: "Support Team", role: { en: "Customer Success", bn: "গ্রাহক সেবা" }, desc: { en: "24/7 support via WhatsApp, phone & AI assistant.", bn: "WhatsApp, ফোন ও AI সহকারীতে ২৪/৭ সেবা।" } },
];

export default function AboutPage() {
  const { lang } = useLanguageStore();
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  return (
    <main className="min-h-screen">
      <section className="gradient-brand text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-4 border-white/30 overflow-hidden shadow-xl">
            <Image src="/logo.jpg" alt="ABO Enterprise" width={80} height={80} className="object-cover w-full h-full" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">ABO Enterprise</h1>
          <p className="text-sm text-brand-200 mb-2">Ahmed Brothers Organization</p>
          <p className="text-xl text-brand-100 max-w-2xl mx-auto">
            {t({ en: "Products, printing, legal help & software — one trusted platform for Bangladesh.", bn: "পণ্য, প্রিন্টিং, আইনি সহায়তা ও সফটওয়্যার — বাংলাদেশের এক বিশ্বস্ত প্ল্যাটফর্ম।" })}
          </p>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="section-title"><h2>{t({ en: "Our Story", bn: "আমাদের গল্প" })}</h2></div>
            <p className="text-gray-600 leading-relaxed mt-4">
              {t({
                en: "ABO Enterprise began in Sylhet as a trusted mobile accessories retailer. Today we are Bangladesh's complete technology ecosystem — combining quality products, professional printing, legal document assistance, custom software development, and AI-powered business solutions under one roof.",
                bn: "ABO Enterprise সিলেটে একটি বিশ্বস্ত মোবাইল এক্সেসরিজ রিটেইলার হিসেবে শুরু হয়। আজ আমরা বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম — মানসম্মত পণ্য, পেশাদার প্রিন্টিং, আইনি ডকুমেন্ট সহায়তা, কাস্টম সফটওয়্যার ও AI-চালিত ব্যবসায়িক সমাধান এক ছাদের নিচে।",
              })}
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              {t({
                en: "From shop owners needing POS systems to businesses requiring ERP, CRM, or e-commerce — we deliver affordable, reliable technology that grows with you.",
                bn: "POS সিস্টেম প্রয়োজনীয় দোকানদার থেকে ERP, CRM বা ই-কমার্স চাওয়া ব্যবসায়ীদের — আমরা সাশ্রয়ী, নির্ভরযোগ্য প্রযুক্তি দিই যা আপনার সাথে বাড়ে।",
              })}
            </p>
          </div>
          <div className="card p-6 bg-gradient-to-br from-brand-50 to-white">
            <Eye className="w-8 h-8 text-brand-600 mb-3" />
            <h3 className="font-bold text-lg mb-2">{t({ en: "Our Vision", bn: "আমাদের ভিশন" })}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{t({ en: "To become Bangladesh's most trusted integrated technology provider — empowering every business with affordable, world-class digital tools.", bn: "বাংলাদেশের সবচেয়ে বিশ্বস্ত ইন্টিগ্রেটেড টেক প্রদানকারী হওয়া — সাশ্রয়ী, বিশ্বমানের ডিজিটাল সরঞ্জামে প্রতিটি ব্যবসাকে ক্ষমতায়ন করা।" })}</p>
          </div>
        </div>
      </section>

      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="section-title text-center"><h2>{t({ en: "Key Achievements", bn: "প্রধান অর্জন" })}</h2></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {ACHIEVEMENTS.map(({ icon: Icon, value, label }) => (
              <div key={label.en} className="card p-5 text-center">
                <Icon className="w-7 h-7 text-brand-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-brand-700">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{t(label)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="section-title text-center"><h2>{t({ en: "Our Journey", bn: "আমাদের যাত্রা" })}</h2></div>
          <div className="mt-10 space-y-6">
            {TIMELINE.map((item) => (
              <div key={item.year} className="flex gap-4">
                <div className="flex-shrink-0 w-16 text-center">
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-600 text-white font-bold text-sm">
                    {item.year}
                  </span>
                </div>
                <div className="card p-5 flex-1">
                  <h3 className="font-bold text-gray-900">{t(item.title)}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t(item.desc)}</p>
                </div>
              </div>
            ))}
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

      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="section-title text-center"><h2>{t({ en: "Our Team", bn: "আমাদের দল" })}</h2></div>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {TEAM.map((member) => (
              <div key={member.name} className="card p-6 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-brand-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="font-bold text-gray-900">{member.name}</h3>
                <p className="text-sm text-brand-600 font-medium mt-1">{t(member.role)}</p>
                <p className="text-xs text-gray-500 mt-2">{t(member.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-brand opacity-95" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)" }} />
        <div className="relative max-w-3xl mx-auto text-center text-white">
          <Calendar className="w-10 h-10 mx-auto mb-4 text-yellow-300" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t({ en: "Ready to Work Together?", bn: "একসাথে কাজ করতে প্রস্তুত?" })}</h2>
          <p className="text-brand-100 mb-8 max-w-lg mx-auto">
            {t({ en: "Whether you need products, printing, legal help, or custom software — we're here for you.", bn: "পণ্য, প্রিন্টিং, আইনি সহায়তা বা কাস্টম সফটওয়্যার — আমরা আপনার পাশে আছি।" })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="btn btn-lg bg-white text-brand-700 hover:bg-brand-50 font-semibold">{t({ en: "Contact Us", bn: "যোগাযোগ করুন" })}</Link>
            <Link href="/projects" className="btn btn-lg btn-outline border-white/50 text-white hover:bg-white/10">{t({ en: "Get a Quote", bn: "কোটেশন নিন" })}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
