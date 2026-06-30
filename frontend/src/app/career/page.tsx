"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Users, Gift, Laptop, Send, MapPin } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import { useToastStore } from "@/store/toast";

const BENEFITS = [
  { icon: Gift, title: { en: "Competitive Salary", bn: "প্রতিযোগিতামূলক বেতন" } },
  { icon: Laptop, title: { en: "Modern Tools", bn: "আধুনিক টুলস" } },
  { icon: Users, title: { en: "Growth Culture", bn: "উন্নতির সংস্কৃতি" } },
  { icon: Heart, title: { en: "Team Support", bn: "টিম সাপোর্ট" } },
];

const POSITIONS = [
  { title: { en: "Frontend Developer", bn: "ফ্রন্টএন্ড ডেভেলপার" }, type: { en: "Full-time", bn: "ফুল-টাইম" }, location: { en: "Sylhet / Remote", bn: "সিলেট / রিমোট" } },
  { title: { en: "Sales Executive", bn: "সেলস এক্সিকিউটিভ" }, type: { en: "Full-time", bn: "ফুল-টাইম" }, location: { en: "Sylhet", bn: "সিলেট" } },
  { title: { en: "Customer Support", bn: "কাস্টমার সাপোর্ট" }, type: { en: "Part-time", bn: "পার্ট-টাইম" }, location: { en: "Sylhet", bn: "সিলেট" } },
];

const HIRING_STEPS = [
  { en: "Apply Online", bn: "অনলাইনে আবেদন" },
  { en: "Screening Call", bn: "স্ক্রিনিং কল" },
  { en: "Technical / Role Interview", bn: "টেকনিক্যাল / রোল ইন্টারভিউ" },
  { en: "Offer & Onboarding", bn: "অফার ও অনবোর্ডিং" },
];

export default function CareerPage() {
  const { lang } = useLanguageStore();
  const toast = useToastStore((s) => s.push);
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    toast("success", lang === "bn" ? "আবেদন জমা হয়েছে!" : "Application submitted!");
    setName("");
    setEmail("");
    setPhone("");
    setRole("");
    setMessage("");
  };

  return (
    <main>
      <PageHero
        title={lang === "bn" ? "ক্যারিয়ার" : "Careers"}
        subtitle={lang === "bn" ? "ABO Enterprise-এ যোগ দিন" : "Join the ABO Enterprise team"}
        breadcrumbs={[{ label: lang === "bn" ? "ক্যারিয়ার" : "Careers" }]}
      />

      <section className="enterprise-section">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-heading mb-6">{t({ en: "Our Culture", bn: "আমাদের সংস্কৃতি" })}</h2>
          <p className="text-muted leading-relaxed mb-8 max-w-2xl">
            {t({
              en: "We build technology that empowers Bangladeshi businesses. Join a team that values innovation, customer impact, and continuous learning.",
              bn: "আমরা বাংলাদেশি ব্যবসাকে ক্ষমতায়নকারী প্রযুক্তি তৈরি করি। উদ্ভাবন, গ্রাহক প্রভাব ও ক্রমাগত শেখার মূল্যবোধে বিশ্বাসী টিমে যোগ দিন।",
            })}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            {BENEFITS.map(({ icon: Icon, title }) => (
              <div key={title.en} className="enterprise-card p-5 text-center">
                <Icon className="w-7 h-7 text-brand-600 mx-auto mb-2" />
                <p className="font-semibold text-heading text-sm">{t(title)}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-heading mb-6">{t({ en: "Open Positions", bn: "খোলা পদ" })}</h2>
          <div className="space-y-3 mb-14">
            {POSITIONS.map((pos) => (
              <div key={pos.title.en} className="enterprise-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-heading">{t(pos.title)}</h3>
                  <p className="text-sm text-muted flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {t(pos.location)} · {t(pos.type)}
                  </p>
                </div>
                <a href="#apply" className="btn btn-brand btn-sm flex-shrink-0">{t({ en: "Apply", bn: "আবেদন" })}</a>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-heading mb-6">{t({ en: "Hiring Process", bn: "নিয়োগ প্রক্রিয়া" })}</h2>
          <div className="grid sm:grid-cols-4 gap-3 mb-14">
            {HIRING_STEPS.map((step, i) => (
              <div key={step.en} className="enterprise-card p-4 text-center">
                <span className="w-7 h-7 rounded-full bg-accent-500 text-white text-xs font-bold inline-flex items-center justify-center mb-2">{i + 1}</span>
                <p className="text-sm font-medium text-heading">{t({ en: step.en, bn: step.bn })}</p>
              </div>
            ))}
          </div>

          <div id="apply" className="enterprise-card p-6 md:p-8">
            <h2 className="text-xl font-bold text-heading mb-6">{t({ en: "Apply Now", bn: "এখনই আবেদন করুন" })}</h2>
            <form onSubmit={handleApply} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">{t({ en: "Full Name", bn: "পূর্ণ নাম" })}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="form-label">{t({ en: "Phone", bn: "ফোন" })}</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="01XXXXXXXXX" required />
              </div>
              <div>
                <label className="form-label">{t({ en: "Email", bn: "ইমেইল" })}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
              </div>
              <div>
                <label className="form-label">{t({ en: "Position", bn: "পদ" })}</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
                  <option value="">{t({ en: "Select role", bn: "পদ নির্বাচন" })}</option>
                  {POSITIONS.map((p) => (
                    <option key={p.title.en} value={p.title.en}>{t(p.title)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">{t({ en: "Cover Letter", bn: "কভার লেটার" })}</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="input resize-none" />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="btn btn-brand btn-md w-full sm:w-auto">
                  <Send className="w-4 h-4" />
                  {t({ en: "Submit Application", bn: "আবেদন জমা দিন" })}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
