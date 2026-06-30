"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bot, Eye, EyeOff, AlertCircle, Wifi, WifiOff, Loader2, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api";
import { setAdminToken } from "@/lib/adminAuth";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});
type FormData = z.infer<typeof schema>;

type ErrorType = "auth" | "network" | "timeout" | "unknown";

function getErrorInfo(e: unknown): { type: ErrorType; msg: string } {
  const err = e as {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { detail?: string } };
  };

  if (err.response) {
    const detail = err.response.data?.detail;
    if (err.response.status === 401) {
      return { type: "auth", msg: detail ?? "ইমেইল বা পাসওয়ার্ড সঠিক নয়" };
    }
    return { type: "unknown", msg: detail ?? `Server error (${err.response.status})` };
  }

  if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
    return {
      type: "timeout",
      msg: "Server respond করতে দেরি হচ্ছে। Render cold start-এ ৬০ সেকেন্ড পর্যন্ত লাগতে পারে।",
    };
  }

  return {
    type: "network",
    msg: "Backend server-এর সাথে সংযোগ হচ্ছে না।",
  };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ type: ErrorType; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setErrorInfo(null);
    try {
      const res = await authApi.login(data.email, data.password);
      const token = res.data.data?.access_token;
      if (!token) throw new Error("No token received");
      setAdminToken(token);
      const redirect = searchParams.get("redirect");
      const safeRedirect =
        redirect && redirect.startsWith("/admin") && redirect !== "/admin/login"
          ? redirect
          : "/admin";
      router.replace(safeRedirect);
    } catch (e: unknown) {
      setErrorInfo(getErrorInfo(e));
    } finally {
      setLoading(false);
    }
  };

  const ErrorIcon = errorInfo?.type === "network" || errorInfo?.type === "timeout" ? WifiOff : AlertCircle;

  return (
    <div className="w-full max-w-md">
      <div className="admin-login-card p-6 sm:p-8">
        {errorInfo && (
          <div className={cn(
            "flex items-start gap-2 rounded-xl px-4 py-3 mb-5 border text-sm",
            errorInfo.type === "auth"
              ? "bg-red-500/10 border-red-500/20 text-red-300"
              : "bg-amber-500/10 border-amber-500/20 text-amber-200"
          )}>
            <ErrorIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorInfo.msg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              className={cn(
                "w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 transition-colors",
                errors.email ? "border-red-500" : "border-white/10"
              )}
              placeholder="admin@aboenterprise.com"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className={cn(
                  "w-full px-4 py-3 pr-11 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 transition-colors",
                  errors.password ? "border-red-500" : "border-white/10"
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                সংযোগ হচ্ছে…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-gray-600 text-xs mt-6 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        Secure admin access only
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen admin-login-shell flex">
      {/* Left brand panel — desktop */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-800 to-gray-950" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.2) 0%, transparent 40%)",
        }} />
        <div className="relative z-10">
          <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mb-8">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight mb-3">
            ABO Enterprise<br />Admin Panel
          </h1>
          <p className="text-brand-100/80 text-base max-w-sm leading-relaxed">
            অর্ডার, পণ্য, বুকিং, লিড ও সাইট সেটিংস — সব এক জায়গায় সহজে পরিচালনা করুন।
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-3 max-w-sm">
          {["Orders & Payments", "Products & Services", "Leads & Bookings", "Site Settings"].map((t) => (
            <div key={t} className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur text-xs text-white/90 font-medium">
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="lg:hidden text-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-white text-xl font-bold">ABO Enterprise</h1>
          <p className="text-gray-500 text-sm mt-1">Admin Panel</p>
        </div>

        <Suspense fallback={<Loader2 className="w-8 h-8 text-brand-500 animate-spin" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
