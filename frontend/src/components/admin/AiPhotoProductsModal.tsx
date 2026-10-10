"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, Sparkles, Trash2, X, Save, CheckCircle2, ImagePlus, AlertTriangle } from "lucide-react";
import { ADMIN_MODAL_BACKDROP_STYLE, ADMIN_MODAL_PANEL_STYLE } from "@/lib/adminModalStyles";
import { adminApi, aiCatalogApi, productsApi, type AiProductDraft } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { downscaleImage } from "@/lib/useAiAvailable";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

export interface CategoryOption { slug: string; label: string; id?: string }

interface Props {
  open: boolean;
  onClose: () => void;
  categoryOptions: CategoryOption[];
  /** Called after at least one product was saved. */
  onSaved: () => void;
}

type Row = AiProductDraft & { key: string; include: boolean; specsText: string; status?: "saved" | "error"; error?: string };

const MAX = 10;
const MARGINS = [
  { v: "", label: "দাম বসাবেন না (নিজে দেবেন)" },
  { v: "20", label: "ক্রয়মূল্য + ২০%" },
  { v: "30", label: "ক্রয়মূল্য + ৩০%" },
  { v: "40", label: "ক্রয়মূল্য + ৪০%" },
  { v: "50", label: "ক্রয়মূল্য + ৫০%" },
];

const specsToText = (s: Record<string, string>) => Object.entries(s).map(([k, v]) => `${k}: ${v}`).join("; ");
const textToSpecs = (t: string) =>
  Object.fromEntries(
    t.split(/[;\n]+/).map((p) => p.trim()).filter(Boolean).map((p) => {
      const i = p.indexOf(":");
      return i > 0 ? [p.slice(0, i).trim(), p.slice(i + 1).trim()] : [p, ""];
    }),
  );

