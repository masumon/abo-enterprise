"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import { getApiBaseUrl } from "@/lib/apiBase";
import { getAdminToken } from "@/lib/adminAuth";

interface DiagnosticResult {
  ok: boolean;
  code: string;
  http_status: number | null;
  message: string;
  balance: number | null;
  elapsed_ms: number;
}

export default function SteadfastTestPage() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const token = getAdminToken();
      const response = await fetch(`${getApiBaseUrl()}/api/v1/admin/steadfast/test-connection`, {
        method: "GET",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as DiagnosticResult | { detail?: string } | null;
      if (!response.ok) {
        throw new Error(
          typeof data === "object" && data && "detail" in data && data.detail
            ? String(data.detail)
            : `Diagnostic request failed (HTTP ${response.status})`
        );
      }
      setResult(data as DiagnosticResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to run Steadfast diagnostic.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="admin-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-700"><ShieldCheck className="w-6 h-6" /></div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Steadfast API Test Connection</h1>
            <p className="text-sm text-gray-500 mt-1">নিরাপদ পরীক্ষা — শুধু Steadfast balance endpoint ব্যবহার করবে। কোনো order বা consignment তৈরি করবে না।</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          <div className="flex gap-2"><Truck className="w-5 h-5 shrink-0 mt-0.5" /><div><p className="font-semibold">এই পরীক্ষা কী করবে?</p><p className="mt-1">Saved Settings থেকে Enabled, API Key এবং Secret Key পড়ে Steadfast-এর authenticated balance API-তে একটি GET request করবে। Secret কখনো UI বা diagnostic response-এ দেখাবে না।</p></div></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={testConnection} disabled={loading} className="admin-btn-primary inline-flex items-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? "Testing…" : "Test Connection"}
          </button>
          <Link href="/sumon/settings" className="admin-btn-secondary inline-flex items-center gap-2">Steadfast Settings</Link>
        </div>
      </div>

      {error && <div className="admin-card p-5 border border-red-200 bg-red-50"><div className="flex gap-3 text-red-800"><AlertCircle className="w-5 h-5 shrink-0" /><div><p className="font-semibold">Diagnostic request failed</p><p className="text-sm mt-1 break-words">{error}</p></div></div></div>}

      {result && (
        <div className={`admin-card p-5 border ${result.ok ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-start gap-3">
            {result.ok ? <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" /> : <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className={`font-bold ${result.ok ? "text-green-900" : "text-amber-900"}`}>{result.ok ? "Steadfast connection successful" : "Steadfast diagnostic result"}</p>
              <p className={`text-sm mt-1 ${result.ok ? "text-green-800" : "text-amber-800"}`}>{result.message}</p>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="rounded-lg bg-white/70 border border-black/5 p-3"><dt className="text-xs text-gray-500">Code</dt><dd className="font-semibold mt-1">{result.code}</dd></div>
                <div className="rounded-lg bg-white/70 border border-black/5 p-3"><dt className="text-xs text-gray-500">HTTP</dt><dd className="font-semibold mt-1">{result.http_status ?? "—"}</dd></div>
                <div className="rounded-lg bg-white/70 border border-black/5 p-3"><dt className="text-xs text-gray-500">Balance</dt><dd className="font-semibold mt-1">{result.balance == null ? "—" : `৳${result.balance.toLocaleString("en-BD")}`}</dd></div>
                <div className="rounded-lg bg-white/70 border border-black/5 p-3"><dt className="text-xs text-gray-500">Response</dt><dd className="font-semibold mt-1">{result.elapsed_ms} ms</dd></div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
