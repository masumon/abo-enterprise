/** What the System Health module knows about each service: Bangla name, group, where to
 * fix it in the admin, how to set it up, and a one-line "what is happening" summary built
 * from the live check. Nothing here is a value or an ID — those come from the server's
 * environment. */
export interface HealthCheck { ok: boolean; skipped?: boolean; error?: string; note?: string; [k: string]: unknown }
export interface HealthData { checks: Record<string, HealthCheck>; healthy: number; total: number; skipped?: number }

export interface ServiceMeta {
  key: string;
  name: string;
  what: string;
  /** Admin page that handles this service (omit when it is fixed outside the admin). */
  link?: { href: string; label: string };
  /** Outside dashboard to open when something must be changed there. */
  external?: { href: string; label: string };
  /** Environment variables (Render → Environment) the check reads. */
  env?: string[];
  steps: string[];
}

export const HEALTH_GROUPS: { id: string; title: string; keys: string[] }[] = [
  { id: "core", title: "মূল সার্ভার ও ডাটাবেজ", keys: ["api", "render", "database", "supabase"] },
  { id: "web", title: "ওয়েবসাইট ও নেটওয়ার্ক", keys: ["website", "cloudflare", "cron"] },
  { id: "mail", title: "ইমেইল", keys: ["smtp", "resend"] },
  { id: "media", title: "ছবি, স্টোরেজ ও ব্যাকআপ", keys: ["cloudinary", "storage", "backup_cron"] },
  { id: "watch", title: "পরিসংখ্যান, নজরদারি ও AI", keys: ["ga4", "sentry", "ai", "cache"] },
];