/** "ছবি থেকে পণ্য (AI)": photos → AI drafts → admin reviews/edits → save. */
export default function AiPhotoProductsModal({ open, onClose, categoryOptions, onSaved }: Props) {
  const toast = useToastStore((s) => s.push);
  const panelRef = useFocusTrap(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [margin, setMargin] = useState("30");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState<"" | "ai" | "save">("");
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState("");

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  if (!open) return null;

  const addFiles = async (list: FileList | null) => {
    const picked = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (!picked.length) return;
    const small = await Promise.all(picked.map((f) => downscaleImage(f)));
    setFiles((cur) => {
      const next = [...cur, ...small].slice(0, MAX);
      if (cur.length + small.length > MAX) toast("error", `একবারে সর্বোচ্চ ${MAX}টি ছবি`);
      return next;
    });
    setRows([]);
  };

  const runAi = async () => {
    if (!files.length) { toast("error", "আগে পণ্যের ছবি বাছুন"); return; }
    setBusy("ai");
    try {
      const r = await aiCatalogApi.productsFromPhotos(files, margin === "" ? null : Number(margin), hint.trim());
      const drafts = r.data.data?.drafts ?? [];
      setRows(drafts.map((d, i) => ({
        ...d,
        image_indexes: d.image_indexes.length ? d.image_indexes : files.map((_, j) => j),
        key: `${Date.now()}-${i}`,
        include: true,
        specsText: specsToText(d.specifications || {}),
      })));
      if (!drafts.length) toast("error", "ছবি থেকে কোনো পণ্য পাওয়া যায়নি");
    } catch (e) {
      toast("error", apiErrorMessage(e, "AI এখন কাজ করছে না — একটু পরে চেষ্টা করুন"));
    } finally {
      setBusy("");
    }
  };

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const save = async (active: boolean) => {
    const chosen = rows.filter((r) => r.include && r.status !== "saved");
    if (!chosen.length) { toast("error", "কোনো পণ্য বাছাই করা নেই"); return; }
    for (const r of chosen) {
      if (!r.name_bn.trim() || !r.name_en.trim()) { toast("error", "প্রতিটি পণ্যের বাংলা ও ইংরেজি নাম দিন"); return; }
      if (!r.category) { toast("error", `"${r.name_bn || r.name_en}" — ক্যাটাগরি বাছুন`); return; }
      if (active && !(Number(r.price) > 0)) { toast("error", `"${r.name_bn || r.name_en}" — সক্রিয় করতে বিক্রয়মূল্য দিন`); return; }
    }
    setBusy("save");
    const uploaded = new Map<number, string>();
    let ok = 0;
    for (const [n, r] of chosen.entries()) {
      setProgress(`${n + 1}/${chosen.length} সেভ হচ্ছে…`);
      try {
        const urls: string[] = [];
        for (const idx of r.image_indexes) {
          if (!files[idx]) continue;
          if (!uploaded.has(idx)) {
            const up = await adminApi.uploadMedia(files[idx], "abo-enterprise/products");
            uploaded.set(idx, up.data.data.url);
          }
          urls.push(uploaded.get(idx)!);
        }
        const base = (r.slug || r.name_en).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
        const payload: Partial<Product> = {
          name_bn: r.name_bn.trim(),
          name_en: r.name_en.trim(),
          brand: r.brand || undefined,
          category: r.category,
          description_bn: r.description_bn,
          description_en: r.description_en,
          specifications: textToSpecs(r.specsText),
          price: Number(r.price) > 0 ? Number(r.price) : 0,
          cost_price: Number(r.cost_price) > 0 ? Number(r.cost_price) : undefined,
          image_url: urls[0] ?? "",
          images: urls.slice(1),
          stock_quantity: 0,
          is_active: active,
          is_featured: false,
        } as Partial<Product>;
        let created;
        try {
          created = await productsApi.create({ ...payload, slug: base });
        } catch {
          // Slug taken → retry once with a short unique suffix.
          created = await productsApi.create({ ...payload, slug: `${base}-${Date.now().toString(36).slice(-4)}` });
        }
        const catId = categoryOptions.find((c) => c.slug === r.category)?.id;
        const pid = created.data.data?.id;
        if (catId && pid) await productsApi.update(pid, { category_id: catId } as Partial<Product>).catch(() => undefined);
        patch(r.key, { status: "saved", error: undefined });
        ok++;
      } catch (e) {
        patch(r.key, { status: "error", error: apiErrorMessage(e, "সেভ হয়নি") });
      }
    }
    setBusy("");
    setProgress("");
    if (ok) {
      toast("success", `${ok}টি পণ্য ${active ? "সক্রিয় করে" : "খসড়া হিসেবে"} সেভ হয়েছে`);
      onSaved();
    }
  };

  const reset = () => { setFiles([]); setRows([]); setHint(""); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={ADMIN_MODAL_BACKDROP_STYLE}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="ছবি থেকে পণ্য (AI)"
        className="rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col dark:!bg-[#151a2e]" style={ADMIN_MODAL_PANEL_STYLE}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--line)]">
          <div>
            <h2 className="text-lg font-semibold text-heading flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-600" /> ছবি থেকে পণ্য (AI)</h2>
            <p className="text-xs text-muted">পণ্যের/বক্সের ছবি দিন → AI খসড়া লিখবে → আপনি দেখে ঠিক করে সেভ করবেন।</p>
          </div>
          <button type="button" onClick={onClose} aria-label="বন্ধ করুন" className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
          {/* Step 1: photos */}
          <section>
            <p className="text-sm font-semibold text-heading mb-1">১. ছবি বাছুন <span className="font-normal text-muted">(১–{MAX}টি; বক্সের লেখা পরিষ্কার দেখা গেলে ভালো হয়)</span></p>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--line)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`ছবি ${i + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 left-0 text-[10px] bg-black/60 text-white px-1 rounded-tr">{i + 1}</span>
                  <button type="button" aria-label="ছবি সরান" onClick={() => { setFiles((f) => f.filter((_, j) => j !== i)); setRows([]); }}
                    className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-0.5 text-red-600"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {files.length < MAX && (
                <button type="button" onClick={() => inputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-[var(--line)] flex flex-col items-center justify-center text-xs text-muted hover:border-brand-400">
                  <ImagePlus className="w-5 h-5 mb-1" /> ছবি যোগ
                </button>
              )}
              <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </div>
          </section>

          {/* Step 2: options */}
          <section className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-semibold text-heading">২. দাম কীভাবে বসবে?</span>
              <select value={margin} onChange={(e) => setMargin(e.target.value)} className="input mt-1">
                {MARGINS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
              <span className="block text-[11px] text-muted mt-1">AI কখনো বিক্রয়মূল্য বানায় না। ছবিতে ক্রয়মূল্য লেখা থাকলে শুধু এই হারে দাম প্রস্তাব করা হবে।</span>
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-heading">নোট (ঐচ্ছিক)</span>
              <input value={hint} onChange={(e) => setHint(e.target.value)} maxLength={300} className="input mt-1" placeholder="যেমন: সব ছবি একই চার্জারের" />
            </label>
          </section>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={runAi} disabled={busy !== "" || !files.length} className="btn btn-brand btn-md gap-1.5">
              {busy === "ai" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {busy === "ai" ? "AI ছবি দেখছে… (৩০–৬০ সেকেন্ড)" : "AI দিয়ে খসড়া তৈরি করুন"}
            </button>
            {(files.length > 0 || rows.length > 0) && <button type="button" onClick={reset} disabled={busy !== ""} className="btn btn-outline btn-md">নতুন করে শুরু</button>}
          </div>

          {/* Step 3: review */}
          {rows.length > 0 && (
            <section className="space-y-3">
              <p className="text-sm font-semibold text-heading">৩. খসড়া দেখে ঠিক করুন <span className="font-normal text-muted">— AI ভুল করতে পারে, সব ঘর মিলিয়ে নিন</span></p>
              {rows.map((r) => (
                <div key={r.key} className={cn("rounded-xl border p-3 space-y-2",
                  r.status === "saved" ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/10" : r.status === "error" ? "border-red-300" : "border-[var(--line)]")}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={r.include} disabled={r.status === "saved"} onChange={(e) => patch(r.key, { include: e.target.checked })} className="mt-1 rounded" aria-label="এই পণ্য সেভ করুন" />
                    <div className="flex gap-1 flex-wrap">
                      {r.image_indexes.map((i) => previews[i] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={previews[i]} alt="" className="w-12 h-12 rounded-lg object-cover border border-[var(--line)]" />
                      ))}
                    </div>
                    {r.status === "saved" && <span className="ml-auto text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> সেভ হয়েছে</span>}
                    {r.status !== "saved" && (
                      <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="ml-auto p-1 text-gray-400 hover:text-red-600" aria-label="খসড়া বাদ দিন"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                  {r.error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {r.error}</p>}
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Field label="বাংলা নাম *"><input value={r.name_bn} onChange={(e) => patch(r.key, { name_bn: e.target.value })} className="input text-sm" /></Field>
                    <Field label="ইংরেজি নাম *"><input value={r.name_en} onChange={(e) => patch(r.key, { name_en: e.target.value })} className="input text-sm" /></Field>
                    <Field label="ব্র্যান্ড"><input value={r.brand} onChange={(e) => patch(r.key, { brand: e.target.value })} className="input text-sm" /></Field>
                    <Field label="ক্যাটাগরি *">
                      <select value={r.category} onChange={(e) => patch(r.key, { category: e.target.value })} className={cn("input text-sm", !r.category && "border-amber-400")}>
                        <option value="">— বাছুন —</option>
                        {categoryOptions.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                      </select>
                    </Field>
                    <Field label="ক্রয়মূল্য ৳ (শুধু আপনি দেখবেন)"><input type="number" min={0} value={r.cost_price ?? ""} onChange={(e) => patch(r.key, { cost_price: e.target.value === "" ? null : Number(e.target.value) })} className="input text-sm" /></Field>
                    <Field label="বিক্রয়মূল্য ৳ (সক্রিয় করতে আবশ্যক)">
                      <input type="number" min={0} value={r.price ?? ""} onChange={(e) => patch(r.key, { price: e.target.value === "" ? null : Number(e.target.value) })} className="input text-sm" />
                      {Number(r.price) > 0 && Number(r.cost_price) > 0 && (
                        <span className="block text-[11px] text-emerald-600 mt-0.5">লাভ ৳{Math.round(Number(r.price) - Number(r.cost_price))}</span>
                      )}
                    </Field>
                    <Field label="বিবরণ (বাংলা)"><textarea rows={4} value={r.description_bn} onChange={(e) => patch(r.key, { description_bn: e.target.value })} className="input text-sm resize-y" /></Field>
                    <Field label="বিবরণ (English)"><textarea rows={4} value={r.description_en} onChange={(e) => patch(r.key, { description_en: e.target.value })} className="input text-sm resize-y" /></Field>
                  </div>
                  <Field label="স্পেসিফিকেশন (যেমন Output: 33W; Port: USB-A)"><input value={r.specsText} onChange={(e) => patch(r.key, { specsText: e.target.value })} className="input text-sm" /></Field>
                  {r.notes && <p className="text-[11px] text-amber-700 dark:text-amber-300">AI-এর নোট: {r.notes}</p>}
                </div>
              ))}
            </section>
          )}
        </div>

        {rows.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-[var(--line)] flex flex-wrap items-center justify-end gap-2">
            {progress && <span className="text-xs text-muted mr-auto">{progress}</span>}
            <button type="button" onClick={() => save(false)} disabled={busy !== ""} className="btn btn-outline btn-md gap-1.5">
              {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} খসড়া হিসেবে সেভ (লুকানো)
            </button>
            <button type="button" onClick={() => save(true)} disabled={busy !== ""} className="btn btn-brand btn-md gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> সক্রিয় করে সেভ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-0.5">{label}</span>
      {children}
    </label>
  );
}
