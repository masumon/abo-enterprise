"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Users, Gift, Laptop, Send, MapPin, Loader2 } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import { useToastStore } from "@/store/toast";
import { BD_PHONE_REGEX, BD_PHONE_ERROR_EN, BD_PHONE_ERROR_BN } from "@/lib/phone";
import { careerApi } from "@/lib/api";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_CAREER_POSITIONS_KEY, getCareerPositions, type CmsCareerPosition } from "@/lib/cmsContent";

const BENEFITS = [
  { icon: Gift, title: { en: "Competitive Salary", bn: "প্রতিযোগিতামূলক বেতন" } },
  { icon: Laptop, title: { en: "Modern Tools", bn: "আধুনিক টুলস" } },
  { icon: Users, title: { en: "Growth Culture", bn: "উন্নতির সংস্কৃতি" } },
  { icon: Heart, title: { en: "Team Support", bn: "টিম সাপোর্ট" } },
];

// GAP-15 / audit C3 — Positions managed via admin panel (Admin -> Career ->
// Open Positions), same settings-JSON CMS pattern as Announcements.
type Position = CmsCareerPosition;

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
  const [submitting, setSubmitting] = useState(false);
  const { settings, loading: loadingPositions } = usePublicSettings([SITE_CAREER_POSITIONS_KEY]);
  const positions: Position[] = getCareerPositions(settings, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("error", lang === "bn" ? "নাম দিন" : "Name is required");
      return;
    }
    if (!BD_PHONE_REGEX.test(phone.trim())) {
      toast("error", lang === "bn" ? BD_PHONE_ERROR_BN : BD_PHONE_ERROR_EN);
      return;
    }
    if (!role) {
      toast("error", lang === "bn" ? "পদ নির্বাচন করুন" : "Please select a position");
      return;
    }

    setSubmitting(true);
    try {
      await careerApi.submit({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        position: role,
        cover_letter: message || undefined,
      });
      toast("success", lang === "bn" ? "আবেদন জমা হয়েছে!" : "Application submitted!");
      setName("");
      setEmail("");
      setPhone("");
      setRole("");
      setMessage("");
    } catch (err) {
      toast("error", lang === "bn" ? "আবেদন জমা দিতে সমস্যা হয়েছে" : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <PageHero
        pageKey="career"
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
          {loadingPositions ? (
            <div className="enterprise-card p-6 text-center mb-14">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted mb-2" />
              <p className="text-sm text-muted">{t({ en: "Loading positions...", bn: "পদ লোড হচ্ছে..." })}</p>
            </div>
          ) : positions.length > 0 ? (
            <div className="space-y-3 mb-14">
              {positions.map((pos) => (
                <div key={pos.id} className="enterprise-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          ) : (
            <div className="enterprise-card p-6 text-center mb-14 text-muted">
              {t({ en: "No open positions currently. Check back soon!", bn: "এখন কোনো খোলা পদ নেই। শীঘ্রই দেখুন!" })}
            </div>
          )}

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
                <label htmlFor="career-name" className="form-label">{t({ en: "Full Name", bn: "পূর্ণ নাম" })}</label>
                <input id="career-name" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
              </div>
              <div>
                <label htmlFor="career-phone" className="form-label">{t({ en: "Phone", bn: "ফোন" })}</label>
                <input id="career-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="01XXXXXXXXX" required />
              </div>
              <div>
                <label htmlFor="career-email" className="form-label">{t({ en: "Email", bn: "ইমেইল" })}</label>
                <input id="career-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
              </div>
              <div>
                <label htmlFor="career-role" className="form-label">{t({ en: "Position", bn: "পদ" })}</label>
                <select id="career-role" value={role} onChange={(e) => setRole(e.target.value)} className="input" disabled={loadingPositions}>
                  <option value="">{t({ en: "Select role", bn: "পদ নির্বাচন" })}</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.title.en}>{t(p.title)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="career-message" className="form-label">{t({ en: "Cover Letter", bn: "কভার লেটার" })}</label>
                <textarea id="career-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="input resize-none" />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={submitting} className="btn btn-brand btn-md w-full sm:w-auto disabled:opacity-60">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? (lang === "bn" ? "জমা দিচ্ছি..." : "Submitting...") : t({ en: "Submit Application", bn: "আবেদন জমা দিন" })}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
