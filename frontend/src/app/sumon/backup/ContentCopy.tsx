"use client";

import { useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import api, { downloadCsv } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";

/** Small content-only copy (settings + products + services as JSON) and a
 * settings restore with a dry-run preview. Moved here from Analytics →
 * Operations so every backup tool lives in one module. */
export default function ContentCopy() {
  const toast = useToastStore((s) => s.push);
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<{ update_count: number; create_count: number; payload: unknown } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportContent = async () => {
    setExporting(true);
    try {
      await downloadCsv("/api/v1/admin/ops/backup/export", `abo-content-backup-${new Date().toISOString().slice(0, 10)}.json`);
      toast("success", "কনটেন্ট কপি ডাউনলোড হয়েছে");
    } catch (e) {
      toast("error", apiErrorMessage(e, "ডাউনলোড করা যায়নি"));
    } finally {
      setExporting(false);
    }
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const r = await api.post("/api/v1/admin/ops/backup/restore-settings?dry_run=true", payload);
      setPreview({ ...r.data.data, payload });
    } catch (err) {
      toast("error", apiErrorMessage(err, "ফাইলটি সঠিক কনটেন্ট কপি নয়"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmRestore = async () => {
    if (!preview) return;
    setRestoring(true);
    try {
      const r = await api.post("/api/v1/admin/ops/backup/restore-settings?dry_run=false", preview.payload);
      toast("success", `ফেরত আনা হয়েছে: ${r.data.data.update_count} বদল, ${r.data.data.create_count} নতুন`);
      setPreview(null);
    } catch (e) {
      toast("error", apiErrorMessage(e, "ফেরত আনা যায়নি"));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <section id="backup-content" className="card p-4 sm:p-5 space-y-3 scroll-mt-24 transition">
      <div>
        <h2 className="font-semibold text-gray-900">ছোট কপি — শুধু কনটেন্ট</h2>
        <p className="text-xs text-gray-600">সেটিংস, পণ্য ও সেবা একটি JSON ফাইলে। অর্ডার/কাস্টমার এতে নেই — পূর্ণ backup-এর জন্য উপরের ধাপগুলো ব্যবহার করুন।</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-gray-100 p-4 space-y-2">
          <p className="font-semibold text-gray-800 flex items-center gap-1.5"><Download className="w-4 h-4" aria-hidden /> কনটেন্ট ডাউনলোড</p>
          <p className="text-xs text-gray-600">কম্পিউটারে একটি ফাইল নামবে।</p>
          <button type="button" onClick={exportContent} disabled={exporting} className="btn btn-outline btn-sm min-h-11 px-5 whitespace-nowrap gap-1.5">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Download className="w-4 h-4" aria-hidden />} ডাউনলোড করুন
          </button>
        </div>
        <div className="rounded-xl border border-gray-100 p-4 space-y-2">
          <p className="font-semibold text-gray-800 flex items-center gap-1.5"><Upload className="w-4 h-4" aria-hidden /> সেটিংস ফেরত আনুন</p>
          <p className="text-xs text-gray-600">আগে প্রিভিউ দেখাবে — কিছুই মুছে যায় না।</p>
          {!preview ? (
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-outline btn-sm min-h-11 px-5 whitespace-nowrap gap-1.5">
              <Upload className="w-4 h-4" aria-hidden /> ফাইল বাছুন
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                প্রিভিউ: <strong>{preview.update_count}</strong>টি সেটিং বদলাবে, <strong>{preview.create_count}</strong>টি নতুন হবে
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={confirmRestore} disabled={restoring} className="btn btn-primary btn-sm min-h-11 px-5 whitespace-nowrap gap-1.5">
                  {restoring && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} হ্যাঁ, ফেরত আনুন
                </button>
                <button type="button" onClick={() => setPreview(null)} className="btn btn-outline btn-sm min-h-11 px-5">বাতিল</button>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={pickFile} />
        </div>
      </div>
    </section>
  );
}
