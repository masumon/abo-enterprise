"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, KeyRound, Loader2, ArrowLeft, Mail } from "lucide-react";
import { BD_PHONE_REGEX } from "@/lib/phone";
import PhoneField, { PHONE_COUNTRIES, composePhone, type PhoneCountry } from "@/components/ui/PhoneField";
import { customerOtpApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useCustomerStore } from "@/store/customer";
import { useLanguageStore } from "@/store/language";

/**
 * Two-step customer sign-in: phone + name → OTP → verified session token.
 * The token gates order-history reads server-side.
 */
export default function CustomerOtpForm({ redirectTo = "/orders" }: { redirectTo?: string }) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const login = useCustomerStore((s) => s.login);
  const router = useRouter();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [name, setName] = useState("");
  // Screen 15b — the number is entered as country + local digits. Bangladesh
  // adds no prefix, so the common case submits the same string it always did.
  const [country, setCountry] = useState<PhoneCountry>(PHONE_COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const fullPhone = composePhone(country, phone);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devHint, setDevHint] = useState(false);
  // M8 — the send endpoint had no cooldown affordance on the client, so a
  // stuck/slow email invited repeated taps. 30s matches typical email OTP
  // delivery latency without making a genuinely lost code feel unrecoverable.
  const RESEND_COOLDOWN = 30;
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const doSend = async () => {
    const r = await customerOtpApi.send(fullPhone, email.trim());
    setDevHint(!(r.data.data as { via_email?: boolean })?.via_email);
    setResendIn(RESEND_COOLDOWN);
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!BD_PHONE_REGEX.test(fullPhone)) {
      setError(bn ? "সঠিক ফোন নম্বর দিন (01XXXXXXXXX)" : "Enter a valid BD phone number");
      return;
    }
    if (name.trim().length < 2) {
      setError(bn ? "আপনার নাম দিন" : "Enter your name");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(bn ? "সঠিক ইমেইল দিন (OTP ইমেইলে যাবে)" : "Enter a valid email (OTP is sent by email)");
      return;
    }
    setLoading(true);
    try {
      await doSend();
      setStep("otp");
    } catch (err) {
      setError(apiErrorMessage(err, bn ? "OTP পাঠানো যায়নি — আবার চেষ্টা করুন" : "Could not send OTP — try again"));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendIn > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      await doSend();
    } catch (err) {
      setError(apiErrorMessage(err, bn ? "OTP পাঠানো যায়নি — আবার চেষ্টা করুন" : "Could not send OTP — try again"));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.trim().length < 4) {
      setError(bn ? "৪ সংখ্যার কোডটি দিন" : "Enter the 4-digit code");
      return;
    }
    setLoading(true);
    try {
      const r = await customerOtpApi.verify(fullPhone, code.trim());
      const token = r.data.data?.access_token;
      if (!token) throw new Error("no token");
      login(fullPhone, name.trim(), token);
      router.push(redirectTo);
    } catch (err) {
      setError(apiErrorMessage(err, bn ? "কোডটি সঠিক নয় বা মেয়াদ শেষ" : "Invalid or expired code"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <form onSubmit={verifyOtp} className="space-y-4">
        {error && (
          <p role="alert" className="alert-error">{error}</p>
        )}
        <p className="text-sm text-muted">
          {bn ? `${email} ঠিকানায় ৪ সংখ্যার কোড পাঠানো হয়েছে (ইনবক্স/স্প্যাম দেখুন)` : `A 4-digit code was sent to ${email} (check inbox/spam)`}
          {devHint && (
            <span className="block text-xs mt-1 text-amber-600">
              {bn ? "(ইমেইল পাঠানো যায়নি — কোডটি সার্ভার লগে আছে)" : "(Email not delivered — code is in the server log)"}
            </span>
          )}
        </p>
        <div>
          <label className="form-label" htmlFor="otp-code">{bn ? "OTP কোড" : "OTP Code"}</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              id="otp-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="input pl-10 tracking-[0.4em] font-mono"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              placeholder="0000"
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn btn-brand btn-lg w-full flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {bn ? "যাচাই করে লগইন করুন" : "Verify & Sign In"}
        </button>
        <button
          type="button"
          onClick={resendOtp}
          disabled={loading || resendIn > 0}
          className="text-xs text-brand-600 dark:text-brand-400 hover:underline w-full text-center disabled:text-muted disabled:no-underline disabled:cursor-not-allowed"
        >
          {resendIn > 0
            ? (bn ? `আবার পাঠান (${resendIn}s)` : `Resend code (${resendIn}s)`)
            : (bn ? "কোড আবার পাঠান" : "Resend code")}
        </button>
        <button
          type="button"
          onClick={() => { setStep("phone"); setCode(""); setError(""); setResendIn(0); }}
          className="btn btn-ghost btn-sm w-full flex items-center justify-center gap-1.5 text-muted"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {bn ? "নম্বর পরিবর্তন করুন" : "Change number"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendOtp} className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
      )}
      <div>
        <label className="form-label" htmlFor="cust-name">{bn ? "নাম" : "Name"}</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input id="cust-name" value={name} onChange={(e) => setName(e.target.value)} className="input pl-10" autoComplete="name" />
        </div>
      </div>
      <PhoneField
        id="cust-phone"
        label={bn ? "ফোন" : "Phone"}
        country={country}
        onCountryChange={setCountry}
        value={phone}
        onChange={setPhone}
        hint={
          country.code === "BD"
            ? undefined
            : bn
              ? "প্রবাসে থাকলে নিজের দেশ বেছে নিন — ডেলিভারি বাংলাদেশেই হবে।"
              : "Living abroad? Pick your country — delivery still happens inside Bangladesh."
        }
      />
      <div>
        <label className="form-label" htmlFor="cust-email">{bn ? "ইমেইল (OTP এখানে যাবে)" : "Email (OTP is sent here)"}</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            id="cust-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input pl-10"
            placeholder="you@example.com"
            inputMode="email"
            autoComplete="email"
          />
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn btn-brand btn-lg w-full flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {bn ? "OTP পাঠান" : "Send OTP"}
      </button>
      <p className="text-xs text-muted text-center">
        {bn
          ? "OTP আপনার ইমেইলে যাবে; যাচাইয়ের পরই অর্ডার হিস্ট্রি দেখা যাবে"
          : "The OTP is emailed to you; order history unlocks after verification"}
      </p>
    </form>
  );
}
