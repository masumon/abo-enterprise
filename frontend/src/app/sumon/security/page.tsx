"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Copy, Download, KeyRound, Loader2, LogOut, Printer, ShieldCheck, ShieldOff, Users } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import AdminSectionBoundary from "@/components/admin/AdminSectionBoundary";
import { authApi, type SecurityPolicy, type TwoFactorStatus } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { getAdminToken, setAdminToken } from "@/lib/adminAuth";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";
import { asArray, asObject } from "@/lib/safeData";

type Setup = { secret: string; qr_data_uri: string };

const card = "enterprise-card p-5 sm:p-6 space-y-4";
const input =
  "w-full max-w-xs px-4 py-3 rounded-xl border border-[var(--line)] bg-white dark:bg-white/5 text-center text-xl tracking-[0.35em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/40";

function RecoveryCodesPanel({ codes, onDone, doneLabel }: { codes: string[]; onDone: () => void; doneLabel: string }) {
  const toast = useToastStore((s) => s.push);
  const [saved, setSaved] = useState(false);
  const text = `ABO Enterprise — রিকভারি কোড\nপ্রতিটি কোড একবারই কাজ করে। নিরাপদ জায়গায় রাখুন।\n\n${codes.join("\n")}\n`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast("success", "কোডগুলো কপি হয়েছে");
    } catch {
      toast("error", "কপি করা যায়নি — কোডগুলো হাতে লিখে রাখুন");
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "abo-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 dark:bg-amber-500/10 dark:border-amber-500/40 p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <KeyRound className="w-6 h-6 text-amber-600 flex-none mt-0.5" aria-hidden />
        <div>
          <h3 className="font-bold text-heading">আপনার রিকভারি কোড — এখনই সংরক্ষণ করুন</h3>
          <p className="text-sm text-muted leading-relaxed mt-1">
            ফোন হারালে বা অ্যাপ কাজ না করলে এই কোড দিয়ে সাইন-ইন করতে পারবেন। প্রতিটি কোড <b>একবারই</b> কাজ করে। এই পেজ বন্ধ করলে কোডগুলো আর দেখা যাবে না।
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2 font-mono text-base sm:text-lg" aria-label="রিকভারি কোড">
        {codes.map((c) => (
          <li key={c} className="rounded-lg bg-white dark:bg-white/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2 text-center tracking-wider select-all">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn btn-outline btn-sm gap-2"><Copy className="w-4 h-4" /> কপি</button>
        <button type="button" onClick={download} className="btn btn-outline btn-sm gap-2"><Download className="w-4 h-4" /> ফাইল হিসেবে নামান</button>
        <button type="button" onClick={() => window.print()} className="btn btn-outline btn-sm gap-2"><Printer className="w-4 h-4" /> প্রিন্ট</button>
      </div>
      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-1 h-4 w-4" />
        <span>আমি কোডগুলো নিরাপদ জায়গায় সংরক্ষণ করেছি</span>
      </label>
      <button type="button" disabled={!saved} onClick={onDone} className="btn btn-brand btn-md disabled:opacity-50">
        {doneLabel}
      </button>
    </div>
  );
}

function SecurityInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToastStore((s) => s.push);
  const setupMode = params.get("setup") === "1";
  const recoveryUsed = params.get("recovery_used") === "1";

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [mode, setMode] = useState<null | "disable" | "regenerate">(null);
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [policyUnavailable, setPolicyUnavailable] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [me, st] = await Promise.all([authApi.getMe(), authApi.totpStatus()]);
      const meData = asObject<{ role: string }>(me?.data?.data);
      const r = typeof meData.role === "string" ? meData.role : "";
      setRole(r);
      const stData = asObject<TwoFactorStatus>(st?.data?.data);
      setStatus({ ...stData, enabled: !!stData.enabled });
      if (r === "super_admin") {
        try {
          const p = await authApi.securityPolicy();
          const pd = asObject<SecurityPolicy>(p?.data?.data);
          if (Object.keys(pd).length) {
            setPolicy({ require_2fa: !!pd.require_2fa, my_totp_enabled: !!pd.my_totp_enabled, admins: asArray<SecurityPolicy["admins"][number]>(pd.admins).filter((a) => a && typeof a === "object") });
          } else {
            setPolicy(null);
            setPolicyUnavailable(true);
          }
        } catch {
          setPolicyUnavailable(true); // backend not updated yet
        }
      }
    } catch (e) {
      toast("error", apiErrorMessage(e, "নিরাপত্তার তথ্য লোড করা যায়নি"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const afterFullSetup = () => {
    setNewCodes(null);
    if (setupMode) router.replace("/sumon");
    else void load();
  };

  const startSetup = async () => {
    setBusy(true);
    try {
      const r = await authApi.totpSetup();
      const sd = asObject<Setup>(r?.data?.data);
      setSetup(typeof sd.secret === "string" && typeof sd.qr_data_uri === "string" ? (sd as Setup) : null);
      setCode("");
    } catch (e) {
      toast("error", apiErrorMessage(e, "চালু করা যায়নি"));
    } finally {
      setBusy(false);
    }
  };

  const enable = async () => {
    setBusy(true);
    try {
      const r = await authApi.totpEnable(code);
      const d = r.data.data;
      // Keep a legacy (localStorage) session valid: the server issued a fresh full token.
      if (d?.access_token && getAdminToken()) setAdminToken(d.access_token);
      setSetup(null);
      setCode("");
      toast("success", "২-ধাপ যাচাই চালু হয়েছে");
      const codes = asArray<string>(d?.recovery_codes);
      if (codes.length) setNewCodes(codes);
      else afterFullSetup();
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "কোডটি সঠিক নয়"));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await authApi.totpDisable(code);
      toast("success", "২-ধাপ যাচাই বন্ধ করা হয়েছে");
      setMode(null);
      setCode("");
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "বন্ধ করা যায়নি"));
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    setBusy(true);
    try {
      const r = await authApi.totpRecoveryCodes(code);
      const rc = asArray<string>(r?.data?.data?.recovery_codes);
      setNewCodes(rc.length ? rc : null);
      setMode(null);
      setCode("");
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "নতুন কোড তৈরি করা যায়নি (ব্যাকএন্ড আপডেট হয়েছে কি?)"));
    } finally {
      setBusy(false);
    }
  };

  const togglePolicy = async (next: boolean) => {
    setBusy(true);
    try {
      await authApi.setSecurityPolicy(next);
      toast("success", next ? "এখন সব অ্যাডমিনের জন্য ২-ধাপ যাচাই বাধ্যতামূলক" : "২-ধাপ যাচাই এখন ঐচ্ছিক");
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "পরিবর্তন করা যায়নি"));
    } finally {
      setBusy(false);
    }
  };

  const resetAdmin = async () => {
    if (!resetTarget) return;
    try {
      await authApi.resetAdmin2fa(resetTarget.id);
      toast("success", `${resetTarget.name} এর ২-ধাপ যাচাই রিসেট হয়েছে`);
      setResetTarget(null);
      await load();
    } catch (e) {
      toast("error", apiErrorMessage(e, "রিসেট করা যায়নি"));
    }
  };

  const logoutAll = async () => {
    try {
      await authApi.logoutAll();
    } catch {
      /* fall through to the sign-in page either way */
    }
    window.location.href = "/sumon/login";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-brand-600" aria-label="লোড হচ্ছে" />
      </div>
    );
  }

  const enabled = !!status?.enabled;
  const required = !!status?.required || !!policy?.require_2fa;
  const left = status?.recovery_codes_remaining;
  const lowCodes = enabled && typeof left === "number" && left <= 3;

  return (
    <div className="admin-page admin-page-narrow">
      <AdminPageHeader
        title="Account Security"
        titleBn="অ্যাকাউন্ট নিরাপত্তা"
        description="Protect your admin account with two-step verification and manage your sign-in sessions."
        descriptionBn="২-ধাপ যাচাই চালু করে আপনার অ্যাডমিন অ্যাকাউন্ট সুরক্ষিত রাখুন এবং সাইন-ইন সেশন নিয়ন্ত্রণ করুন।"
      />

      {setupMode && !enabled && (
        <div role="alert" className="rounded-2xl border border-brand-300 bg-brand-50 dark:bg-brand-500/10 p-4 text-sm leading-relaxed">
          <p className="font-bold text-heading">আপনার অ্যাকাউন্টে ২-ধাপ যাচাই চালু করা আবশ্যক</p>
          <p className="mt-1 text-muted">
            সাইটের মালিক সব অ্যাডমিনের জন্য এটি বাধ্যতামূলক করেছেন। নিচের ৩টি ধাপ শেষ করলেই পুরো প্যানেল খুলে যাবে — সময় লাগবে ২ মিনিট।
          </p>
        </div>
      )}

      {recoveryUsed && !newCodes && (
        <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 p-4 text-sm leading-relaxed">
          <p className="font-bold text-heading">আপনি একটি রিকভারি কোড ব্যবহার করেছেন</p>
          <p className="mt-1 text-muted">
            আর {params.get("left") ?? "কয়েকটি"}টি কোড বাকি আছে। ফোন ঠিক করে নিন এবং নিচ থেকে নতুন রিকভারি কোড তৈরি করে রাখুন।
          </p>
        </div>
      )}

      {newCodes && <RecoveryCodesPanel codes={newCodes} onDone={afterFullSetup} doneLabel={setupMode ? "শেষ করে প্যানেলে যান" : "শেষ করুন"} />}

      {/* ----------------------------------------------------- my 2FA */}
      <section className={card} aria-labelledby="mfa-title">
        <div className="flex items-start gap-3">
          {enabled ? (
            <ShieldCheck className="w-7 h-7 text-green-600 flex-none" aria-hidden />
          ) : (
            <ShieldOff className="w-7 h-7 text-amber-600 flex-none" aria-hidden />
          )}
          <div className="min-w-0">
            <h2 id="mfa-title" className="text-lg font-bold text-heading">২-ধাপ যাচাই (2FA)</h2>
            <p className={cn("text-sm font-semibold mt-0.5", enabled ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400")}>
              {enabled ? "✓ চালু আছে — আপনার অ্যাকাউন্ট সুরক্ষিত" : "বন্ধ আছে — পাসওয়ার্ড ফাঁস হলে কেউ ঢুকে পড়তে পারে"}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          সাইন-ইনের সময় পাসওয়ার্ডের পরে আপনার ফোনের একটি ৬-সংখ্যার কোড লাগবে। এতে কেউ আপনার পাসওয়ার্ড জেনে ফেললেও ঢুকতে পারবে না।
        </p>

        {!enabled && !setup && (
          <button type="button" onClick={startSetup} disabled={busy} className="btn btn-brand btn-md gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} ২-ধাপ যাচাই চালু করুন
          </button>
        )}

        {!enabled && setup && (
          <ol className="space-y-5 text-sm">
            <li className="space-y-1">
              <p className="font-semibold text-heading">ধাপ ১: ফোনে একটি অথেনটিকেটর অ্যাপ নিন</p>
              <p className="text-muted">Google Authenticator, Microsoft Authenticator বা Authy — প্লে স্টোর/অ্যাপ স্টোর থেকে বিনামূল্যে নামান।</p>
            </li>
            <li className="space-y-2">
              <p className="font-semibold text-heading">ধাপ ২: অ্যাপ দিয়ে এই QR কোড স্ক্যান করুন</p>
              <div className="inline-block rounded-xl bg-white p-2 border border-[var(--line)]">
                <Image src={setup.qr_data_uri} alt="2FA QR কোড" width={176} height={176} unoptimized className="block" />
              </div>
              <p className="text-xs text-muted">
                স্ক্যান করতে না পারলে অ্যাপে এই কী হাতে লিখুন: <span className="font-mono font-semibold select-all break-all">{setup.secret}</span>
              </p>
            </li>
            <li className="space-y-2">
              <p className="font-semibold text-heading">ধাপ ৩: অ্যাপে দেখানো ৬-সংখ্যার কোড এখানে লিখুন</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                aria-label="৬-সংখ্যার কোড"
                className={input}
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={enable} disabled={busy || code.length !== 6} className="btn btn-brand btn-md gap-2 disabled:opacity-50">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} নিশ্চিত করে চালু করুন
                </button>
                <button type="button" onClick={() => { setSetup(null); setCode(""); }} className="btn btn-outline btn-md">বাতিল</button>
              </div>
            </li>
          </ol>
        )}

        {enabled && (
          <div className="space-y-4">
            <div className={cn("rounded-xl border p-3 text-sm", lowCodes ? "border-amber-300 bg-amber-50 dark:bg-amber-500/10" : "border-[var(--line)] bg-brand-50/50 dark:bg-white/5")}>
              <p className="font-semibold text-heading">রিকভারি কোড বাকি: {typeof left === "number" ? left : "—"}</p>
              <p className="text-muted mt-0.5">
                {lowCodes ? "কোড প্রায় শেষ — নিচ থেকে নতুন সেট তৈরি করে রাখুন।" : "ফোন হারালে এই কোড দিয়ে ঢুকতে পারবেন।"}
              </p>
            </div>

            {mode ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-heading">
                  {mode === "disable" ? "বন্ধ করতে অ্যাপের বর্তমান ৬-সংখ্যার কোড দিন" : "নতুন রিকভারি কোড তৈরি করতে অ্যাপের বর্তমান কোড দিন (পুরনো কোড বাতিল হবে)"}
                </p>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  aria-label="৬-সংখ্যার কোড"
                  className={input}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={mode === "disable" ? disable : regenerate}
                    disabled={busy || code.length !== 6}
                    className={cn("btn btn-md gap-2 disabled:opacity-50", mode === "disable" ? "btn-outline text-red-600 border-red-300" : "btn-brand")}
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />} {mode === "disable" ? "বন্ধ করুন" : "নতুন কোড তৈরি করুন"}
                  </button>
                  <button type="button" onClick={() => { setMode(null); setCode(""); }} className="btn btn-outline btn-md">বাতিল</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setMode("regenerate")} className="btn btn-outline btn-md gap-2"><KeyRound className="w-4 h-4" /> নতুন রিকভারি কোড তৈরি</button>
                {required ? (
                  <span className="text-xs text-muted self-center">সাইটের মালিক এটি বাধ্যতামূলক করেছেন, তাই বন্ধ করা যাবে না।</span>
                ) : (
                  <button type="button" onClick={() => setMode("disable")} className="btn btn-outline btn-md gap-2 text-red-600 border-red-200"><ShieldOff className="w-4 h-4" /> বন্ধ করুন</button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* -------------------------------------------- sessions */}
      <section className={card} aria-labelledby="sessions-title">
        <div className="flex items-start gap-3">
          <LogOut className="w-6 h-6 text-brand-600 flex-none mt-0.5" aria-hidden />
          <div>
            <h2 id="sessions-title" className="text-lg font-bold text-heading">সব ডিভাইস থেকে সাইন-আউট</h2>
            <p className="text-sm text-muted leading-relaxed mt-1">
              অন্যের কম্পিউটারে সাইন-ইন রেখে এসেছেন, বা ফোন হারিয়েছেন? এই বাটনে আপনার সব সেশন সাথে সাথে বন্ধ হবে। আপনাকেও নতুন করে সাইন-ইন করতে হবে।
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setConfirmLogoutAll(true)} className="btn btn-outline btn-md gap-2">
          <LogOut className="w-4 h-4" /> সব ডিভাইস থেকে সাইন-আউট করুন
        </button>
      </section>

      {/* ------------------------------------------ master admin */}
      {role === "super_admin" && (
        <section className={card} aria-labelledby="policy-title">
          <div className="flex items-start gap-3">
            <Users className="w-6 h-6 text-brand-600 flex-none mt-0.5" aria-hidden />
            <div>
              <h2 id="policy-title" className="text-lg font-bold text-heading">সাইটের নিরাপত্তা নীতি <span className="text-xs font-medium text-muted">(শুধু মাস্টার অ্যাডমিন)</span></h2>
              <p className="text-sm text-muted leading-relaxed mt-1">
                চালু করলে প্রতিটি অ্যাডমিনকে পরের সাইন-ইনেই ২-ধাপ যাচাই সেট করতে হবে। যাঁর সেট নেই তিনি সেটআপ শেষ না করে প্যানেলের অন্য কিছু খুলতে পারবেন না — তাই কেউ লক-আউট হবেন না।
              </p>
            </div>
          </div>

          {policyUnavailable || !policy ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-none mt-0.5" aria-hidden />
              এই সুবিধা পেতে সার্ভার (Render) আপডেট করা দরকার। আপডেটের পর এখানে সুইচ দেখা যাবে।
            </p>
          ) : (
            <>
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-[var(--line)] p-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  checked={policy.require_2fa}
                  disabled={busy || (!policy.require_2fa && !policy.my_totp_enabled)}
                  onChange={(e) => togglePolicy(e.target.checked)}
                />
                <span className="text-sm">
                  <span className="font-semibold text-heading block">সব অ্যাডমিনের জন্য ২-ধাপ যাচাই বাধ্যতামূলক</span>
                  <span className="text-muted">
                    {!policy.my_totp_enabled && !policy.require_2fa
                      ? "আগে উপরে নিজের অ্যাকাউন্টে ২-ধাপ চালু করুন, তারপর এটি চালু করা যাবে।"
                      : policy.require_2fa ? "এখন বাধ্যতামূলক আছে।" : "এখন ঐচ্ছিক আছে।"}
                  </span>
                </span>
              </label>

              <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
                <table className="w-full text-sm">
                  <thead className="bg-brand-50/70 dark:bg-white/5 text-left">
                    <tr>
                      <th className="px-3 py-2 font-semibold">অ্যাডমিন</th>
                      <th className="px-3 py-2 font-semibold">ভূমিকা</th>
                      <th className="px-3 py-2 font-semibold">২-ধাপ</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {policy.admins.map((a) => (
                      <tr key={a.id}>
                        <td className="px-3 py-2"><span className="font-medium text-heading block">{a.name}</span><span className="text-xs text-muted break-all">{a.email}</span></td>
                        <td className="px-3 py-2 whitespace-nowrap">{a.role}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {a.totp_enabled ? (
                            <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400"><CheckCircle2 className="w-4 h-4" aria-hidden /> চালু</span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400">বন্ধ</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {a.totp_enabled && (
                            <button type="button" onClick={() => setResetTarget({ id: a.id, name: a.name })} className="text-xs text-red-600 hover:underline whitespace-nowrap">
                              রিসেট
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted">
                কেউ ফোন ও রিকভারি কোড দুটোই হারালে “রিসেট” চাপুন — তাঁর ২-ধাপ মুছে যাবে এবং সব সেশন বন্ধ হবে; পরের সাইন-ইনে নতুন করে সেট করবেন।
              </p>
            </>
          )}
        </section>
      )}

      <ConfirmDialog
        open={confirmLogoutAll}
        title="সব ডিভাইস থেকে সাইন-আউট করবেন?"
        message="আপনার সব সেশন বন্ধ হয়ে যাবে এবং নতুন করে সাইন-ইন করতে হবে।"
        confirmLabel="সাইন-আউট করুন"
        variant="warning"
        onConfirm={logoutAll}
        onCancel={() => setConfirmLogoutAll(false)}
      />
      <ConfirmDialog
        open={!!resetTarget}
        title={`${resetTarget?.name ?? ""} এর ২-ধাপ রিসেট করবেন?`}
        message="তাঁর অথেনটিকেটর ও রিকভারি কোড মুছে যাবে এবং সব ডিভাইস থেকে সাইন-আউট হবে। তিনি পরের বার সাইন-ইনে নতুন করে সেট করবেন।"
        confirmLabel="রিসেট করুন"
        variant="danger"
        onConfirm={resetAdmin}
        onCancel={() => setResetTarget(null)}
      />
    </div>
  );
}

export default function SecurityPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-brand-600" /></div>}>
      <AdminSectionBoundary><SecurityInner /></AdminSectionBoundary>
    </Suspense>
  );
}
