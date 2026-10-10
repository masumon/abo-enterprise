"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, Check, ExternalLink, Handshake, Image as ImageIcon, Loader2, RefreshCw, Save, ShieldCheck, Star, Users } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import JsonListEditor from "@/components/admin/JsonListEditor";
import { ABOUT_TRUST_EDITORS } from "@/components/admin/aboutTrustEditors";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

type Values = Record<string, string>;

interface Block {
  id: string;
  icon: ReactNode;
  title: string;
  /** Where visitors see it. */
  where: string;
  help: string;
  view: string;
  /** JSON list settings edited with the friendly list editor. */
  jsonKeys: string[];
  /** Plain text settings (kept for older data). */
  textKeys?: { key: string; label: string; hint: string; placeholder?: string }[];
}

const BLOCKS: Block[] = [
  {
    id: "team",
    icon: <Users className="w-4 h-4" aria-hidden />,
    title: "টিম সদস্য",
    where: "‘আমাদের সম্পর্কে’ পাতা ও ফুটারের ডেভেলপার ক্রেডিট",
    help: "প্রতিজন সদস্যের নাম, পদ, ছবি ও ছোট পরিচিতি। বাংলা লিখে “→ English” চাপলে ইংরেজি নিজে থেকে হবে।",
    view: "/about",
    jsonKeys: ["about_team_json"],
  },
  {
    id: "clients",
    icon: <Handshake className="w-4 h-4" aria-hidden />,
    title: "ক্লায়েন্ট/পার্টনার লোগো",
    where: "হোমপেজের “আমাদের ব্র্যান্ড পার্টনার” অংশ",
    help: "যেসব প্রতিষ্ঠানের সাথে কাজ করেছেন তাদের লোগো। এটি পণ্যের ব্র্যান্ড নয় — পণ্যের ব্র্যান্ড (যেমন Samsung) ঠিক করুন ‘স্টক ও পণ্যের ব্র্যান্ড’ পাতায়।",
    view: "/",
    jsonKeys: ["client_logos_json"],
  },
  {
    id: "registrations",
    icon: <BadgeCheck className="w-4 h-4" aria-hidden />,
    title: "ব্যবসায়িক নিবন্ধন (ট্রেড লাইসেন্স, TIN, BIN…)",
    where: "সব পাতার ফুটারে “ব্যবসায়িক তথ্য”",
    help: "প্রতিটি নিবন্ধন একটি কার্ড হয়ে ফুটারে দেখায়। তালিকা খালি থাকলে নিচের পুরনো ট্রেড লাইসেন্স নম্বরটি দেখায়।",
    view: "/",
    jsonKeys: ["site_registrations_json"],
    textKeys: [{ key: "trade_license", label: "পুরনো ট্রেড লাইসেন্স নম্বর", hint: "শুধু উপরের তালিকা খালি থাকলে ফুটারে দেখায়", placeholder: "TL-XXXXX" }],
  },
];

const LINKS = [
  { href: "/sumon/homepage", icon: ShieldCheck, title: "বিশ্বাসের ব্যাজ ও “কেন আমরা”", desc: "হোমপেজের ব্যাজগুলো ‘হোমপেজ সাজান’ পাতায় বদলান" },
  { href: "/sumon/media", icon: ImageIcon, title: "‘আমাদের গল্প’ ও অফিসের ছবি", desc: "‘ছবি ও ভিডিও ভাণ্ডার’ → ব্র্যান্ড ট্যাবে" },
  { href: "/sumon/reviews", icon: Star, title: "রিভিউ ও গ্রাহকের মতামত", desc: "দেখান, লুকান বা টেস্ট রিভিউ মুছুন" },
];