export const SERVICE_META: Record<string, ServiceMeta> = {
  api: { key: "api", name: "API সার্ভার", what: "ব্যাকএন্ড (FastAPI) চলছে কি না",
    external: { href: "https://dashboard.render.com", label: "Render ড্যাশবোর্ড" },
    steps: ["এটি লাল হলে সার্ভার বন্ধ বা ডিপ্লয় ব্যর্থ — Render ড্যাশবোর্ডে Logs দেখুন।", "বিনামূল্যের প্ল্যানে ১৫ মিনিট কেউ না এলে সার্ভার ঘুমায়; প্রথম রিকোয়েস্টে ৩০–৫০ সেকেন্ড লাগে।"] },
  render: { key: "render", name: "Render (হোস্টিং)", what: "কোন সংস্করণ চলছে",
    external: { href: "https://dashboard.render.com", label: "Render ড্যাশবোর্ড" },
    steps: ["মেইনে মার্জ করলে Render নিজে ডিপ্লয় করে (১০–১৫ মিনিট)।", "ডিপ্লয় আটকে গেলে Render → Events দেখুন।", "এখানকার তথ্য Render নিজেই দেয় (RENDER_* ভ্যারিয়েবল) — আলাদা কিছু বসাতে হয় না।"] },
  database: { key: "database", name: "ডাটাবেজ (Supabase Postgres)", what: "কানেকশন ও সাড়া দেওয়ার সময়",
    env: ["DATABASE_URL"], external: { href: "https://supabase.com/dashboard", label: "Supabase ড্যাশবোর্ড" },
    steps: ["লাল হলে Supabase প্রজেক্ট Paused কি না দেখুন (বিনামূল্যে ৭ দিন নিষ্ক্রিয় থাকলে থামে) — Restore চাপুন।", "পাসওয়ার্ড বদলালে Render → Environment-এ DATABASE_URL নতুন করে দিন।"] },
  supabase: { key: "supabase", name: "Supabase API", what: "Supabase প্রজেক্ট সচল কি না",
    env: ["SUPABASE_URL", "SUPABASE_ANON_KEY"], external: { href: "https://supabase.com/dashboard", label: "Supabase ড্যাশবোর্ড" },
    steps: ["Supabase → Project Settings → API থেকে Project URL ও anon key নিন।", "Render → Environment-এ SUPABASE_URL ও SUPABASE_ANON_KEY বসান, তারপর Save।", "না দিলেও চলে — শুধু ডাটাবেজ কানেকশনই মূল।"] },
  website: { key: "website", name: "ওয়েবসাইট (Vercel)", what: "সাইট খোলা যাচ্ছে ও কত দ্রুত",
    env: ["FRONTEND_URL"], external: { href: "https://vercel.com/dashboard", label: "Vercel ড্যাশবোর্ড" },
    steps: ["লাল হলে Vercel → Deployments-এ শেষ ডিপ্লয় ব্যর্থ কি না দেখুন।", "ডোমেইন ঠিকানা Render-এর FRONTEND_URL ভ্যারিয়েবলে থাকে।"] },
  cloudflare: { key: "cloudflare", name: "Cloudflare (ডোমেইন/সুরক্ষা)", what: "সাইট Cloudflare দিয়ে যাচ্ছে কি না",
    env: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"], external: { href: "https://dash.cloudflare.com", label: "Cloudflare ড্যাশবোর্ড" },
    steps: ["সাইট Cloudflare দিয়ে চললে এমনিতেই সবুজ দেখাবে।", "আরও গভীর পরীক্ষা চাইলে: Cloudflare → My Profile → API Tokens → “Read” অনুমতির টোকেন বানান।", "Render → Environment-এ CLOUDFLARE_API_TOKEN (আর চাইলে CLOUDFLARE_ZONE_ID — জোনের Overview পাতার ডানে) বসান।"] },
  cron: { key: "cron", name: "cron-job.org (স্বয়ংক্রিয় কাজ)", what: "নির্ধারিত সময়ে কল আসছে কি না",
    link: { href: "/sumon/backup", label: "Backup পেজ (cron URL)" }, env: ["CRONJOB_API_KEY (ঐচ্ছিক)"],
    external: { href: "https://console.cron-job.org", label: "cron-job.org" },
    steps: ["Backup পেজে দেওয়া cron URL প্রতি ঘণ্টায় কল হওয়ার জব বানান; AI পেজের URL প্রতিদিন।", "৩ ঘণ্টার বেশি কল না এলে এখানে লাল হবে।", "জবের তালিকাও দেখতে চাইলে: cron-job.org → Settings → API → কী বানিয়ে Render-এ CRONJOB_API_KEY দিন।"] },
  smtp: { key: "smtp", name: "ইমেইল পাঠানো", what: "কোন ঠিকানা থেকে মেইল যাচ্ছে",
    link: { href: "/sumon/settings", label: "সেটিংস → ইমেইল" }, env: ["EMAIL_PROVIDER", "SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"],
    steps: ["Render ফ্রি প্ল্যানে SMTP পোর্ট বন্ধ — তাই Resend (HTTPS) ব্যবহার করুন: EMAIL_PROVIDER=resend।", "সেটিংসের ইমেইল অংশ থেকেও ঠিকানা/পাসওয়ার্ড বদলানো যায়।"] },
  resend: { key: "resend", name: "Resend (ইমেইল সার্ভিস)", what: "API কী ও ডোমেইন যাচাই",
    env: ["RESEND_API_KEY", "EMAIL_PROVIDER"], external: { href: "https://resend.com/domains", label: "Resend → Domains" },
    steps: ["Resend → API Keys-এ কী বানিয়ে Render-এ RESEND_API_KEY দিন।", "Domains-এ আপনার ডোমেইনের DNS রেকর্ড (SPF/DKIM) বসিয়ে Verified করুন।", "শুধু-পাঠানোর কী হলেও চলবে; তখন ডোমেইন সংখ্যা দেখাবে না।"] },
  cloudinary: { key: "cloudinary", name: "Cloudinary (ছবি/ভিডিও)", what: "মিডিয়া আপলোড সংযোগ",
    env: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"], link: { href: "/sumon/media", label: "মিডিয়া লাইব্রেরি" },
    external: { href: "https://console.cloudinary.com", label: "Cloudinary" },
    steps: ["Cloudinary → Dashboard-এ Cloud name, API Key, API Secret পাবেন।", "তিনটিই Render → Environment-এ বসিয়ে Save করুন।", "ফ্রি সীমা শেষ হলেও এখানে লাল হতে পারে — Cloudinary → Usage দেখুন।"] },
  storage: { key: "storage", name: "স্টোরেজ ব্যবহার", what: "ডাটাবেজ ও মিডিয়ার আকার",
    link: { href: "/sumon/media", label: "মিডিয়া লাইব্রেরি" },
    steps: ["Supabase ফ্রি ডাটাবেজ ৫০০ MB — ভরে এলে পুরোনো লগ/ছবি পরিষ্কার করুন।"] },
  backup_cron: { key: "backup_cron", name: "স্বয়ংক্রিয় ব্যাকআপ", what: "শেষ যাচাই-করা ক্লাউড ব্যাকআপ",
    link: { href: "/sumon/backup", label: "ডাটাবেস Backup" }, steps: ["লাল হলে Backup পেজ খুলে ড্রাইভ সংযোগ ও শেষ চালানোর ত্রুটি দেখুন।"] },
  ga4: { key: "ga4", name: "Google Analytics (ডেটা সংযোগ)", what: "অ্যাডমিনে ভিজিটর পরিসংখ্যান আনার সংযোগ",
    link: { href: "/sumon/settings", label: "সেটিংস → মার্কেটিং" }, env: ["GA4_PROPERTY_ID", "GA4_CLIENT_EMAIL", "GA4_PRIVATE_KEY"],
    steps: ["সেটিংস → মার্কেটিং-এ Measurement ID দিয়ে “সংরক্ষণ ও পরীক্ষা” চাপুন।", "পরিসংখ্যান আনতে Google সার্ভিস অ্যাকাউন্ট ও Property ID লাগে (Render ভ্যারিয়েবল)।"] },
  sentry: { key: "sentry", name: "Sentry (ত্রুটি নজরদারি)", what: "ত্রুটির খবর আপনার কাছে আসছে কি না",
    env: ["SENTRY_DSN"], external: { href: "https://sentry.io", label: "Sentry" },
    steps: ["Sentry → Project → Settings → Client Keys (DSN) থেকে DSN কপি করুন।", "Render → Environment-এ SENTRY_DSN বসান।", "না দিলে ত্রুটি শুধু সার্ভারের মেমরিতে থাকে, রিস্টার্টে হারায়।"] },
  ai: { key: "ai", name: "AI সংযোগ", what: "চালু AI কী ও আজকের ব্যবহার",
    link: { href: "/sumon/ai", label: "AI সংযোগ (কী ও মডেল)" }, steps: ["AI পেজে কী যোগ করে “পরীক্ষা” চাপুন; ফ্রি কী শেষ হলে অন্যটি নিজে চালু হয়।"] },
  cache: { key: "cache", name: "ক্যাশ", what: "অস্থায়ী সংরক্ষিত রিপোর্ট", steps: ["সাধারণত কিছু করতে হয় না।"] },
};

