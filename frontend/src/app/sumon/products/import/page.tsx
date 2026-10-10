"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, UploadCloud, FileDown, FileSpreadsheet, FileText, ListTree, CheckCircle2,
  AlertTriangle, XCircle, ArrowLeft, History, RefreshCw, PackagePlus, PackageCheck,
  SkipForward, Filter, FolderOpen, ImageIcon, FolderPlus, type LucideIcon,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { cn } from "@/lib/utils";
import {
  adminApi,
  productImportApi,
  type ImportValidateResult,
  type ImportCommitResult,
  type ImportHistoryItem,
} from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { categoriesApi } from "@/lib/api";
import { importAdminApi, bnNum, type ImportOverrides } from "@/lib/catalogAdminApi";
import AiPhotoProductsModal from "@/components/admin/AiPhotoProductsModal";
import { Camera, Wrench } from "lucide-react";

const IGNORE = "__ignore__";

const ACTION_BADGE: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  update: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
  skip: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400",
};

const STEPS = ["ফাইল/ছবি দিন", "দেখে নিন", "সাইটে যোগ করুন"];

/** Same rule as the server: case-insensitive base file name. */
const imgKey = (name: string) => (name.split(/[\\/]/).pop() || "").trim().toLowerCase();
const SHEET_RE = /\.(csv|xlsx|xlsm)$/i;
const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|heic)$/i;

