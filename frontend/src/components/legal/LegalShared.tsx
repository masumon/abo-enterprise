"use client";

import Link from "next/link";
import { Mail, MapPin, ShieldCheck } from "lucide-react";
import ContactActions from "@/components/common/ContactActions";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { buildContactInfo, CONTACT_SETTING_KEYS } from "@/hooks/useContactInfo";
import { useLanguageStore } from "@/store/language";
import { ABOUT_TEAM_KEY, getAboutTeam } from "@/lib/cmsContent";
import { reopenConsent } from "@/lib/cookieConsent";
import { cn } from "@/lib/utils";

/** National consumer complaint hotline of the Directorate of National Consumer Rights Protection (DNCRP). */
const DNCRP_HOTLINE = "16121";

const SUPPORT_ROLE_RE = /support|customer|compliance|grievance|সাপোর্ট|গ্রাহক|অভিযোগ/i;

/**
 * Company facts used inside the legal pages. Everything comes from the admin
 * settings / team list; the complaints officer falls back to the team member
 * whose role mentions support / customer service.
 */
export function useLegalCompany() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const { settings } = usePublicSettings([
    ...CONTACT_SETTING_KEYS,
    "site_name",
    "contact_address",
    "contact_address_en",
    "contact_compliance_officer_name",
    "contact_compliance_officer_title",
    ABOUT_TEAM_KEY,
  ]);
  const contact = buildContactInfo(settings);
  const brand = getSettingValue(settings, "site_name", "ABO Enterprise");
  const addressBn = getSettingValue(settings, "contact_address");
  const addressEn = getSettingValue(settings, "contact_address_en");
  const address = (isBn ? addressBn || addressEn : addressEn || addressBn).trim();

  const supportMember = getAboutTeam(settings, []).find((m) =>
    SUPPORT_ROLE_RE.test(`${m.role?.en ?? ""} ${m.role?.bn ?? ""}`),
  );
  const officerName = getSettingValue(settings, "contact_compliance_officer_name") || supportMember?.name || "";
  const officerTitle =
    getSettingValue(settings, "contact_compliance_officer_title") ||
    (supportMember ? (isBn ? supportMember.role?.bn || supportMember.role?.en : supportMember.role?.en || supportMember.role?.bn) : "") ||
    "";

  return { isBn, brand, address, contact, officerName, officerTitle };
}

