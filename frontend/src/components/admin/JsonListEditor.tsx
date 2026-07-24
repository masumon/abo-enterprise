"use client";

import { useMemo } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import LivePreview from "@/components/admin/LivePreview";

export interface JsonListField {
  path: string; // dotted path, e.g. "role.en"
  label: string;
  type?: "text" | "number" | "textarea" | "image" | "icon";
  placeholder?: string;
  hint?: string;
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
export default function JsonListEditor({ value, onChange, fields, newItem, mapKey, previewRow }: Props) {
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

  return (
    <div className="space-y-3">
      {parsed.map((item, i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2 bg-white dark:bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400">#{i + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === parsed.length - 1} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => remove(i)} className="w-7 h-7 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {fields.map((f) => {
              const raw = getPath(item, f.path);
              const val = raw == null ? "" : String(raw);
              return (
                <label key={f.path} className={`block ${f.type === "image" || f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                  <span className="block text-[11px] text-gray-500 mb-0.5">{f.label}{f.hint ? <em className="text-gray-400 not-italic"> · {f.hint}</em> : null}</span>
                  {f.type === "image" ? (
                    <ImageUpload value={val} onChange={(url) => update(i, f.path, url)} folder="abo-enterprise/settings" accept="image" />
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
        <Plus className="w-4 h-4" /> Add
      </button>
    </div>
  );
}