export default function AboutTrustPage() {
  const toast = useToastStore((s) => s.push);
  const [values, setValues] = useState<Values>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      const raw = (res.data.data ?? {}) as Record<string, unknown>;
      const flat: Values = {};
      for (const [k, v] of Object.entries(raw)) if (typeof v === "string") flat[k] = v;
      setValues(flat);
    } catch (e) {
      toast("error", apiErrorMessage(e, "তথ্য আনা যায়নি — আবার চেষ্টা করুন"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const save = async (block: Block) => {
    for (const key of block.jsonKeys) {
      const v = (values[key] ?? "").trim();
      if (!v) continue;
      try { JSON.parse(v); } catch { toast("error", `${block.title}: তথ্য ঠিক নেই — আবার চেষ্টা করুন`); return; }
    }
    setSaving(block.id);
    try {
      await adminApi.upsertSettings([
        ...block.jsonKeys.map((key) => ({ key, value: values[key] ?? "", data_type: "json" })),
        ...(block.textKeys ?? []).map((f) => ({ key: f.key, value: values[f.key] ?? "", data_type: "string" })),
      ]);
      setSaved(block.id);
      setTimeout(() => setSaved(null), 2500);
      toast("success", `${block.title} সংরক্ষিত হয়েছে`);
    } catch (e) {
      toast("error", apiErrorMessage(e, "সংরক্ষণ হয়নি — ইন্টারনেট দেখে আবার চেষ্টা করুন"));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="About & trust"
        titleBn="আমাদের সম্পর্কে ও বিশ্বাস"
        description="Team, client/partner logos and business registrations — one place."
        descriptionBn="টিম, ক্লায়েন্ট/পার্টনার লোগো ও ব্যবসায়িক নিবন্ধন — সব এক জায়গায়। প্রতিটি অংশ আলাদা করে সংরক্ষণ করুন।"
        actions={
          <button type="button" onClick={() => void load()} disabled={loading} className="admin-btn-secondary !py-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden /> রিফ্রেশ
          </button>
        }
      />

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6 admin-page-narrow">
          {BLOCKS.map((block) => (
            <section key={block.id} id={block.id} className="admin-card overflow-hidden scroll-mt-24" aria-labelledby={`${block.id}-title`}>
              <div className="flex items-start justify-between gap-3 flex-wrap px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-brand-50 to-transparent dark:from-brand-900/20">
                <div className="min-w-0">
                  <h2 id={`${block.id}-title`} className="flex items-center gap-2 font-semibold text-heading">
                    <span className="text-brand-600 dark:text-brand-300">{block.icon}</span>{block.title}
                  </h2>
                  <p className="text-xs text-muted mt-1">দেখা যায়: {block.where}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={block.view} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm gap-1.5">
                    <ExternalLink className="w-4 h-4" aria-hidden /> সাইটে দেখুন
                  </a>
                  <button
                    type="button"
                    onClick={() => void save(block)}
                    disabled={saving !== null}
                    className={`btn btn-sm gap-1.5 ${saved === block.id ? "bg-green-600 text-white" : "btn-brand"}`}
                  >
                    {saving === block.id ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : saved === block.id ? <Check className="w-4 h-4" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />}
                    {saving === block.id ? "সংরক্ষণ হচ্ছে…" : saved === block.id ? "সংরক্ষিত!" : "সংরক্ষণ করুন"}
                  </button>
                </div>
              </div>
              <p className="px-4 sm:px-6 py-2.5 text-xs text-brand-800 dark:text-brand-200 bg-brand-50/50 dark:bg-white/[0.03] border-b border-brand-100/60 dark:border-white/10">{block.help}</p>
              <div className="px-4 sm:px-6 py-4 space-y-4">
                {block.jsonKeys.map((key) => {
                  const ed = ABOUT_TRUST_EDITORS[key];
                  return (
                    <JsonListEditor
                      key={key}
                      value={values[key] ?? ""}
                      onChange={(json) => setValues((p) => ({ ...p, [key]: json }))}
                      fields={ed.fields}
                      newItem={ed.newItem}
                      mapKey={ed.mapKey}
                      previewRow={ed.previewRow}
                    />
                  );
                })}
                {(block.textKeys ?? []).map((f) => (
                  <label key={f.key} className="block">
                    <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{f.label}</span>
                    <input
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="input w-full text-sm"
                    />
                    <span className="block text-xs text-muted mt-1">{f.hint}</span>
                  </label>
                ))}
              </div>
            </section>
          ))}

          <section className="admin-card p-4 sm:p-5" aria-labelledby="related-title">
            <h2 id="related-title" className="font-semibold text-heading">সম্পর্কিত অন্য জিনিস (অন্য পাতায়)</h2>
            <div className="mt-3 grid sm:grid-cols-3 gap-3">
              {LINKS.map((l) => {
                const Icon = l.icon;
                return (
                  <Link key={l.href} href={l.href} className="rounded-xl border border-gray-100 dark:border-white/10 p-3 hover:border-brand-300 dark:hover:border-brand-500/50 transition-colors flex gap-3">
                    <Icon className="w-5 h-5 text-brand-600 dark:text-brand-300 flex-none mt-0.5" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-heading">{l.title}</span>
                      <span className="block text-xs text-muted mt-0.5">{l.desc}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