/** Complaints & compliance desk — placed at the end of every legal page. */
export function ComplianceOfficerBlock({ className }: { className?: string }) {
  const { isBn, brand, address, contact, officerName, officerTitle } = useLegalCompany();
  return (
    <div className={cn("rounded-2xl border border-[var(--line)] bg-brand-50/60 dark:bg-white/5 p-4 sm:p-5 space-y-3", className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-600 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-bold text-heading">{isBn ? "অভিযোগ ও কমপ্লায়েন্স ডেস্ক" : "Complaints & Compliance Desk"}</h3>
          {(officerName || officerTitle) && (
            <p className="text-sm text-muted">
              {officerName && <span className="font-semibold text-heading">{officerName}</span>}
              {officerName && officerTitle ? " · " : ""}
              {officerTitle}
            </p>
          )}
        </div>
      </div>
      <p className="text-sm leading-relaxed">
        {isBn
          ? `${brand} এর বিরুদ্ধে যেকোনো অভিযোগ, তথ্য-সংক্রান্ত অনুরোধ বা গোপনীয়তা বিষয়ক প্রশ্ন নিচের মাধ্যমে জানান। আমরা ফোন, ইমেইল বা এসএমএসে ৭২ ঘণ্টার মধ্যে সাড়া দিই এবং প্রতিটি অভিযোগের রেকর্ড সংরক্ষণ করি।`
          : `Send any complaint, data request or privacy question about ${brand} through the channels below. We respond by phone, email or SMS within 72 hours and keep a record of every complaint.`}
      </p>
      <ul className="space-y-1.5 text-sm">
        {contact.email && (
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4 flex-none text-brand-600" aria-hidden />
            <a href={`mailto:${contact.email}`} className="font-medium text-brand-700 dark:text-brand-300 hover:underline break-all">{contact.email}</a>
          </li>
        )}
        {address && (
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 flex-none text-brand-600" aria-hidden />
            <span>{address}</span>
          </li>
        )}
      </ul>
      <ContactActions size="sm" showNumbers variant="outline" />
      <p className="text-xs text-muted leading-relaxed">
        {isBn
          ? `সমাধানে সন্তুষ্ট না হলে আপনি জাতীয় ভোক্তা-অধিকার সংরক্ষণ অধিদপ্তরে (হটলাইন ${DNCRP_HOTLINE}) অভিযোগ করতে পারেন।`
          : `If you are not satisfied with the outcome, you may complain to the Directorate of National Consumer Rights Protection (hotline ${DNCRP_HOTLINE}).`}
      </p>
    </div>
  );
}

export type ConsentPurpose = "order" | "booking" | "register" | "inquiry";

/**
 * Consent declaration shown next to a submit button. Bangladesh's Digital
 * Commerce Guidelines accept a checkbox *or* a clear declaration before data
 * is collected; this is the declaration form, so it can never block a form.
 */
export function LegalConsentNote({ purpose, className }: { purpose: ConsentPurpose; className?: string }) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const lead = {
    order: bn ? "অর্ডার নিশ্চিত করার মাধ্যমে আপনি আমাদের" : "By placing this order you agree to our",
    booking: bn ? "বুকিং জমা দেওয়ার মাধ্যমে আপনি আমাদের" : "By submitting this booking you agree to our",
    register: bn ? "অ্যাকাউন্ট খোলার মাধ্যমে আপনি আমাদের" : "By creating an account you agree to our",
    inquiry: bn ? "তথ্য জমা দেওয়ার মাধ্যমে আপনি আমাদের" : "By submitting this form you agree to our",
  }[purpose];
  const tail = {
    order: bn ? "সম্মতি দিচ্ছেন এবং অর্ডার সংক্রান্ত যোগাযোগের জন্য আপনার তথ্য ব্যবহারে অনুমতি দিচ্ছেন।" : "and allow us to use your details to process and deliver it.",
    booking: bn ? "সম্মতি দিচ্ছেন এবং এই বুকিং সংক্রান্ত যোগাযোগের জন্য আপনার তথ্য ব্যবহারে অনুমতি দিচ্ছেন।" : "and allow us to use your details to handle and contact you about it.",
    register: bn ? "সম্মতি দিচ্ছেন এবং অ্যাকাউন্ট পরিচালনার জন্য আপনার তথ্য ব্যবহারে অনুমতি দিচ্ছেন।" : "and allow us to use your details to run your account.",
    inquiry: bn ? "সম্মতি দিচ্ছেন এবং আপনার অনুরোধের জবাব দিতে আপনার সাথে যোগাযোগে অনুমতি দিচ্ছেন।" : "and allow us to contact you about your request.",
  }[purpose];
  const link = "font-medium text-brand-700 dark:text-brand-300 underline underline-offset-2 hover:no-underline";
  return (
    <p className={cn("text-xs leading-relaxed text-muted", className)}>
      {lead}{" "}
      <Link href="/legal/terms" className={link}>{bn ? "শর্তাবলী" : "Terms & Conditions"}</Link>
      {purpose === "order" && (
        <>
          {", "}
          <Link href="/legal/refund" className={link}>{bn ? "রিফান্ড নীতি" : "Refund Policy"}</Link>
        </>
      )}
      {bn ? " ও " : " and "}
      <Link href="/legal/privacy" className={link}>{bn ? "গোপনীয়তা নীতি" : "Privacy Policy"}</Link>
      {bn ? "তে " : " "}
      {tail}
    </p>
  );
}

export interface CookieRow {
  name: string;
  category: { en: string; bn: string };
  purpose: { en: string; bn: string };
  duration: { en: string; bn: string };
  provider: string;
  optional: boolean;
}

/** Cookie/storage inventory as stacked cards — the legal text column is narrow on every screen, so a multi-column table never fits well. */
export function CookieTable({ rows }: { rows: CookieRow[] }) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const pick = (v: { en: string; bn: string }) => (bn ? v.bn : v.en);
  const head = bn
    ? ["নাম", "ধরন", "উদ্দেশ্য", "মেয়াদ", "প্রদানকারী"]
    : ["Name", "Category", "Purpose", "Duration", "Provider"];
  const badge = (optional: boolean) => (
    <span className={cn("inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", optional ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300")}>
      {optional ? (bn ? "ঐচ্ছিক — সম্মতি লাগে" : "Optional — needs consent") : (bn ? "অপরিহার্য" : "Essential")}
    </span>
  );
  return (
    <div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.name} className="rounded-xl border border-[var(--line)] p-3 text-sm space-y-1.5">
            <p className="font-mono text-xs break-all font-semibold text-heading">{r.name}</p>
            <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{pick(r.category)}</span>{badge(r.optional)}</div>
            <p>{pick(r.purpose)}</p>
            <p className="text-xs text-muted">{head[3]}: {pick(r.duration)} · {head[4]}: {r.provider}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lets a visitor change or withdraw cookie consent as easily as they gave it. */
export function CookiePreferencesButton() {
  const { lang } = useLanguageStore();
  return (
    <button type="button" onClick={reopenConsent} className="btn btn-brand btn-sm">
      {lang === "bn" ? "কুকি পছন্দ পরিবর্তন করুন" : "Change cookie preferences"}
    </button>
  );
}

/** Plain bullet list used by the legal copy. */
export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1.5">
      {items.map((t) => <li key={t}>{t}</li>)}
    </ul>
  );
}
