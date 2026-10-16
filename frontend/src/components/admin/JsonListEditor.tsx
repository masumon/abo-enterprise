"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import type { UploadPurpose } from "@/lib/uploadGuides";
import LivePreview from "@/components/admin/LivePreview";
import TranslateButton from "@/components/admin/TranslateButton";
import AiFillPanel from "@/components/admin/catalog/AiFillPanel";
import AiTextMenu from "@/components/admin/catalog/AiTextMenu";
import { aiCatalogApi, type AiFillField } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { useToastStore } from "@/store/toast";
import { useLanguageStore } from "@/store/language";
import { ADMIN_ICON_OPTIONS, ADMIN_EMOJI_OPTIONS, AdminIcon } from "@/lib/adminIcons";

export interface JsonListField {
  path: string; // dotted path, e.g. "role.en"
  label: string;
  labelBn?: string;
  type?: "text" | "number" | "textarea" | "image" | "icon";
  placeholder?: string;
  hint?: string;
  /** When set, this English field shows a "→ English" button that translates
   * the sibling Bangla field at this dotted path (e.g. "title_bn"). */
  translateFrom?: string;
  /** For type "image": which Bangla upload guide to show (lib/uploadGuides.ts). */
  purpose?: UploadPurpose;
}

/** Visual icon + emoji picker so a non-technical admin never types a name. */
function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 p-2 space-y-2 bg-white dark:bg-white/5">
      <div className="flex flex-wrap gap-1.5">
        {ADMIN_ICON_OPTIONS.map(({ name, Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            title={name}
            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition ${value === name ? "bg-brand-600 text-white border-transparent" : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-brand-300"}`}
          >
            <Icon className="w-4 h-4" aria-hidden />
          </button>
        ))}
        {ADMIN_EMOJI_OPTIONS.map((emo) => (
          <button
            key={emo}
            type="button"
            onClick={() => onChange(emo)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg border transition ${value === emo ? "bg-brand-600 border-transparent ring-2 ring-brand-300" : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-brand-300"}`}
          >
            {emo}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center flex-shrink-0">
          <AdminIcon name={value} className="w-4 h-4" />
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="🎁 বা একটি নাম"
          className="flex-1 px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>
    </div>
  );
}

interface Props {
  value: string; // JSON string of an array of objects (or an object map — see mapKey)
  onChange: (json: string) => void;
  fields: JsonListField[];
  /** Template for a new row. */
  newItem: () => Record<string, unknown>;
  /** When set, the value is an object map ({KEY: {...}}) edited as rows; this
   * field holds the map key on each row and is written back as the object key. */
  mapKey?: string;
  /** Optional "as it appears on the website" preview rendered under each row. */
  previewRow?: (item: Record<string, unknown>) => React.ReactNode;
  /** What this list is on the website, e.g. "homepage FAQ" — enables ✨ AI help. */
  aiContext?: string;
  /** Ready-made ideas for the AI box (tap to use). */
  aiPresets?: string[];
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}
function setPath(obj: Record<string, unknown>, path: string, val: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const next = { ...obj };
  let cur: Record<string, unknown> = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = { ...(typeof cur[k] === "object" && cur[k] ? (cur[k] as Record<string, unknown>) : {}) };
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = val;
  return next;
}

/**
 * Friendly row-based editor over a JSON-array setting. Unknown keys on each
 * object are preserved (spread), so editing never corrupts fields the form
 * doesn't show. If the stored value isn't a valid array, it falls back to a
 * raw textarea so nothing is lost.
 */
export default function JsonListEditor({ value, onChange, fields, newItem, mapKey, previewRow, aiContext, aiPresets }: Props) {
  const { lang } = useLanguageStore();
  const toast = useToastStore((s) => s.push);
  const [fillingRow, setFillingRow] = useState<number | null>(null);
  // Text-like fields the AI can write (images and links stay with the admin).
  const aiFields: AiFillField[] = fields
    .filter((f) => f.type !== "image" && !/(^|\.|_)(href|url|link|image|website|facebook)$/i.test(f.path))
    .map((f) => ({ key: f.path, label: f.labelBn ?? f.label, hint: f.hint, type: f.type === "icon" ? "icon" : f.type === "number" ? "number" : f.type === "textarea" ? "textarea" : "text" }));
  const context = aiContext ?? `website list: ${fields.map((f) => f.label).join(", ")}`;
  const parsed = useMemo(() => {
    try {
      const v = JSON.parse(value || (mapKey ? "{}" : "[]"));
      if (mapKey) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          return Object.entries(v as Record<string, unknown>).map(([k, val]) => ({
            [mapKey]: k,
            ...(val && typeof val === "object" ? (val as Record<string, unknown>) : {}),
          }));
        }
        return null;
      }
      return Array.isArray(v) ? (v as Record<string, unknown>[]) : null;
    } catch {
      return null;
    }
  }, [value, mapKey]);

  if (parsed === null) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs text-amber-700">
          <AlertTriangle className="w-3.5 h-3.5" /> Data isn&apos;t a valid list — edit the raw JSON below.
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm font-mono bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-100 resize-y"
        />
      </div>
    );
  }

  const commit = (next: Record<string, unknown>[]) => {
    if (mapKey) {
      const obj: Record<string, unknown> = {};
      for (const row of next) {
        const { [mapKey]: k, ...rest } = row;
        if (k != null && String(k).trim()) obj[String(k).trim()] = rest;
      }
      onChange(JSON.stringify(obj, null, 2));
      return;
    }
    onChange(JSON.stringify(next, null, 2));
  };
  const update = (i: number, path: string, val: unknown) =>
    commit(parsed.map((it, idx) => (idx === i ? setPath(it, path, val) : it)));
  const remove = (i: number) => commit(parsed.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= parsed.length) return;
    const next = [...parsed];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const firstText = (it: Record<string, unknown>) => { const f = aiFields.find((x) => x.type !== "icon"); const v = f ? getPath(it, f.key) : ""; return v == null ? "" : String(v); };
  const addAi = (items: Record<string, string | number>[]) =>
    commit([...parsed, ...items.map((d) => Object.entries(d).reduce<Record<string, unknown>>((acc, [k, v]) => setPath(acc, k, v), newItem()))]);
  // Fill only the EMPTY text fields of one row from what is already written there.
  const fillRow = async (i: number) => {
    const it = parsed[i];
    const existing: Record<string, string> = {};
    const empty: AiFillField[] = [];
    for (const f of aiFields) { const v = getPath(it, f.key); if (v == null || String(v).trim() === "") empty.push(f); else existing[f.key] = String(v); }
    if (!empty.length) { toast("info", "এই সারির সব ঘর আগেই পূরণ করা"); return; }
    if (!Object.keys(existing).length) { toast("error", "আগে অন্তত একটি ঘর লিখুন — বাকিগুলো AI পূরণ করবে"); return; }
    setFillingRow(i);
    try {
      const r = await aiCatalogApi.fill({ context, fields: empty, existing, count: 1 });
      const d = r.data.data?.items?.[0] ?? {};
      let next = it;
      for (const f of empty) if (d[f.key] !== undefined && String(d[f.key]).trim()) next = setPath(next, f.key, d[f.key]);
      commit(parsed.map((x, idx) => (idx === i ? next : x)));
      toast("success", "খালি ঘরগুলো AI পূরণ করেছে — দেখে নিন");
    } catch (e) {
      toast("error", apiErrorMessage(e, "AI কাজ করেনি — AI সেটিংসে কী দেওয়া আছে কিনা দেখুন"));
    } finally {
      setFillingRow(null);
    }
  };

  return (
    <div className="space-y-3">
      {aiFields.length > 0 && !mapKey && (
        <AiFillPanel multi context={context} fields={aiFields} onAdd={addAi} presets={aiPresets} avoid={parsed.map(firstText)} />
      )}
      {parsed.map((item, i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2 bg-white dark:bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400">#{i + 1}</span>
            <div className="flex items-center gap-1">
              {aiFields.length > 0 && (
                <button type="button" onClick={() => void fillRow(i)} disabled={fillingRow !== null} title="খালি ঘরগুলো AI দিয়ে পূরণ" aria-label="খালি ঘরগুলো AI দিয়ে পূরণ"
                  className="h-7 px-2 rounded-lg text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 inline-flex items-center gap-1">
                  {fillingRow === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Sparkles className="w-3.5 h-3.5" aria-hidden />} খালি ঘর পূরণ
                </button>
              )}
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30" aria-label="উপরে নিন"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === parsed.length - 1} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30" aria-label="নিচে নিন"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => remove(i)} className="w-7 h-7 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center" aria-label="মুছুন"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {fields.map((f) => {
              const raw = getPath(item, f.path);
              const val = raw == null ? "" : String(raw);
              return (
                <label key={f.path} className={`block ${f.type === "image" || f.type === "textarea" || f.type === "icon" ? "sm:col-span-2" : ""}`}>
                  <span className="flex items-center justify-between gap-2 text-[11px] text-gray-500 mb-0.5">
                    <span>{lang === "bn" && f.labelBn ? f.labelBn : f.label}{f.hint ? <em className="text-gray-400 not-italic"> · {f.hint}</em> : null}</span>
                    {(() => {
                      const from = f.translateFrom ?? (f.path === "en" && fields.some((x) => x.path === "bn") ? "bn" : f.path.endsWith("_en") && fields.some((x) => x.path === f.path.replace(/_en$/, "_bn")) ? f.path.replace(/_en$/, "_bn") : undefined);
                      if (!from) return null;
                      const g = (path: string) => { const s = getPath(item, path); return s == null ? "" : String(s); };
                      return <TranslateButton bn={g(from)} onResult={(en) => update(i, f.path, en)} en={g(f.path)} onResultBn={(b) => update(i, from, b)} />;
                    })()}
                    {(f.type === undefined || f.type === "text" || f.type === "textarea") && aiFields.some((x) => x.key === f.path) && (
                      <AiTextMenu compact text={val} onApply={(v) => update(i, f.path, v)} context={`${context} — ${f.labelBn ?? f.label}`} />
                    )}
                  </span>
                  {f.type === "icon" ? (
                    <IconPicker value={val} onChange={(v) => update(i, f.path, v)} />
                  ) : f.type === "image" ? (
                    <ImageUpload value={val} onChange={(url) => update(i, f.path, url)} folder="abo-enterprise/settings" accept="image" purpose={f.purpose} />
                  ) : f.type === "textarea" ? (
                    <textarea value={val} onChange={(e) => update(i, f.path, e.target.value)} rows={2} placeholder={f.placeholder} className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-white/5 resize-y focus:outline-none focus:ring-2 focus:ring-brand-100" />
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={val}
                      onChange={(e) => update(i, f.path, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  )}
                </label>
              );
            })}
          </div>
          {previewRow && (
            <div className="mt-2">
              <LivePreview showDevice={false}>
                <div className="pointer-events-none">{previewRow(item)}</div>
              </LivePreview>
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={() => commit([...parsed, newItem()])} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
        <Plus className="w-4 h-4" /> যোগ করুন
      </button>
    </div>
  );
}
