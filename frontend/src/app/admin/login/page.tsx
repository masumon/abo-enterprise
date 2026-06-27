"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bot, Eye, EyeOff, AlertCircle, Wifi, WifiOff, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
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

  // Has a response from server
  if (err.response) {
    const detail = err.response.data?.detail;
    if (err.response.status === 401) {
      return { type: "auth", msg: detail ?? "ইমেইল বা পাসওয়ার্ড সঠিক নয়" };
    }
    return { type: "unknown", msg: detail ?? `Server error (${err.response.status})` };
  }

  // No response — network level failure
  if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
    return {
      type: "timeout",
      msg: "Server respond করতে দেরি হচ্ছে। Render free tier cold start-এ ৬০ সেকেন্ড পর্যন্ত লাগতে পারে। একটু পরে আবার চেষ্টা করুন।",
    };
  }

  return {
    type: "network",
    msg: "Backend server-এর সাথে সংযোগ হচ্ছে না। CORS বা network সমস্যা হতে পারে।",
  };
}

export default function AdminLoginPage() {
  const router = useRouter();
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
      localStorage.setItem("abo_admin_token", token);
      router.replace("/admin");
    } catch (e: unknown) {
      setErrorInfo(getErrorInfo(e));
    } finally {
      setLoading(false);
    }
  };

  const ErrorIcon = errorInfo?.type === "network" || errorInfo?.type === "timeout"
    ? WifiOff
    : AlertCircle;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-white text-xl font-bold">ABO Enterprise</h1>
          <p className="text-gray-500 text-sm mt-1">Admin Panel</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-white/10 shadow-xl">
          {errorInfo && (
            <div className={cn(
              "flex items-start gap-2 rounded-lg px-4 py-3 mb-5 border",
              errorInfo.type === "auth"
                ? "bg-red-500/10 border-red-500/20"
                : "bg-yellow-500/10 border-yellow-500/20"
            )}>
              <ErrorIcon className={cn(
                "w-4 h-4 flex-shrink-0 mt-0.5",
                errorInfo.type === "auth" ? "text-red-400" : "text-yellow-400"
              )} />
              <p className={cn(
                "text-sm leading-relaxed",
                errorInfo.type === "auth" ? "text-red-400" : "text-yellow-400"
              )}>
                {errorInfo.msg}
              </p>
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
                  "w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors",
                  errors.email ? "border-red-500" : "border-gray-700"
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
                    "w-full px-4 py-3 pr-11 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors",
                    errors.password ? "border-red-500" : "border-gray-700"
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
              className="btn btn-brand btn-md w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  সংযোগ হচ্ছে...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          &copy; {new Date().getFullYear()} ABO Enterprise
        </p>
      </div>
    </div>
  );
}