/** One plain-Bangla line describing the live result (never contains secrets). */
export function healthDetail(key: string, c: HealthCheck): string {
  const n = (k: string) => String(c[k] ?? "");
  switch (key) {
    case "api": return `চালু আছে — ${Math.round(Number(c.uptime_seconds) / 360) / 10} ঘণ্টা ধরে`;
    case "render": return c.skipped ? n("note") : `${n("service") || "সার্ভিস"} · সংস্করণ ${n("commit") || "—"}${c.branch ? ` (${n("branch")})` : ""}`;
    case "database": return `সংযুক্ত — সাড়া ${n("latency_ms")}ms`;
    case "supabase": return c.skipped ? n("note") : `${n("host")} সচল`;
    case "website": return `${n("host")} খোলা যাচ্ছে · ${n("latency_ms")}ms${c.host_server ? ` · ${n("host_server")}` : ""}`;
    case "cloudflare": return c.skipped ? n("note") : `${c.active ? "Cloudflare সক্রিয়" : "Cloudflare দিয়ে যাচ্ছে না"}${c.token ? " · API টোকেন বৈধ" : ""}${c.zone_status ? ` · জোন ${n("zone_status")}` : ""}`;
    case "cron": return c.hours_ago !== undefined ? `শেষ কল ${n("hours_ago")} ঘণ্টা আগে${c.jobs !== undefined ? ` · ${n("enabled")}/${n("jobs")} জব চালু` : ""}` : "";
    case "smtp": return n("provider") ? `${n("provider")} · ${n("email")}` : `${n("email") || n("host") || "সংযুক্ত"}`;
    case "resend": return c.skipped ? n("note") : c.domains !== undefined ? `${n("verified")}/${n("domains")} ডোমেইন verified` : n("note");
    case "cloudinary": return "সংযুক্ত — আপলোড চালু";
    case "storage": return `ডাটাবেজ ${n("database_mb")}MB · মিডিয়া ${n("media_files")}টি (${n("media_mb")}MB)`;
    case "backup_cron": return n("note") || "অ্যাডমিন → Backup";
    case "ga4": return "ডেটা সংযোগ চালু";
    case "sentry": return "ত্রুটির খবর পাঠানো চালু";
    case "ai": return `${n("working")}/${n("total")}টি কী কাজ করছে · আজ ${n("used_today")}বার ব্যবহার`;
    case "cache": return `${n("ga4_cached_reports")}টি রিপোর্ট জমা`;
    default: return c.ok ? "ঠিক আছে" : "";
  }
}

export const errorOf = (c: HealthCheck): string => String(c.error ?? c.note ?? "অজানা সমস্যা");

/** Checks that are failing right now (skipped ones are not failures). */
export function failingChecks(h: HealthData | null): { key: string; name: string; reason: string }[] {
  if (!h) return [];
  return Object.entries(h.checks)
    .filter(([, c]) => c && typeof c === "object" && !c.ok && !c.skipped)
    .map(([key, c]) => ({ key, name: SERVICE_META[key]?.name ?? key, reason: errorOf(c) }));
}
