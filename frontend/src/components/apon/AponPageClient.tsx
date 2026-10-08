"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  BatteryCharging, Bell, BookOpen, Bot, Calendar, Camera, Check, Copy, Fingerprint, Globe, Heart, ImageIcon,
  type LucideIcon, MapPin, Mic, Shield, ShieldCheck, Smartphone, Users, Wallet,
} from "lucide-react";
import Accordion from "@/components/ui/Accordion";
import ContactActions from "@/components/common/ContactActions";
import CaptchaDownload from "@/components/apon/CaptchaDownload";
import { useAponInfo } from "@/hooks/useAponInfo";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useLanguageStore } from "@/store/language";
import { getSettingValue } from "@/lib/settingValue";
import { SITE_URL } from "@/lib/tokens";
import {
  aponText, DEFAULT_BUTTON, DEFAULT_DESCRIPTION, DEFAULT_FAQ, DEFAULT_FEATURES, DEFAULT_NAME, DEFAULT_PERMISSIONS,
  DEFAULT_SHOTS, DEFAULT_TAGLINE, formatDate, formatMB, INSTALL_STEPS, readList, toBnDigits,
  type AponFaq, type AponFeature, type AponPermission, type AponShot,
} from "@/lib/apon";
import { cn } from "@/lib/utils";
import { AdminIcon } from "@/lib/adminIcons";

const ICONS: Record<string, LucideIcon> = {
  mic: Mic, calendar: Calendar, book: BookOpen, wallet: Wallet, heart: Heart, bot: Bot, bell: Bell, shield: Shield,
  camera: Camera, contacts: Users, photos: ImageIcon, location: MapPin, battery: BatteryCharging, fingerprint: Fingerprint, globe: Globe,
};
/** Built-in icon keys first; otherwise whatever the admin's icon picker produced (icon name or emoji). */
function IconByKey({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name];
  return Icon ? <Icon className={className} aria-hidden /> : <AdminIcon name={name || "smartphone"} className={className} />;
}

/** Signing-certificate fingerprint of the published build (admin can override). */
const DEFAULT_CERT = "AE:3D:E5:A1:F8:48:44:BB:55:68:47:F0:D9:24:B8:CA:88:B2:F9:9E:EA:39:E3:7C:DC:38:C6:BB:72:81:41:FC";
const DEFAULT_PACKAGE = "com.masumon.apon";

