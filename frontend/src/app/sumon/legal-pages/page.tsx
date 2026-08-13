"use client";

import { useEffect, useState } from "react";
import AdminTitle from "@/components/admin/AdminTitle";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { Loader2, ScrollText, ExternalLink, RotateCcw, Save } from "lucide-react";
import { useToastStore } from "@/store/toast";

const PAGES = [
  { key: "privacy", label: "Privacy Policy", labelBn: "গোপনীয়তা নীতি", href: "/legal/privacy" },
  { key: "terms", label: "Terms of Service", labelBn: "সেবার শর্তাবলী", href: "/legal/terms" },
  { key: "refund", label: "Refund Policy", labelBn: "রিফান্ড নীতি", href: "/legal/refund" },
  { key: "cookies", label: "Cookies Policy", labelBn: "কুকি নীতি", href: "/legal/cookies" },
] as const;

export default function LegalPagesAdmin() {
  const toast = useToastStore((s) => s.push);
  const [active, setActive] = useState<(typeof PAGES)[number]["key"]>("privacy");
  const [allSettings, setAllSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [en, setEn] = useState("");
  const [bn, setBn] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await adminApi.getSettings();
        setAllSettings(r.data.data ?? {});
      } catch (e) {
        toast("error", apiErrorMessage(e, "Failed to load legal page content"));
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  useEffect(() => {
    setEn(allSettings[`legal_${active}_content_en`] ?? "");
    setBn(allSettings[`legal_${active}_content_bn`] ?? "");
  }, [active, allSettings]);

  const isCustomized = !!(allSettings[`legal_${active}_content_en`] || allSettings[`legal_${active}_content_bn`]);
  const page = PAGES.find((p) => p.key === active)!;

  const save = async (nextEn: string, nextBn: string) => {
    setSaving(true);
    try {
      await adminApi.upsertSettings([
        { key: `legal_${active}_content_en`, value: nextEn },
        { key: `legal_${active}_content_bn`, value: nextBn },
      ]);
      setAllSettings((prev) => ({
        ...prev,
        [`legal_${active}_content_en`]: nextEn,
        [`legal_${active}_content_bn`]: nextBn,
      }));
      toast("success", nextEn || nextBn ? "সংরক্ষণ করা হয়েছে — ওয়েবসাইটে নতুন লেখা দেখাবে" : "ডিফল্ট লেখায় ফিরে যাওয়া হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <ScrollText className="w-6 h-6 text-brand-600" />
        <AdminTitle en="Legal Pages" bn="আইনি পেজসমূহ" />
      </div>
      <p className="text-sm text-muted mb-6">
        Privacy, Terms, Refund ও Cookies পেজের লেখা এখান থেকে পরিবর্তন করুন — কোডিং জানার দরকার নেই।
        কোনো পেজ খালি রাখলে (কখনো সম্পাদনা না করলে) ওয়েবসাইটের বর্তমান ডিফল্ট লেখাই দেখানো হবে, কিছুই পরিবর্তন হবে না।
      </p>

      <div className="flex gap-1 border-b border-app mb-5 overflow-x-auto">
        {PAGES.map((p) => (
          <button
            key={p.key}
            onClick={() => setActive(p.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              active === p.key ? "border-brand-500 text-brand-600" : "border-transparent text-muted hover:text-heading"
            }`}
          >
            {p.labelBn}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                isCustomized ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-surface-2 text-muted border border-app"
              }`}
            >
              {isCustomized ? "✎ কাস্টম লেখা সক্রিয়" : "ওয়েবসাইটের ডিফল্ট লেখা দেখাচ্ছে"}
            </span>
            <a
              href={page.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
            >
              ওয়েবসাইটে দেখুন <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted mb-1 block">English</label>
            <textarea
              value={en}
              onChange={(e) => setEn(e.target.value)}
              rows={10}
              placeholder="(খালি = ওয়েবসাইটের ডিফল্ট ইংরেজি লেখা ব্যবহৃত হবে)"
              className="admin-input w-full text-sm font-normal leading-relaxed"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted mb-1 block">বাংলা</label>
            <textarea
              value={bn}
              onChange={(e) => setBn(e.target.value)}
              rows={10}
              placeholder="(খালি = ওয়েবসাইটের ডিফল্ট বাংলা লেখা ব্যবহৃত হবে)"
              className="admin-input w-full text-sm font-normal leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => save(en, bn)}
              disabled={saving}
              className="btn btn-primary btn-sm gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              সংরক্ষণ করুন
            </button>
            {isCustomized && (
              <button
                onClick={() => setConfirmReset(true)}
                disabled={saving}
                className="btn btn-outline btn-sm gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                ডিফল্টে ফিরে যান
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="ডিফল্ট লেখায় ফিরে যাবেন?"
        message="আপনার লেখা মুছে যাবে এবং ওয়েবসাইটের ডিফল্ট লেখা দেখানো হবে। এটি ফিরিয়ে নেওয়া যাবে না।"
        confirmLabel="ডিফল্টে ফিরে যান"
        variant="warning"
        onConfirm={() => { setEn(""); setBn(""); save("", ""); setConfirmReset(false); }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
