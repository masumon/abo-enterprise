"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShieldCheck, ShieldOff, Loader2, KeyRound } from "lucide-react";
import { authApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

/** Self-service TOTP 2FA for the logged-in admin (Google Authenticator etc.). */
export default function TwoFactorCard() {
  const toast = useToastStore((s) => s.push);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr_data_uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authApi.totpStatus().then((r) => setEnabled(!!r.data.data?.enabled)).catch(() => setEnabled(false));
  }, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const r = await authApi.totpSetup();
      setSetup(r.data.data ?? null);
    } catch (e) {
      toast("error", apiErrorMessage(e, "Setup failed"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await authApi.totpEnable(code);
      setEnabled(true);
      setSetup(null);
      setCode("");
      toast("success", "2FA চালু হয়েছে — পরের লগইন থেকে কোড লাগবে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Invalid code"));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await authApi.totpDisable(code);
      setEnabled(false);
      setCode("");
      toast("success", "2FA বন্ধ হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "Invalid code"));
    } finally {
      setBusy(false);
    }
  };

  if (enabled === null) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2.5 mb-1">
        {enabled ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <ShieldOff className="w-5 h-5 text-gray-400" />}
        <h2 className="text-sm font-semibold text-gray-800">Two-Factor Authentication (আপনার অ্যাকাউন্ট)</h2>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
          {enabled ? "চালু" : "বন্ধ"}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Google Authenticator / Authy দিয়ে লগইনে অতিরিক্ত ৬-সংখ্যার কোড — অ্যাডমিন প্যানেলের সবচেয়ে বড় সুরক্ষা।
      </p>

      {!enabled && !setup && (
        <button type="button" onClick={startSetup} disabled={busy} className="btn btn-brand btn-sm inline-flex items-center gap-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
          2FA চালু করুন
        </button>
      )}

      {!enabled && setup && (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Image src={setup.qr_data_uri} alt="2FA QR code" width={140} height={140} className="rounded-lg border border-gray-200" unoptimized />
          <div className="flex-1 text-xs text-gray-600 space-y-2">
            <p>১. Google Authenticator/Authy অ্যাপে QR কোডটি স্ক্যান করুন (বা কী লিখুন: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{setup.secret}</code>)</p>
            <p>২. অ্যাপে দেখানো ৬-সংখ্যার কোড দিয়ে নিশ্চিত করুন:</p>
            <div className="flex items-center gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="000000"
                className="input w-32 text-center tracking-[0.3em]"
              />
              <button type="button" onClick={confirm} disabled={busy || code.length !== 6} className="btn btn-brand btn-sm">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "নিশ্চিত করুন"}
              </button>
            </div>
          </div>
        </div>
      )}

      {enabled && (
        <div className="flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            className="input w-32 text-center tracking-[0.3em]"
          />
          <button type="button" onClick={disable} disabled={busy || code.length !== 6} className="btn btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "2FA বন্ধ করুন"}
          </button>
        </div>
      )}
    </div>
  );
}
