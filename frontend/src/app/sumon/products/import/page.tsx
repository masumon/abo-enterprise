"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, UploadCloud, FileDown, FileSpreadsheet, ListTree, CheckCircle2,
  AlertTriangle, XCircle, ArrowLeft, History, RefreshCw,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  productImportApi,
  type ImportValidateResult,
  type ImportCommitResult,
  type ImportHistoryItem,
} from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

const IGNORE = "__ignore__";

const ACTION_BADGE: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  update: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
  skip: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400",
};

export default function AdminProductImportPage() {
  const toast = useToastStore((s) => s.push);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [onExisting, setOnExisting] = useState("update");
  const [onNew, setOnNew] = useState("create");
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<ImportValidateResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<ImportCommitResult | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [dl, setDl] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try { setHistory((await productImportApi.history()).data.data ?? []); } catch { /* table may be pending migration */ }
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const download = async (kind: "csv" | "xlsx" | "tree") => {
    setDl(kind);
    try {
      if (kind === "tree") await productImportApi.downloadCategoryTree();
      else await productImportApi.downloadTemplate(kind);
    } catch (e) { toast("error", apiErrorMessage(e, "ডাউনলোড ব্যর্থ")); }
    finally { setDl(null); }
  };

  const pickFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setResult(null);
    setMapping({});
  };

  const runValidate = async (useMapping: Record<string, string | null> | null) => {
    if (!file) { toast("error", "আগে একটি ফাইল বাছুন"); return; }
    setValidating(true);
    setResult(null);
    try {
      const r = await productImportApi.validate(file, useMapping, onExisting, onNew);
      const data = r.data.data;
      setPreview(data);
      setMapping(useMapping ?? data.mapping_used);
    } catch (e) {
      toast("error", apiErrorMessage(e, "ভ্যালিডেশন ব্যর্থ"));
    } finally {
      setValidating(false);
    }
  };

  const commit = async () => {
    if (!file || !preview) return;
    if (preview.summary.create + preview.summary.update === 0) {
      toast("error", "ইমপোর্ট করার মতো কোনো সঠিক সারি নেই");
      return;
    }
    setCommitting(true);
    try {
      const r = await productImportApi.commit(file, mapping, onExisting, onNew);
      setResult(r.data.data);
      toast("success", r.data.message || "ইমপোর্ট সম্পন্ন");
      setPreview(null);
      await loadHistory();
    } catch (e) {
      toast("error", apiErrorMessage(e, "ইমপোর্ট ব্যর্থ"));
    } finally {
      setCommitting(false);
    }
  };

  const S = preview?.summary;

  return (
    <div>
      <AdminPageHeader
        title="Bulk Product Import"
        titleBn="বাল্ক পণ্য ইমপোর্ট"
        description="Upload a CSV/Excel file to create or update many products at once. Validate first — nothing is saved until you press Import."
        descriptionBn="CSV/Excel দিয়ে একসাথে অনেক পণ্য তৈরি/আপডেট করুন। আগে যাচাই করুন — Import না চাপা পর্যন্ত কিছু সেভ হয় না।"
        actions={
          <Link href="/sumon/products" className="btn btn-outline btn-sm"><ArrowLeft className="w-4 h-4" /> পণ্যে ফিরুন</Link>
        }
      />

      {/* Step 1 — templates + upload */}
      <div className="enterprise-card p-5 mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">১. টেমপ্লেট ও ক্যাটাগরি</p>
        <div className="flex flex-wrap gap-2 mb-5">
          <button type="button" onClick={() => download("csv")} disabled={dl !== null} className="btn btn-outline btn-sm">
            {dl === "csv" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} টেমপ্লেট (CSV)
          </button>
          <button type="button" onClick={() => download("xlsx")} disabled={dl !== null} className="btn btn-outline btn-sm">
            {dl === "xlsx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} টেমপ্লেট (Excel)
          </button>
          <button type="button" onClick={() => download("tree")} disabled={dl !== null} className="btn btn-outline btn-sm">
            {dl === "tree" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListTree className="w-4 h-4" />} ক্যাটাগরি ট্রি (CSV)
          </button>
        </div>

        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">২. ফাইল আপলোড</p>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] ?? null); }}
          className="border-2 border-dashed border-[var(--line)] rounded-2xl p-6 text-center cursor-pointer hover:border-brand-400 transition-colors"
        >
          <UploadCloud className="w-8 h-8 mx-auto mb-2 text-brand-400" />
          <p className="text-sm text-heading font-medium">{file ? file.name : "CSV বা Excel ফাইল টেনে ছাড়ুন বা ক্লিক করুন"}</p>
          <p className="text-[11px] text-muted mt-1">.csv / .xlsx · সর্বোচ্চ ২০০০ সারি</p>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm" hidden onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-muted">বিদ্যমান পণ্য (slug মিললে):</span>
            <select value={onExisting} onChange={(e) => setOnExisting(e.target.value)} className="input w-auto py-1 text-sm">
              <option value="update">আপডেট</option>
              <option value="skip">বাদ দিন</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-muted">নতুন পণ্য:</span>
            <select value={onNew} onChange={(e) => setOnNew(e.target.value)} className="input w-auto py-1 text-sm">
              <option value="create">তৈরি করুন</option>
              <option value="skip">বাদ দিন</option>
            </select>
          </label>
          <button type="button" onClick={() => runValidate(null)} disabled={!file || validating} className="btn btn-brand btn-sm ml-auto">
            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} যাচাই ও প্রিভিউ
          </button>
        </div>
      </div>

      {/* Step 2 — mapping + preview */}
      {preview && (
        <div className="enterprise-card p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">৩. কলাম ম্যাপিং ও প্রিভিউ</p>
            <button type="button" onClick={() => runValidate(mapping)} disabled={validating} className="btn btn-outline btn-sm">
              {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} পুনরায় যাচাই
            </button>
          </div>

          {/* Summary */}
          {S && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <Stat label="তৈরি হবে" value={S.create} tone="emerald" />
              <Stat label="আপডেট হবে" value={S.update} tone="brand" />
              <Stat label="বাদ যাবে" value={S.skip} tone="gray" />
              <Stat label="এরর" value={S.errors} tone="red" />
            </div>
          )}

          {/* Column mapping */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-semibold text-heading">কলাম ম্যাপিং ({preview.headers.length}টি কলাম) — প্রয়োজনে বদলান</summary>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
              {preview.headers.map((h) => (
                <label key={h} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 min-w-0 truncate text-muted" title={h}>{h}</span>
                  <span className="text-gray-300">→</span>
                  <select
                    value={mapping[h] ?? IGNORE}
                    onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value === IGNORE ? null : e.target.value }))}
                    className="input w-36 py-1 text-xs"
                  >
                    <option value={IGNORE}>— উপেক্ষা —</option>
                    {preview.fields.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </details>

          {/* Preview table */}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase text-gray-400 border-b border-[var(--line)]">
                  <th className="py-2 px-2">সারি</th>
                  <th className="py-2 px-2">অ্যাকশন</th>
                  <th className="py-2 px-2">Slug</th>
                  <th className="py-2 px-2">নাম</th>
                  <th className="py-2 px-2">ক্যাটাগরি</th>
                  <th className="py-2 px-2">SKU</th>
                  <th className="py-2 px-2">সমস্যা</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 100).map((r) => (
                  <tr key={r.row} className="border-b border-gray-50 dark:border-white/5 align-top">
                    <td className="py-2 px-2 text-muted">{r.row}</td>
                    <td className="py-2 px-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ACTION_BADGE[r.action]}`}>{r.action}</span></td>
                    <td className="py-2 px-2 font-mono text-xs">{r.slug || "—"}</td>
                    <td className="py-2 px-2">{r.name || "—"}</td>
                    <td className="py-2 px-2 text-xs">{r.category || "—"}</td>
                    <td className="py-2 px-2 font-mono text-xs">{r.sku || "—"}</td>
                    <td className="py-2 px-2 text-xs">
                      {r.errors.map((e, i) => <p key={`e${i}`} className="text-red-600 flex items-start gap-1"><XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{e}</p>)}
                      {r.warnings.map((w, i) => <p key={`w${i}`} className="text-amber-600 flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />{w}</p>)}
                      {r.errors.length === 0 && r.warnings.length === 0 && <span className="text-emerald-500">✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 100 && <p className="text-[11px] text-muted mt-2">প্রথম ১০০টি সারি দেখানো হচ্ছে (মোট {preview.rows.length})।</p>}
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[var(--line)]">
            <button type="button" onClick={commit} disabled={committing || (S ? S.create + S.update === 0 : true)} className="btn btn-success btn-md">
              {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {S ? `${S.create + S.update}টি পণ্য ইমপোর্ট করুন` : "ইমপোর্ট করুন"}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="enterprise-card p-5 mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">৪. ফলাফল</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="তৈরি হয়েছে" value={result.created} tone="emerald" />
            <Stat label="আপডেট হয়েছে" value={result.updated} tone="brand" />
            <Stat label="বাদ পড়েছে" value={result.skipped} tone="gray" />
          </div>
          {result.errors.length > 0 && (
            <details open>
              <summary className="cursor-pointer text-sm font-semibold text-heading">এরর রিপোর্ট ({result.errors.length})</summary>
              <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs"><span className="font-mono text-muted">সারি {e.row} ({e.slug || "—"}):</span> <span className="text-red-600">{e.errors.join("; ")}</span> {e.warnings.length > 0 && <span className="text-amber-600">{e.warnings.join("; ")}</span>}</p>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Import history */}
      <div className="enterprise-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> ইমপোর্ট হিস্টরি</p>
          <button type="button" onClick={loadHistory} className="btn btn-ghost btn-sm"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted">এখনো কোনো ইমপোর্ট হয়নি। (হিস্টরি দেখাতে ডেটাবেসে <code className="text-xs">032_product_import_jobs.sql</code> রান করা থাকতে হবে।)</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] uppercase text-gray-400 border-b border-[var(--line)]">
                  <th className="py-2 px-2">তারিখ</th><th className="py-2 px-2">ফাইল</th>
                  <th className="py-2 px-2">তৈরি</th><th className="py-2 px-2">আপডেট</th>
                  <th className="py-2 px-2">বাদ</th><th className="py-2 px-2">এরর</th>
                </tr>
              </thead>
              <tbody>
                {history.map((j) => (
                  <tr key={j.id} className="border-b border-gray-50 dark:border-white/5">
                    <td className="py-2 px-2 text-xs text-muted">{j.created_at ? new Date(j.created_at).toLocaleString() : "—"}</td>
                    <td className="py-2 px-2 text-xs truncate max-w-[160px]" title={j.filename ?? ""}>{j.filename || "—"}</td>
                    <td className="py-2 px-2 text-emerald-600 font-semibold">{j.created}</td>
                    <td className="py-2 px-2 text-brand-600 font-semibold">{j.updated}</td>
                    <td className="py-2 px-2 text-muted">{j.skipped}</td>
                    <td className="py-2 px-2 text-red-600">{j.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "brand" | "gray" | "red" }) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    brand: "text-brand-600 dark:text-brand-300",
    gray: "text-gray-500",
    red: "text-red-600",
  };
  return (
    <div className="rounded-xl border border-[var(--line)] p-3 text-center">
      <p className={`text-2xl font-extrabold ${tones[tone]}`}>{value}</p>
      <p className="text-[11px] text-muted mt-0.5">{label}</p>
    </div>
  );
}
