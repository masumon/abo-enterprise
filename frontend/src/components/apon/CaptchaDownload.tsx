"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { aponApi, type AponCaptcha } from "@/lib/aponApi";
import { getApiBaseUrl } from "@/lib/apiBase";
import { toBnDigits } from "@/lib/apon";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

interface Props {
  /** Visible label of the download button. */
  label: string;
  captchaRequired: boolean;
  /** e.g. "Apon-1.0.0.apk" — shown after the download starts. */
  fileName: string;
  className?: string;
  disabled?: boolean;
  onStarted?: () => void;
}

type Phase = "closed" | "loading" | "ask" | "checking" | "started" | "blocked";

/**
 * Download button + small "7 + 5 = ?" check. The file is then served from our own address
 * (never from where it is stored), so it simply looks like it comes from the website.
 */
export default function CaptchaDownload({ label, captchaRequired, fileName, className, disabled, onStarted }: Props) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const [phase, setPhase] = useState<Phase>("closed");
  const [captcha, setCaptcha] = useState<AponCaptcha | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [honey, setHoney] = useState("");
  const openerRef = useRef<HTMLButtonElement>(null);

  const num = (n: number) => (bn ? toBnDigits(n) : String(n));
  const close = useCallback(() => {
    setPhase("closed");
    setAnswer("");
    setError("");
    openerRef.current?.focus();
  }, []);
  // Traps Tab inside the dialog and closes it on Escape.
  const dialogRef = useFocusTrap(phase !== "closed" && captchaRequired, close);

  const startDownload = useCallback(
    (url: string) => {
      const full = `${getApiBaseUrl()}${url}`;
      setFileUrl(full);
      setPhase("started");
      onStarted?.();
      // Navigating to an attachment keeps the page open and starts the browser's download.
      window.location.assign(full);
    },
    [onStarted],
  );

  const loadQuestion = useCallback(async () => {
    setPhase("loading");
    setError("");
    setAnswer("");
    try {
      const r = await aponApi.captcha();
      setCaptcha(r.data.data ?? null);
      setPhase("ask");
    } catch {
      setError(bn ? "প্রশ্ন আনা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।" : "Could not load the question. Check your connection and try again.");
      setPhase("blocked");
    }
  }, [bn]);

  const open = async () => {
    if (!captchaRequired) {
      setPhase("checking");
      try {
        const r = await aponApi.ticket("", "", honey);
        if (r.data.data?.url) startDownload(r.data.data.url);
      } catch (e) {
        handleError(e);
      }
      return;
    }
    await loadQuestion();
  };

  const handleError = (e: unknown) => {
    const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
    if (detail === "captcha_failed") {
      setError(bn ? "উত্তরটি সঠিক নয় — নতুন প্রশ্নটি দেখে আবার চেষ্টা করুন।" : "That answer is not right — try the new question.");
      void loadQuestion();
      return;
    }
    const messages: Record<string, [string, string]> = {
      daily_limit: ["আজকের জন্য ডাউনলোডের সীমা পূর্ণ হয়েছে। কাল আবার চেষ্টা করুন, অথবা আমাদের সাথে যোগাযোগ করুন।", "Today's download limit has been reached. Please try again tomorrow or contact us."],
      monthly_limit: ["এই মাসে অনেকে ডাউনলোড করেছেন, তাই সাময়িকভাবে বন্ধ। কিছুদিন পরে বা সহায়তায় যোগাযোগ করুন।", "Downloads are paused for now because of high demand. Please try later or contact support."],
    };
    const m = detail && messages[detail];
    setError(m ? (bn ? m[0] : m[1]) : bn ? "এখন ডাউনলোড করা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।" : "Download isn't available right now. Please try again shortly.");
    setPhase("blocked");
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!captcha || !answer.trim()) return;
    setPhase("checking");
    setError("");
    try {
      const r = await aponApi.ticket(captcha.token, answer, honey);
      if (r.data.data?.url) startDownload(r.data.data.url);
      else throw new Error("no url");
    } catch (e) {
      handleError(e);
    }
  };

  const busy = phase === "loading" || phase === "checking";
  const dialogOpen = phase !== "closed" && captchaRequired;

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={open}
        disabled={disabled || busy}
        className={cn("btn btn-primary btn-lg gap-2 justify-center disabled:opacity-60", className)}
      >
        {busy && !dialogOpen ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <Download className="w-5 h-5" aria-hidden />}
        <span>{label}</span>
      </button>

      {dialogOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" role="presentation">
          <button type="button" aria-label={bn ? "বন্ধ করুন" : "Close"} onClick={close} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default" />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="apon-captcha-title"
            className="relative w-full sm:max-w-md bg-white dark:bg-[#0f172a] rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl animate-slide-up"
          >
            <button type="button" onClick={close} aria-label={bn ? "বন্ধ করুন" : "Close"} className="absolute top-3 right-3 p-2 rounded-full text-muted hover:bg-black/5 dark:hover:bg-white/10">
              <X className="w-5 h-5" aria-hidden />
            </button>

            {phase === "started" ? (
              <div className="text-center space-y-4 py-2">
                <CheckCircle2 className="w-14 h-14 mx-auto text-green-600" aria-hidden />
                <h2 id="apon-captcha-title" className="text-xl font-bold text-heading">{bn ? "ডাউনলোড শুরু হয়েছে" : "Your download has started"}</h2>
                <p className="text-sm text-muted leading-relaxed">
                  {bn ? `ফাইল: ${fileName}। শেষ হলে নোটিফিকেশন বা ফাইল ম্যানেজারের Downloads থেকে খুলে ইনস্টল করুন।` : `File: ${fileName}. When it finishes, open it from the notification or your Downloads folder to install.`}
                </p>
                <a href={fileUrl} className="btn btn-outline btn-md justify-center w-full">
                  {bn ? "শুরু না হলে এখানে চাপুন" : "Didn't start? Tap here"}
                </a>
                <button type="button" onClick={close} className="btn btn-brand btn-md w-full justify-center">{bn ? "ইনস্টল-গাইড দেখুন" : "See install steps"}</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4" noValidate>
                <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
                  <ShieldCheck className="w-5 h-5" aria-hidden />
                  <h2 id="apon-captcha-title" className="text-lg font-bold">{bn ? "নিরাপত্তা যাচাই" : "Quick security check"}</h2>
                </div>
                <p className="text-sm text-muted">{bn ? "রোবট নয় প্রমাণ করতে নিচের যোগ-বিয়োগটি করুন।" : "Solve this small sum to show you are not a robot."}</p>

                {phase === "loading" ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-brand-600" aria-label={bn ? "লোড হচ্ছে" : "Loading"} /></div>
                ) : captcha && phase !== "blocked" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3 rounded-2xl bg-brand-50 dark:bg-white/5 py-5">
                      <span className="text-3xl sm:text-4xl font-extrabold text-heading tracking-wide" aria-live="polite">
                        {num(captcha.a)} {captcha.op === "+" ? "+" : "−"} {num(captcha.b)} = ?
                      </span>
                    </div>
                    <label className="block">
                      <span className="sr-only">{bn ? "উত্তর" : "Answer"}</span>
                      <input
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value.replace(/[^0-9০-৯]/g, "").slice(0, 3))}
                        inputMode="numeric"
                        autoComplete="off"
                        autoFocus
                        placeholder={bn ? "উত্তর লিখুন" : "Your answer"}
                        className="w-full px-4 py-3 rounded-xl border-2 border-[var(--line)] bg-white dark:bg-white/5 text-center text-2xl font-bold focus:outline-none focus:border-brand-500"
                      />
                    </label>
                    {/* Honeypot: hidden from people, tempting for bots. */}
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honey} onChange={(e) => setHoney(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                  </div>
                ) : null}

                {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  {phase === "blocked" ? (
                    <button type="button" onClick={loadQuestion} className="btn btn-brand btn-lg flex-1 justify-center gap-2"><RefreshCw className="w-4 h-4" aria-hidden />{bn ? "আবার চেষ্টা করুন" : "Try again"}</button>
                  ) : (
                    <>
                      <button type="button" onClick={loadQuestion} disabled={busy} className="btn btn-outline btn-md justify-center gap-2"><RefreshCw className="w-4 h-4" aria-hidden />{bn ? "নতুন প্রশ্ন" : "New question"}</button>
                      <button type="submit" disabled={busy || !answer} className="btn btn-primary btn-lg flex-1 justify-center gap-2 disabled:opacity-60">
                        {phase === "checking" ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <Download className="w-5 h-5" aria-hidden />}
                        {bn ? "ডাউনলোড শুরু করুন" : "Start download"}
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