function CopyField({ label, value, bn }: { label: string; value: string; bn: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      /* clipboard blocked: the value is still selectable */
    }
  };
  return (
    <div className="rounded-xl border border-[var(--line)] p-3">
      <p className="text-xs font-semibold text-muted mb-1">{label}</p>
      <div className="flex items-start gap-2">
        <code className="flex-1 min-w-0 text-[11px] sm:text-xs leading-relaxed break-all select-all text-heading">{value}</code>
        <button type="button" onClick={copy} className="flex-none p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10" aria-label={bn ? "কপি করুন" : "Copy"}>
          {done ? <Check className="w-4 h-4 text-green-600" aria-hidden /> : <Copy className="w-4 h-4 text-muted" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

export default function AponPageClient() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const { settings, info, loading } = useAponInfo();
  const contact = useContactInfo();

  const name = aponText(settings, "apon_name", DEFAULT_NAME, bn);
  const tagline = aponText(settings, "apon_tagline", DEFAULT_TAGLINE, bn);
  const description = aponText(settings, "apon_description", DEFAULT_DESCRIPTION, bn);
  const buttonLabel = aponText(settings, "apon_button_label", DEFAULT_BUTTON, bn);
  const icon = getSettingValue(settings, "apon_icon_url").trim() || "/apon/icon-512.png";
  const shots = readList<AponShot>(settings, "apon_screenshots_json", DEFAULT_SHOTS);
  const features = readList<AponFeature>(settings, "apon_features_json", DEFAULT_FEATURES);
  const permissions = readList<AponPermission>(settings, "apon_permissions_json", DEFAULT_PERMISSIONS);
  const faqs = readList<AponFaq>(settings, "apon_faq_json", DEFAULT_FAQ);
  const cert = getSettingValue(settings, "apon_cert_sha256").trim() || DEFAULT_CERT;
  const pkg = getSettingValue(settings, "apon_package_name").trim() || DEFAULT_PACKAGE;
  const playUrl = getSettingValue(settings, "play_store_url").trim();

  const release = info?.release ?? null;
  const enabled = !!info?.enabled;
  const num = (v: string | number) => (bn ? toBnDigits(v) : String(v));
  const size = formatMB(release?.size_bytes, bn);
  const minAndroid = release?.min_android ? `Android ${release.min_android}+` : "Android 7.0+";
  const changelog = release ? ((bn ? release.changelog_bn : release.changelog_en) || release.changelog_en || release.changelog_bn || "") : "";

  const badge = "inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur";
  const section = "container mx-auto px-4 max-w-6xl";
  const h2 = "text-2xl sm:text-3xl font-extrabold text-heading text-center";

  return (
    <main>
      {/* ───────────── Hero ───────────── */}
      <section
        className="relative overflow-hidden -mt-[var(--navbar-offset)] pt-[calc(var(--navbar-offset)+1.5rem)] sm:pt-[calc(var(--navbar-offset)+3rem)] pb-12 sm:pb-20 text-white"
        style={{ background: "linear-gradient(135deg,#0A3C85 0%,#0b3270 55%,#14182b 100%)" }}
      >
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#F2C14E]/15 blur-3xl pointer-events-none" aria-hidden />
        <div className={cn(section, "relative grid lg:grid-cols-2 gap-10 items-center")}>
          <div className="text-center lg:text-left">
            <Image src={icon} alt={`${name} logo`} width={96} height={96} unoptimized priority className="mx-auto lg:mx-0 h-20 w-20 sm:h-24 sm:w-24 rounded-[1.4rem] shadow-2xl ring-1 ring-white/25" />
            <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight">
              {name} <span className="text-[#F2C14E]">{bn ? "অ্যাপ" : "App"}</span>
            </h1>
            <p className="mt-3 text-lg sm:text-xl font-semibold text-white/95 text-balance">{tagline}</p>
            <p className="mt-3 max-w-xl mx-auto lg:mx-0 text-sm sm:text-base leading-relaxed text-white/80">{description}</p>

            <div className="mt-5 flex flex-wrap justify-center lg:justify-start gap-2">
              <span className={badge}>{bn ? "✓ সম্পূর্ণ ফ্রি" : "✓ Completely free"}</span>
              <span className={badge}>{bn ? "অফলাইনে চলে" : "Works offline"}</span>
              <span className={badge}>{bn ? "ডেটা আপনার ফোনে" : "Data stays on your phone"}</span>
            </div>

            <div id="download" className="mt-7 scroll-mt-28">
              {enabled && release ? (
                <div className="flex flex-col items-center lg:items-start gap-3">
                  <CaptchaDownload
                    label={`${buttonLabel} · ${bn ? "ফ্রি" : "Free"}`}
                    captchaRequired={info?.captcha ?? true}
                    fileName={release.file_name}
                    className="w-full sm:w-auto min-w-[16rem] text-base"
                  />
                  <p className="text-xs sm:text-sm text-white/80">
                    {bn ? "সংস্করণ" : "Version"} {num(release.version_name)}
                    {size && <> · {size}</>} · {minAndroid}
                    {release.updated_at && <> · {formatDate(release.updated_at, bn)}</>}
                  </p>
                  <p className="text-[11px] sm:text-xs text-white/70 max-w-md">
                    {bn ? "ডাউনলোড করলে আপনি " : "By downloading you agree to the "}
                    <Link href="/apon/privacy" className="underline underline-offset-2 hover:text-white">{bn ? "অ্যাপের গোপনীয়তা নীতি ও শর্তাবলী" : "app privacy policy and terms"}</Link>
                    {bn ? "তে সম্মত হচ্ছেন।" : "."}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 max-w-md mx-auto lg:mx-0">
                  <p className="font-bold">{loading ? (bn ? "লোড হচ্ছে…" : "Loading…") : bn ? "ডাউনলোড শীঘ্রই আসছে" : "Download coming soon"}</p>
                  {!loading && (
                    <p className="text-sm text-white/80 mt-1">
                      {bn ? "আপডেট জানতে আমাদের সাথে যোগাযোগ করুন।" : "Contact us to be told as soon as it is ready."}
                    </p>
                  )}
                </div>
              )}
              {playUrl && (
                <a href={playUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#F2C14E] hover:underline">
                  {bn ? "Google Play তেও পাবেন →" : "Also on Google Play →"}
                </a>
              )}
            </div>
          </div>

          <div className="relative mx-auto h-[26rem] sm:h-[32rem] w-full max-w-md" aria-hidden={false}>
            {shots.slice(0, 2).map((s, i) => (
              <div
                key={s.src}
                className={cn(
                  "absolute w-44 sm:w-56 overflow-hidden rounded-[1.9rem] border-[5px] border-[#0b1220] shadow-2xl bg-white",
                  i === 0 ? "left-4 sm:left-8 top-8 -rotate-6" : "right-4 sm:right-8 top-0 rotate-3",
                )}
              >
                <Image src={s.src} alt={bn ? s.alt_bn : s.alt_en} width={540} height={1145} unoptimized priority={i === 0} className="block h-auto w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Features ───────────── */}
      <section className="py-14 sm:py-20" aria-labelledby="apon-features">
        <div className={section}>
          <h2 id="apon-features" className={h2}>{bn ? `${name} যা যা করে` : `What ${name} does`}</h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => {
              return (
                <div key={f.title_en} className="enterprise-card p-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xl"><IconByKey name={f.icon} className="w-6 h-6" /></span>
                  <h3 className="mt-3 font-bold text-heading">{bn ? f.title_bn : f.title_en}</h3>
                  <p className="mt-1.5 text-sm text-muted leading-relaxed">{bn ? f.desc_bn : f.desc_en}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── Screenshots ───────────── */}
      <section className="py-12 sm:py-16 bg-brand-50/60 dark:bg-white/[0.03]" aria-labelledby="apon-shots">
        <div className={section}>
          <h2 id="apon-shots" className={h2}>{bn ? "অ্যাপের ভেতরটা দেখুন" : "A look inside"}</h2>
          <ul className="mt-8 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center" aria-label={bn ? "স্ক্রিনশট" : "Screenshots"}>
            {shots.map((s) => (
              <li key={s.src} className="snap-center shrink-0 w-[11.5rem] sm:w-[13.5rem] overflow-hidden rounded-[1.7rem] border-[5px] border-[#0b1220] shadow-xl bg-white">
                <Image src={s.src} alt={bn ? s.alt_bn : s.alt_en} width={540} height={1145} unoptimized loading="lazy" className="block h-auto w-full" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── Install + verify ───────────── */}
      <section className="py-14 sm:py-20" aria-labelledby="apon-install">
        <div className={cn(section, "grid lg:grid-cols-2 gap-8")}>
          <div>
            <h2 id="apon-install" className="text-2xl sm:text-3xl font-extrabold text-heading">{bn ? "ইনস্টল করবেন যেভাবে" : "How to install"}</h2>
            <ol className="mt-5 space-y-3">
              {INSTALL_STEPS.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-none h-8 w-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center">{num(i + 1)}</span>
                  <p className="text-sm sm:text-base leading-relaxed pt-0.5">{bn ? s.bn : s.en}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
              <ShieldCheck className="w-6 h-6" aria-hidden />
              <h3 className="text-xl font-bold">{bn ? "আসল কি না যাচাই করুন" : "Check it is genuine"}</h3>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              {bn
                ? "ডাউনলোডের পর ফাইলের SHA-256 নিচেরটার সাথে মিললে ফাইলটি অক্ষত আছে। অ্যাপের সাইনিং সার্টিফিকেটের আঙুলের ছাপও নিচে দেওয়া আছে।"
                : "After downloading, a matching SHA-256 means the file is intact. The app's signing-certificate fingerprint is also listed below."}
            </p>
            {release?.sha256 && <CopyField label={bn ? "ফাইলের SHA-256" : "File SHA-256"} value={release.sha256} bn={bn} />}
            <CopyField label={bn ? "সাইনিং সার্টিফিকেট (SHA-256)" : "Signing certificate (SHA-256)"} value={cert} bn={bn} />
            <CopyField label={bn ? "প্যাকেজ নাম" : "Package name"} value={pkg} bn={bn} />
          </div>
        </div>
      </section>

      {/* ───────────── Permissions ───────────── */}
      <section className="py-12 sm:py-16 bg-brand-50/60 dark:bg-white/[0.03]" aria-labelledby="apon-perms">
        <div className={section}>
          <h2 id="apon-perms" className={h2}>{bn ? "কোন অনুমতি কেন লাগে" : "Why the app asks for each permission"}</h2>
          <p className="mt-2 text-center text-sm text-muted max-w-2xl mx-auto">
            {bn ? "বেশিরভাগ অনুমতি ঐচ্ছিক — ওই সুবিধা ব্যবহারের সময় ফোন আপনার কাছে অনুমতি চাইবে। না দিলে বাকি অ্যাপ চলবে।" : "Most permissions are optional — the phone asks only when you use that feature. If you decline, the rest of the app still works."}
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {permissions.map((p) => {
              return (
                <div key={p.name_en} className="enterprise-card p-4 flex gap-3">
                  <span className="flex-none h-10 w-10 rounded-xl bg-white dark:bg-white/10 border border-[var(--line)] flex items-center justify-center text-brand-700 dark:text-brand-300"><IconByKey name={p.icon} className="w-5 h-5" /></span>
                  <div className="min-w-0">
                    <p className="font-semibold text-heading text-sm">
                      {bn ? p.name_bn : p.name_en}{" "}
                      <span className={cn("ml-1 align-middle rounded-full px-2 py-0.5 text-[10px] font-bold", p.optional ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300")}>
                        {p.optional ? (bn ? "ঐচ্ছিক" : "Optional") : bn ? "প্রয়োজনীয়" : "Needed"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">{bn ? p.why_bn : p.why_en}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── What's new + QR ───────────── */}
      <>
        <section className="py-12 sm:py-16" aria-labelledby="apon-new">
          <div className={cn(section, "grid lg:grid-cols-[1fr_auto] gap-8 items-start")}>
            <div>
              <h2 id="apon-new" className="text-2xl font-extrabold text-heading">{bn ? "নতুন কী আছে" : "What's new"}</h2>
              {release ? (
                <div className="mt-4 enterprise-card p-5">
                  <p className="font-bold text-heading">{bn ? "সংস্করণ" : "Version"} {num(release.version_name)} <span className="text-xs font-medium text-muted">({bn ? "কোড" : "build"} {num(release.version_code)})</span></p>
                  <p className="mt-1 text-xs text-muted">{[size, minAndroid, formatDate(release.updated_at, bn)].filter(Boolean).join(" · ")}</p>
                  {changelog && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{changelog}</p>}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">{bn ? "প্রথম সংস্করণ শীঘ্রই আসছে।" : "The first version is coming soon."}</p>
              )}
            </div>
            <div className="hidden lg:block text-center">
              <div className="inline-block rounded-2xl bg-white p-3 shadow-md border border-[var(--line)]">
                <QRCodeSVG value={`${SITE_URL}/apon`} size={132} level="M" aria-label={bn ? "ফোনে পেজটি খুলতে স্ক্যান করুন" : "Scan to open this page on your phone"} />
              </div>
              <p className="mt-2 text-xs text-muted max-w-[10rem] mx-auto">{bn ? "কম্পিউটারে দেখছেন? ফোনে খুলতে স্ক্যান করুন" : "On a computer? Scan to open on your phone"}</p>
            </div>
          </div>
        </section>
      </>

      {/* ───────────── FAQ ───────────── */}
      <section className="py-12 sm:py-16 bg-brand-50/60 dark:bg-white/[0.03]" aria-labelledby="apon-faq">
        <div className={cn(section, "max-w-3xl")}>
          <h2 id="apon-faq" className={h2}>{bn ? "সাধারণ প্রশ্ন" : "Common questions"}</h2>
          <div className="mt-6">
            <Accordion items={faqs.map((f, i) => ({ id: `apon-faq-${i}`, question: bn ? f.q_bn : f.q_en, answer: <p className="text-sm leading-relaxed">{bn ? f.a_bn : f.a_en}</p> }))} />
          </div>
        </div>
      </section>

      {/* ───────────── Support ───────────── */}
      <section className="py-14 sm:py-20" aria-labelledby="apon-support">
        <div className={cn(section, "max-w-3xl text-center")}>
          <h2 id="apon-support" className="text-2xl sm:text-3xl font-extrabold text-heading">{bn ? "সহায়তা লাগলে" : "Need help?"}</h2>
          <p className="mt-2 text-sm sm:text-base text-muted">
            {bn ? `${name} নিয়ে যেকোনো প্রশ্ন বা সমস্যায় আমাদের জানান — ABO Enterprise এর টিম সাহায্য করবে।` : `Questions or trouble with ${name}? The ABO Enterprise team will help.`}
          </p>
          <ContactActions size="md" className="mt-5 justify-center" showNumbers message={bn ? `${name} অ্যাপ নিয়ে সহায়তা চাই` : `I need help with the ${name} app`} />
          {contact.email && (
            <p className="mt-3 text-sm"><a href={`mailto:${contact.email}`} className="font-semibold text-brand-700 dark:text-brand-300 hover:underline">{contact.email}</a></p>
          )}
          <p className="mt-6 text-xs text-muted">
            <Link href="/apon/privacy" className="underline underline-offset-2 hover:text-heading">{bn ? "অ্যাপের গোপনীয়তা নীতি ও শর্তাবলী" : "App privacy policy and terms"}</Link>
            {" · "}
            <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-heading">{bn ? "ওয়েবসাইটের গোপনীয়তা নীতি" : "Website privacy policy"}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
