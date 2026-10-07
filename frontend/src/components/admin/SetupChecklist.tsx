"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import { adminApi, authApi, paymentMethodsAdminApi } from "@/lib/api";
import { sanitizeBusinessHours } from "@/lib/businessHours";
import { normalizeBdPhoneDigits } from "@/lib/phone";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  done: boolean;
  bn: string;
  en: string;
  hintBn: string;
  hintEn: string;
  href: string;
}

/**
 * Plain-language "what is still missing" guide for the dashboard. It only reads data
 * and links to the right admin screen, so a non-technical admin can finish the
 * essentials (contact numbers, hours, payment, products, security) without help.
 * An item whose data could not be loaded is simply left out — never a false alarm.
 */
export default function SetupChecklist({ totalProducts }: { totalProducts?: number | null }) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const [items, setItems] = useState<Item[] | null>(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Each lookup is optional: a failure (or a missing endpoint) just omits that item.
      const safe = <T,>(call: () => Promise<T>): Promise<T | null> => {
        try {
          return call().catch(() => null);
        } catch {
          return Promise.resolve(null);
        }
      };
      const [settingsRes, payRes, twoFaRes] = await Promise.all([
        safe(() => adminApi.getSettings()),
        safe(() => paymentMethodsAdminApi.list()),
        safe(() => authApi.totpStatus()),
      ]);
      const out: Item[] = [];
      const s = settingsRes?.data?.data;
      if (s) {
        const has = (k: string) => !!(s[k] ?? "").trim();
        out.push({
          id: "phone", done: !!normalizeBdPhoneDigits(s.contact_phone ?? ""),
          bn: "কল করার ফোন নম্বর দিন", en: "Add your call phone number",
          hintBn: "ওয়েবসাইট, ইনভয়েস ও গ্রাহকের এসএমএসে এই নম্বর দেখাবে।", hintEn: "Shown on the site, invoices and customer SMS.",
          href: "/sumon/settings#company_info",
        });
        out.push({
          id: "whatsapp", done: !!normalizeBdPhoneDigits(s.whatsapp_number ?? ""),
          bn: "হোয়াটসঅ্যাপ নম্বর দিন", en: "Add your WhatsApp number",
          hintBn: "সব হোয়াটসঅ্যাপ বাটন এই নম্বরে যাবে। কল নম্বরের থেকে আলাদা রাখা যায়।", hintEn: "Every WhatsApp button uses this. It can differ from the call number.",
          href: "/sumon/settings#company_info",
        });
        out.push({
          id: "email", done: has("contact_email"),
          bn: "যোগাযোগের ইমেইল দিন", en: "Add your contact email",
          hintBn: "গ্রাহক ও আইনি পেজে দেখানো হয়।", hintEn: "Shown to customers and on the legal pages.",
          href: "/sumon/settings#company_info",
        });
        out.push({
          id: "address", done: has("contact_address") || has("contact_address_en"),
          bn: "দোকানের ঠিকানা দিন", en: "Add your shop address",
          hintBn: "যোগাযোগ পেজ, ফুটার ও ম্যাপে দেখাবে।", hintEn: "Shown on the contact page, footer and map.",
          href: "/sumon/settings#company_info",
        });
        const hoursOk = !!sanitizeBusinessHours(s.contact_hours_bn, s.site_name) || !!sanitizeBusinessHours(s.contact_hours_en, s.site_name);
        out.push({
          id: "hours", done: hoursOk,
          bn: "ব্যবসার সময় লিখুন", en: "Write your business hours",
          hintBn: "যেমন: শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা (ব্যবসার নাম নয়, সময় লিখুন)।", hintEn: "e.g. Sat–Thu, 9 AM – 9 PM (hours, not the business name).",
          href: "/sumon/settings#company_info",
        });
        out.push({
          id: "delivery", done: ["delivery_charge_sylhet", "delivery_charge_dhaka", "delivery_charge_outside"].some(has),
          bn: "ডেলিভারি চার্জ ঠিক করুন", en: "Set your delivery charges",
          hintBn: "চেকআউটে গ্রাহক এই চার্জ দেখবেন।", hintEn: "Customers see this at checkout.",
          href: "/sumon/delivery",
        });
      }
      const methods = payRes?.data?.data;
      if (Array.isArray(methods)) {
        out.push({
          id: "payment", done: methods.some((m) => m.is_active),
          bn: "অন্তত একটি পেমেন্ট পদ্ধতি চালু করুন", en: "Turn on at least one payment method",
          hintBn: "ছাড়া গ্রাহক অনলাইনে দাম দিতে পারবেন না।", hintEn: "Without one, customers cannot pay online.",
          href: "/sumon/payments",
        });
      }
      if (typeof totalProducts === "number") {
        out.push({
          id: "products", done: totalProducts > 0,
          bn: "প্রথম পণ্য যোগ করুন", en: "Add your first product",
          hintBn: "পণ্য না থাকলে দোকানের তাক খালি দেখায়।", hintEn: "Without products the shop shelf stays empty.",
          href: "/sumon/products",
        });
      }
      const tf = twoFaRes?.data?.data;
      if (tf) {
        out.push({
          id: "2fa", done: !!tf.enabled,
          bn: "নিজের অ্যাকাউন্টে ২-ধাপ যাচাই চালু করুন", en: "Turn on two-step verification for your account",
          hintBn: "পাসওয়ার্ড ফাঁস হলেও কেউ ঢুকতে পারবে না। ২ মিনিটের কাজ।", hintEn: "Keeps your account safe even if the password leaks. Takes 2 minutes.",
          href: "/sumon/security",
        });
      }
      if (alive) setItems(out);
    })();
    return () => { alive = false; };
  }, [totalProducts]);

  if (!items || items.length === 0) return null;
  const pending = items.filter((i) => !i.done);
  if (pending.length === 0) return null;
  const done = items.filter((i) => i.done);
  const pct = Math.round((done.length / items.length) * 100);

  return (
    <section className="enterprise-card p-4 sm:p-5 mb-5" aria-labelledby="setup-guide-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="setup-guide-title" className="font-bold text-heading">
          {bn ? "সেটআপ গাইড — কী কী বাকি আছে" : "Setup guide — what is still missing"}
        </h2>
        <span className="text-xs font-semibold text-muted">
          {bn ? `${done.length}/${items.length} সম্পন্ন` : `${done.length}/${items.length} done`}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-brand-50 dark:bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-3 divide-y divide-[var(--line)]">
        {pending.map((i) => (
          <li key={i.id}>
            <Link href={i.href} className="flex items-start gap-3 py-2.5 rounded-lg hover:bg-brand-50/60 dark:hover:bg-white/5 px-1 -mx-1 transition-colors">
              <Circle className="w-5 h-5 text-amber-500 flex-none mt-0.5" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-heading">{bn ? i.bn : i.en}</span>
                <span className="block text-xs text-muted leading-relaxed">{bn ? i.hintBn : i.hintEn}</span>
              </span>
              <span className="text-xs font-semibold text-brand-600 dark:text-brand-300 whitespace-nowrap mt-0.5">{bn ? "ঠিক করুন →" : "Fix →"}</span>
            </Link>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <div className="mt-2">
          <button type="button" onClick={() => setShowDone((v) => !v)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-heading" aria-expanded={showDone}>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showDone && "rotate-180")} aria-hidden />
            {bn ? "সম্পন্ন কাজ দেখুন" : "Show completed"}
          </button>
          {showDone && (
            <ul className="mt-1.5 space-y-1">
              {done.map((i) => (
                <li key={i.id} className="flex items-center gap-2 text-xs text-muted">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-none" aria-hidden /> {bn ? i.bn : i.en}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