export default function AdminProductImportPage() {
  const toast = useToastStore((s) => s.push);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const folderRef = useRef<HTMLInputElement>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [onExisting, setOnExisting] = useState("update");
  const [onNew, setOnNew] = useState("create");
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<ImportValidateResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<ImportCommitResult | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [dl, setDl] = useState<string | null>(null);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [confirmCommitOpen, setConfirmCommitOpen] = useState(false);
  const [overrides, setOverrides] = useState<ImportOverrides>({});
  const [progress, setProgress] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [catOpts, setCatOpts] = useState<{ slug: string; label: string; id?: string }[]>([]);
  useEffect(() => {
    categoriesApi.list({ applies_to: "product" }).then((r) => {
      const out: { slug: string; label: string; id?: string }[] = [];
      type N = { id: string; slug: string; name_en: string; name_bn?: string | null; subcategories?: N[] };
      const walk = (ns: N[], d: number) => ns.forEach((n) => { out.push({ slug: n.slug, id: n.id, label: `${"— ".repeat(d)}${n.name_bn || n.name_en}` }); walk(n.subcategories ?? [], d + 1); });
      walk((r.data.data ?? []) as unknown as N[], 0);
      setCatOpts(out);
    }).catch(() => {});
  }, []);
  const fix = (row: number, field: string, value: string) =>
    setOverrides((o) => ({ ...o, [row]: { ...(o[row] ?? {}), [field]: value } }));

  const step = result || committing ? 3 : preview ? 2 : 1;

  const loadHistory = useCallback(async () => {
    try { setHistory((await productImportApi.history()).data.data ?? []); } catch { /* table may be pending migration */ }
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const download = async (kind: "csv" | "xlsx" | "tree" | "simple") => {
    setDl(kind);
    try {
      if (kind === "simple") await importAdminApi.downloadSimpleTemplate("xlsx");
      else if (kind === "tree") await productImportApi.downloadCategoryTree();
      else await productImportApi.downloadTemplate(kind);
    } catch (e) { toast("error", apiErrorMessage(e, "ডাউনলোড ব্যর্থ")); }
    finally { setDl(null); }
  };

  // Thumbnails for the preview, keyed like the server matches names.
  const thumbs = useMemo(() => {
    const m = new Map<string, string>();
    images.forEach((f) => m.set(imgKey(f.name), URL.createObjectURL(f)));
    return m;
  }, [images]);
  useEffect(() => () => thumbs.forEach((u) => URL.revokeObjectURL(u)), [thumbs]);

  /** One picker for everything: the sheet (CSV/Excel) and the product photos
   * together — multi-select or a whole folder. */
  const pickMany = (list: FileList | File[] | null) => {
    const all = Array.from(list ?? []);
    if (!all.length) return;
    const sheet = all.find((f) => SHEET_RE.test(f.name)) ?? null;
    const imgs = all.filter((f) => IMAGE_RE.test(f.name) || f.type.startsWith("image/"));
    if (sheet) pickFile(sheet);
    else { setPreview(null); setResult(null); }
    if (imgs.length) {
      setImages((cur) => {
        const byKey = new Map(cur.map((f) => [imgKey(f.name), f]));
        imgs.forEach((f) => byKey.set(imgKey(f.name), f));
        return Array.from(byKey.values());
      });
    }
    if (!sheet && !imgs.length) toast("error", "CSV/Excel ফাইল বা ছবি পাওয়া যায়নি");
  };

  const pickFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setResult(null);
    setMapping({});
    setOverrides({});
    setErrorsOnly(false);
  };

  const runValidate = async (useMapping: Record<string, string | null> | null) => {
    if (!file) { toast("error", "আগে একটি ফাইল বাছুন"); return; }
    setValidating(true);
    setResult(null);
    try {
      const r = await importAdminApi.validate(file, useMapping, onExisting, onNew, images.map((f) => f.name), overrides);
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
    setConfirmCommitOpen(true);
  };

  const performCommit = async () => {
    setConfirmCommitOpen(false);
    if (!file || !preview) return;
    setCommitting(true);
    try {
      // 1) Upload the photos used by the rows that will be imported (Cloudinary,
      //    through the normal media upload API), 2) send name → URL with the file.
      const needed = new Set<string>();
      preview.rows.filter((r) => r.action !== "skip" && r.errors.length === 0)
        .forEach((r) => (r.images ?? []).forEach((n) => needed.add(imgKey(n))));
      const toUpload = images.filter((f) => needed.has(imgKey(f.name)));
      const imageMap: Record<string, string> = {};
      let done = 0;
      const failed: string[] = [];
      const queue = [...toUpload];
      const worker = async () => {
        for (let f = queue.shift(); f; f = queue.shift()) {
          try {
            const up = await adminApi.uploadMedia(f, "abo-enterprise/products");
            imageMap[imgKey(f.name)] = up.data.data.url;
          } catch {
            failed.push(f.name);
          }
          done++;
          setProgress(Math.round((done / Math.max(1, toUpload.length)) * 80));
          setUploadNote(`ছবি আপলোড হচ্ছে ${bnNum(done)}/${bnNum(toUpload.length)}…`);
        }
      };
      if (toUpload.length) await Promise.all([worker(), worker(), worker()]);
      if (failed.length) toast("error", `${failed.length}টি ছবি আপলোড হয়নি: ${failed.slice(0, 3).join(", ")}`);
      setProgress(85);
      setUploadNote("পণ্যগুলো সাইটে যোগ হচ্ছে…");
      const r = await importAdminApi.commit(file, mapping, onExisting, onNew, imageMap, overrides);
      setProgress(100);
      setResult(r.data.data);
      toast("success", r.data.message || "ইমপোর্ট সম্পন্ন");
      setPreview(null);
      await loadHistory();
    } catch (e) {
      toast("error", apiErrorMessage(e, "ইমপোর্ট ব্যর্থ"));
    } finally {
      setCommitting(false);
      setUploadNote("");
    }
  };

  const startOver = () => { setProgress(0); pickFile(null); setImages([]); if (fileRef.current) fileRef.current.value = ""; };

  const S = preview?.summary;
  const visibleRows = (preview?.rows ?? []).filter((r) => !errorsOnly || r.errors.length > 0);
  const ext = file ? (file.name.split(".").pop() || "").toLowerCase() : "";

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Add many products"
        titleBn="একসাথে অনেক পণ্য যোগ"
        description="Upload a CSV/Excel file and the product photos to create or update many products at once. Nothing is saved until you press Import."
        descriptionBn="৩ ধাপ: ফাইল/ছবি দিন → দেখে নিন → সাইটে যোগ করুন। শেষ বোতাম না চাপা পর্যন্ত কিছুই সেভ হয় না।"
        actions={
          <Link href="/sumon/products" className="btn btn-outline btn-sm"><ArrowLeft className="w-4 h-4" /> পণ্যে ফিরুন</Link>
        }
      />

      {/* Progress stepper */}
      <div className="admin-card p-4 mb-5">
        <ol className="flex items-center">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <li key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors",
                    done ? "bg-emerald-500 text-white" : active ? "bg-brand-600 text-white shadow-md shadow-brand-500/30" : "bg-gray-100 dark:bg-white/10 text-gray-400"
                  )}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : n}
                  </span>
                  <span className={cn("text-sm font-medium hidden sm:inline", active ? "text-heading" : "text-muted")}>{label}</span>
                </div>
                {n < STEPS.length && (
                  <span className={cn("flex-1 h-0.5 mx-2 sm:mx-3 rounded-full", n < step ? "bg-emerald-400" : "bg-gray-100 dark:bg-white/10")} />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Step 1 — templates + upload */}
      <div className="admin-card p-5 mb-5">
        <p className="text-base font-semibold text-heading mb-3">কীভাবে একসাথে অনেক পণ্য যোগ করবেন?</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <button type="button" onClick={() => setAiOpen(true)} className="text-left rounded-2xl border-2 border-[var(--line)] hover:border-violet-400 p-4 transition-colors">
            <Camera className="w-8 h-8 text-violet-600 mb-2" />
            <span className="block font-semibold text-heading">📸 শুধু ছবি দিয়ে (AI)</span>
            <span className="block text-xs text-muted mt-1">১০টি পর্যন্ত পণ্যের ছবি দিন — AI নাম, বিবরণ লিখবে, আপনি দেখে সেভ করবেন। (AI চালু থাকলে)</span>
          </button>
          <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 p-4">
            <FileSpreadsheet className="w-8 h-8 text-emerald-600 mb-2" />
            <span className="block font-semibold text-heading">📄 Excel দিয়ে</span>
            <span className="block text-xs text-muted mt-1 mb-3">সহজ টেমপ্লেটে শুধু নাম, দাম, ক্রয়মূল্য, ক্যাটাগরি, স্টক ও ছবির নাম লিখুন — বাকিগুলো ঐচ্ছিক।</span>
            <button type="button" onClick={() => download("simple")} disabled={dl !== null} className="btn btn-success btn-sm">
              {dl === "simple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} সহজ Excel টেমপ্লেট নামান
            </button>
          </div>
        </div>

        <p className="text-sm font-semibold text-heading mb-2">Excel ফাইল ও পণ্যের ছবিগুলো একসাথে দিন</p>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); pickMany(e.dataTransfer.files); }}
          className={cn(
            "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200",
            dragActive
              ? "border-brand-500 bg-brand-50/70 dark:bg-brand-900/20 scale-[1.01]"
              : file
                ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/10"
                : "border-[var(--line)] hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-white/[0.03]"
          )}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <span className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                ext === "csv" ? "bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700" : "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700"
              )}>
                {ext === "csv" ? <FileText className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
              </span>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-heading truncate max-w-[220px]">{file.name}</p>
                <p className="text-[11px] text-muted">{(file.size / 1024).toFixed(1)} KB · বদলাতে ক্লিক করুন</p>
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className={cn("w-9 h-9 mx-auto mb-2 transition-colors", dragActive ? "text-brand-600" : "text-brand-400")} />
              <p className="text-sm text-heading font-medium">CSV/Excel ফাইল ও পণ্যের ছবিগুলো একসাথে বাছুন বা টেনে ছাড়ুন</p>
              <p className="text-[11px] text-muted mt-1">.csv / .xlsx + .jpg / .png / .webp · সর্বোচ্চ ২০০০ সারি</p>
            </>
          )}
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm,image/*" multiple hidden onChange={(e) => { pickMany(e.target.files); e.target.value = ""; }} />
        </div>
        <input ref={folderRef} type="file" hidden multiple {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={(e) => { pickMany(e.target.files); e.target.value = ""; }} />
        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
          <button type="button" onClick={() => folderRef.current?.click()} className="btn btn-outline btn-sm"><FolderOpen className="w-4 h-4" /> পুরো ফোল্ডার বাছুন</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-outline btn-sm"><FolderPlus className="w-4 h-4" /> আরও ছবি যোগ করুন</button>
          <span className={cn("inline-flex items-center gap-1", images.length ? "text-emerald-600" : "text-muted")}>
            <ImageIcon className="w-4 h-4" /> {images.length}টি ছবি বাছাই হয়েছে
          </span>
          {images.length > 0 && <button type="button" onClick={() => setImages([])} className="text-xs text-red-600 hover:underline">ছবি মুছুন</button>}
        </div>

        <details className="mt-4 rounded-xl border border-[var(--line)] p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-heading flex items-center gap-1.5"><Wrench className="w-4 h-4" /> উন্নত অপশন (সাধারণত লাগে না)</summary>
          <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => download("csv")} disabled={dl !== null} className="btn btn-outline btn-sm">
              {dl === "csv" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} পূর্ণ টেমপ্লেট (CSV)
            </button>
            <button type="button" onClick={() => download("xlsx")} disabled={dl !== null} className="btn btn-outline btn-sm">
              {dl === "xlsx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} পূর্ণ টেমপ্লেট (Excel)
            </button>
            <button type="button" onClick={() => download("tree")} disabled={dl !== null} className="btn btn-outline btn-sm">
              {dl === "tree" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListTree className="w-4 h-4" />} ক্যাটাগরির তালিকা (CSV)
            </button>
          </div>
          <p className="text-xs text-muted">পূর্ণ টেমপ্লেটে slug, SKU, SEO ইত্যাদি সব কলাম আছে। slug মিললে পুরনো পণ্য আপডেট হয়।</p>
          <div className="flex flex-wrap items-center gap-4">
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
          </div>
          </div>
        </details>
        <div className="flex justify-end mt-4">
          <button type="button" onClick={() => runValidate(null)} disabled={!file || validating} className="btn btn-brand btn-md">
            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} পরের ধাপ: দেখে নিন
          </button>
        </div>
      </div>

      {/* Step 2 — mapping + preview */}
      {preview && (
        <div className="admin-card p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-heading">দেখে নিন — সব ঠিক আছে তো?</p>
            <button type="button" onClick={() => runValidate(mapping)} disabled={validating} className="btn btn-outline btn-sm">
              {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} আবার দেখুন
            </button>
          </div>

          {S && (
            <p className={cn("mb-4 rounded-xl px-4 py-3 text-sm font-medium", S.errors ? "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200" : "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200")}>
              {S.errors === 0 ? "✅" : "⚠️"} {bnNum(S.create)}টি পণ্য যোগ হবে{S.update ? ` · ${bnNum(S.update)}টি আপডেট হবে` : ""} · {bnNum(preview.new_categories?.length ?? 0)}টি নতুন ক্যাটাগরি · {S.errors ? `${bnNum(S.errors)}টি সারিতে সমস্যা — নিচে ঠিক করে "আবার দেখুন" চাপুন, নইলে ওগুলো বাদ যাবে` : "কোনো সমস্যা নেই"}
            </p>
          )}
          {/* Summary tiles */}
          {S && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatTile label="তৈরি হবে" value={S.create} icon={PackagePlus} color="green" />
              <StatTile label="আপডেট হবে" value={S.update} icon={PackageCheck} color="brand" />
              <StatTile label="বাদ যাবে" value={S.skip} icon={SkipForward} color="gray" />
              <StatTile label="এরর" value={S.errors} icon={AlertTriangle} color="red" alert={S.errors > 0} />
            </div>
          )}

          {(preview.new_categories?.length ?? 0) > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-900/10 dark:border-amber-900/40 p-3 text-sm">
              <p className="font-semibold text-heading mb-1">এই নতুন ক্যাটাগরিগুলো তৈরি হবে:</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.new_categories!.map((c) => (
                  <span key={c.slug} className="px-2 py-0.5 rounded-full bg-white dark:bg-white/10 border border-amber-200 dark:border-amber-900/40 text-xs">{c.name_bn} · {c.name_en} <span className="text-muted font-mono">({c.slug})</span></span>
                ))}
              </div>
            </div>
          )}

          {/* Column mapping */}
          <details className="mb-4 rounded-xl border border-[var(--line)] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-heading">উন্নত: কলাম মেলানো ({bnNum(preview.headers.length)}টি কলাম) — সাধারণত বদলাতে হয় না</summary>
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

          {/* Filter */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-heading">প্রিভিউ</p>
            {S && S.errors > 0 && (
              <button
                type="button"
                onClick={() => setErrorsOnly((v) => !v)}
                className={cn("btn btn-sm", errorsOnly ? "btn-brand" : "btn-outline")}
              >
                <Filter className="w-3.5 h-3.5" /> {errorsOnly ? "সব দেখুন" : "শুধু এরর দেখুন"}
              </button>
            )}
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[640px] table-responsive">
              <thead>
                <tr className="text-left text-[11px] uppercase text-gray-400 border-b border-[var(--line)]">
                  <th className="py-2 px-2">সারি</th>
                  <th className="py-2 px-2">ঠিক?</th>
                  <th className="py-2 px-2">ছবি</th>
                  <th className="py-2 px-2">অ্যাকশন</th>
                  <th className="py-2 px-2">নাম</th>
                  <th className="py-2 px-2">দাম</th>
                  <th className="py-2 px-2">ক্যাটাগরি</th>
                  <th className="py-2 px-2">SKU</th>
                  <th className="py-2 px-2">সমস্যা</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.slice(0, 100).map((r) => (
                  <tr key={r.row} className={cn(
                    "border-b border-gray-50 dark:border-white/5 align-top",
                    r.errors.length > 0 ? "bg-red-50/60 dark:bg-red-900/10" : r.warnings.length > 0 ? "bg-amber-50/40 dark:bg-amber-900/10" : ""
                  )}>
                    <td className="py-2 px-2 text-muted" data-label="সারি">{r.row}</td>
                    <td className="py-2 px-2" data-label="ঠিক?">
                      {r.errors.length === 0
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-label="ঠিক আছে" />
                        : <XCircle className="w-5 h-5 text-red-500" aria-label="ভুল আছে" />}
                    </td>
                    <td className="py-2 px-2" data-label="ছবি">
                      <div className="flex gap-1">
                        {(r.images ?? []).slice(0, 3).map((n) => {
                          const src = thumbs.get(imgKey(n));
                          return src
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img key={n} src={src} alt={n} title={n} className="w-9 h-9 rounded-md object-cover border border-[var(--line)]" />
                            : <span key={n} title={`${n} — পাওয়া যায়নি`} className="w-9 h-9 rounded-md border border-dashed border-red-300 text-red-400 flex items-center justify-center text-[10px]">?</span>;
                        })}
                        {(r.images ?? []).length === 0 && <span className="text-xs text-muted">—</span>}
                      </div>
                    </td>
                    <td className="py-2 px-2" data-label="অ্যাকশন"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ACTION_BADGE[r.action]}`}>{r.action === "create" ? "নতুন" : r.action === "update" ? "আপডেট" : "বাদ"}</span></td>
                    <td className="py-2 px-2" data-label="নাম">
                      <p>{r.name_bn || r.name || "—"}</p>
                      {r.name_bn && r.name && <p className="text-[11px] text-muted">{r.name}</p>}
                      <p className="font-mono text-[10px] text-muted">{r.slug}</p>
                    </td>
                    <td className="py-2 px-2 text-xs whitespace-nowrap" data-label="দাম">
                      {r.price != null ? `৳${r.price}` : "—"}
                      {r.cost_price != null && <p className="text-[10px] text-muted">ক্রয় ৳{r.cost_price}</p>}
                    </td>
                    <td className="py-2 px-2 text-xs" data-label="ক্যাটাগরি">
                      {r.category || "—"}
                      {r.new_category && <span className="ml-1 px-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">নতুন</span>}
                    </td>
                    <td className="py-2 px-2 font-mono text-xs" data-label="SKU">{r.sku || "—"}</td>
                    <td className="py-2 px-2 text-xs" data-label="সমস্যা">
                      {r.errors.map((e, i) => <p key={`e${i}`} className="text-red-600 flex items-start gap-1"><XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{e}</p>)}
                      {r.warnings.map((w, i) => <p key={`w${i}`} className="text-amber-600 flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />{w}</p>)}
                      {r.errors.length === 0 && r.warnings.length === 0 && <span className="text-emerald-500">✓</span>}
                      {r.errors.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <input aria-label="দাম ঠিক করুন" type="number" placeholder="দাম ৳" defaultValue={overrides[r.row]?.price ?? ""} onChange={(e) => fix(r.row, "price", e.target.value)} className="input !py-1 !px-2 w-20 text-xs" />
                          <input aria-label="ক্যাটাগরি ঠিক করুন" list="import-cats" placeholder="ক্যাটাগরি" defaultValue={overrides[r.row]?.category ?? ""} onChange={(e) => fix(r.row, "category", e.target.value)} className="input !py-1 !px-2 w-28 text-xs" />
                          <input aria-label="নাম ঠিক করুন" placeholder="নাম" defaultValue={overrides[r.row]?.name_bn ?? ""} onChange={(e) => fix(r.row, "name_bn", e.target.value)} className="input !py-1 !px-2 w-28 text-xs" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleRows.length > 100 && <p className="text-[11px] text-muted mt-2">প্রথম ১০০টি সারি দেখানো হচ্ছে (মোট {visibleRows.length})।</p>}
            {visibleRows.length === 0 && <p className="text-sm text-muted py-6 text-center">এই ফিল্টারে কোনো সারি নেই।</p>}
            <datalist id="import-cats">{catOpts.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}</datalist>
          </div>

          <div className="flex items-center justify-end gap-2 flex-wrap mt-4 pt-4 border-t border-[var(--line)]">
            {committing && (
              <div className="mr-auto flex-1 min-w-[180px]">
                <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div>
                <span className="text-xs text-muted">{uploadNote}</span>
              </div>
            )}
            <button type="button" onClick={commit} disabled={committing || (S ? S.create + S.update === 0 : true)} className="btn btn-success btn-md">
              {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {S ? `সাইটে যোগ করুন (${bnNum(S.create + S.update)}টি)` : "সাইটে যোগ করুন"}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="admin-card p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-bold text-heading flex items-center gap-2"><CheckCircle2 className="w-6 h-6 text-emerald-500" /> হয়ে গেছে! {bnNum(result.created)}টি নতুন পণ্য যোগ হয়েছে{result.updated ? `, ${bnNum(result.updated)}টি আপডেট` : ""}।</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Link href="/sumon/products" className="btn btn-brand btn-md"><PackageCheck className="w-4 h-4" /> পণ্যগুলো দেখুন</Link>
            <button type="button" onClick={startOver} className="btn btn-outline btn-md"><UploadCloud className="w-4 h-4" /> আরেকটি ফাইল দিন</button>
          </div>
          {(result.categories_created ?? 0) > 0 && (
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">{result.categories_created}টি নতুন ক্যাটাগরি তৈরি হয়েছে।</p>
          )}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatTile label="তৈরি হয়েছে" value={result.created} icon={PackagePlus} color="green" />
            <StatTile label="আপডেট হয়েছে" value={result.updated} icon={PackageCheck} color="brand" />
            <StatTile label="বাদ পড়েছে" value={result.skipped} icon={SkipForward} color="gray" />
          </div>
          {result.errors.length > 0 && (
            <details open className="rounded-xl border border-red-100 dark:border-red-900/30 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-red-600">সমস্যা / সতর্কতা ({result.errors.length})</summary>
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
      <div className="admin-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> ইমপোর্ট হিস্টরি</p>
          <button type="button" onClick={loadHistory} className="btn btn-ghost btn-sm"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted">এখনো কোনো ইমপোর্ট হয়নি।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px] table-responsive">
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
                    <td className="py-2 px-2 text-xs text-muted" data-label="তারিখ">{j.created_at ? new Date(j.created_at).toLocaleString() : "—"}</td>
                    <td className="py-2 px-2 text-xs truncate max-w-[160px]" data-label="ফাইল" title={j.filename ?? ""}>{j.filename || "—"}</td>
                    <td className="py-2 px-2 text-emerald-600 font-semibold" data-label="তৈরি">{j.created}</td>
                    <td className="py-2 px-2 text-brand-600 font-semibold" data-label="আপডেট">{j.updated}</td>
                    <td className="py-2 px-2 text-muted" data-label="বাদ">{j.skipped}</td>
                    <td className="py-2 px-2 text-red-600" data-label="এরর">{j.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AiPhotoProductsModal open={aiOpen} onClose={() => setAiOpen(false)} categoryOptions={catOpts} onSaved={() => toast("success", "পণ্য যোগ হয়েছে — পণ্যের তালিকায় দেখুন")} />

      <ConfirmDialog
        open={confirmCommitOpen}
        title="এখন ইমপোর্ট করবেন?"
        message={S ? `${S.create}টি নতুন পণ্য তৈরি ও ${S.update}টি পুরনো পণ্য আপডেট হবে${(preview?.new_categories?.length ?? 0) ? `, ${preview!.new_categories!.length}টি নতুন ক্যাটাগরি তৈরি হবে` : ""}। ছবি আপলোডে কিছু সময় লাগতে পারে। ভুল সারিগুলো বাদ যাবে।` : undefined}
        confirmLabel="ইমপোর্ট করুন"
        variant="warning"
        onConfirm={performCommit}
        onCancel={() => setConfirmCommitOpen(false)}
      />
    </div>
  );
}

const TILE: Record<string, { bg: string; icon: string; value: string; ring: string }> = {
  green: { bg: "bg-gradient-to-br from-green-50 to-emerald-100/60 dark:from-emerald-900/20 dark:to-emerald-900/5", icon: "text-green-600 dark:text-emerald-400", value: "text-green-700 dark:text-emerald-300", ring: "border-green-100 dark:border-emerald-900/40" },
  brand: { bg: "bg-gradient-to-br from-brand-50 to-brand-100/60 dark:from-brand-900/20 dark:to-brand-900/5", icon: "text-brand-600 dark:text-brand-300", value: "text-brand-700 dark:text-brand-200", ring: "border-brand-100 dark:border-brand-900/40" },
  gray: { bg: "bg-gradient-to-br from-gray-50 to-gray-100/60 dark:from-white/10 dark:to-white/5", icon: "text-gray-500", value: "text-gray-600 dark:text-gray-300", ring: "border-gray-100 dark:border-white/10" },
  red: { bg: "bg-gradient-to-br from-red-50 to-rose-100/60 dark:from-red-900/20 dark:to-red-900/5", icon: "text-red-600 dark:text-red-400", value: "text-red-700 dark:text-red-300", ring: "border-red-100 dark:border-red-900/40" },
};

function StatTile({ label, value, icon: Icon, color, alert }: { label: string; value: number; icon: LucideIcon; color: "green" | "brand" | "gray" | "red"; alert?: boolean }) {
  const c = TILE[color];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border p-4", c.bg, c.ring)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cn("text-3xl font-extrabold tracking-tight", c.value)}>{value}</p>
          <p className="text-[11px] text-muted mt-0.5 font-medium">{label}</p>
        </div>
        <span className={cn("w-9 h-9 rounded-xl bg-white/70 dark:bg-white/5 flex items-center justify-center flex-shrink-0", c.icon)}>
          <Icon className="w-5 h-5" />
          {alert && <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
        </span>
      </div>
    </div>
  );
}
