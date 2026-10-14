"use client";

import { useRef, useState } from "react";
import {
  Bold, Eye, Highlighter, Image as ImageIcon, Italic, Link2, List, ListOrdered, Minus, Pencil, Quote, Smile,
  Sparkles, AlignCenter, Heading, Palette, Type,
} from "lucide-react";
import RichText, { ICONS } from "@/components/ui/RichText";
import MediaLibraryPicker from "@/components/admin/MediaLibraryPicker";
import AiTextMenu from "@/components/admin/catalog/AiTextMenu";
import { cn } from "@/lib/utils";

/*
 * Textarea + friendly toolbar. Buttons insert the plain marks RichText
 * understands (see components/ui/RichText.tsx), so what is saved stays plain,
 * safe text — yet the site shows headings, colours, icons, links and images.
 */

const EMOJI = "✅ ✔️ ⭐ 🌟 🔥 ⚡ 💯 🎁 🎉 🆕 🏷️ 💰 💳 📦 🚚 🛵 ⏱️ 📅 📞 📱 💬 📧 📍 🏪 🔧 🛠️ 🖨️ 💻 🖥️ 📷 🔌 🔋 🎧 📶 🔒 🛡️ 👍 🙏 ❤️ 👉 ➡️ ⬇️ ❗ ⚠️ ℹ️ 📌 📝 📄 🗂️ 🇧🇩".split(" ");
const COLORS: { id: string; bn: string; dot: string }[] = [
  { id: "red", bn: "লাল", dot: "bg-red-500" },
  { id: "green", bn: "সবুজ", dot: "bg-emerald-500" },
  { id: "blue", bn: "নীল", dot: "bg-blue-500" },
  { id: "orange", bn: "কমলা", dot: "bg-orange-500" },
  { id: "purple", bn: "বেগুনি", dot: "bg-purple-500" },
  { id: "brand", bn: "ব্র্যান্ড", dot: "bg-brand-500" },
  { id: "gray", bn: "ধূসর", dot: "bg-gray-400" },
];

type Panel = "" | "heading" | "color" | "size" | "emoji" | "icon" | "link";

export default function RichTextEditor({ value, onChange, rows = 5, placeholder, dir, className, label }: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  dir?: "auto" | "ltr";
  className?: string;
  /** Accessible name for the text box. */
  label?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [panel, setPanel] = useState<Panel>("");
  const [preview, setPreview] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [link, setLink] = useState({ text: "", url: "" });

  /** Replace the selection with `make(selected)`; keeps the cursor sensible. */
  const edit = (make: (sel: string) => string, selectInner = false) => {
    const el = ref.current;
    const v = value ?? "";
    const s = el ? el.selectionStart : v.length;
    const e = el ? el.selectionEnd : v.length;
    const sel = v.slice(s, e);
    const out = make(sel);
    const next = v.slice(0, s) + out + v.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      if (selectInner && sel) {
        const at = s + out.indexOf(sel);
        el.setSelectionRange(at, at + sel.length);
      } else el.setSelectionRange(s + out.length, s + out.length);
    });
    setPanel("");
  };
  const wrap = (open: string, close: string, hint: string) => edit((sel) => `${open}${sel || hint}${close}`, true);
  /** Prefix every selected line (or the current line) with `mark`. */
  const prefixLines = (mark: (i: number) => string) => {
    const el = ref.current;
    const v = value ?? "";
    let s = el ? el.selectionStart : v.length;
    const e = el ? el.selectionEnd : v.length;
    s = v.lastIndexOf("\n", s - 1) + 1;
    const block = v.slice(s, e) || "";
    const lines = (block || "").split("\n");
    const out = lines.map((l, i) => `${mark(i)}${l.replace(/^\s*(#{1,3}\s+|[•\-*✓✔]\s+|[0-9০-৯]+[.)]\s+|>\s?)/, "")}`).join("\n");
    onChange(v.slice(0, s) + out + v.slice(Math.max(e, s)));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(s + out.length, s + out.length); });
    setPanel("");
  };
  const insertBlock = (text: string) => edit((sel) => `${sel ? `${sel}\n` : ""}\n${text}\n`);
  const bnNum = (i: number) => String(i + 1).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

  const btn = "flex items-center justify-center min-h-10 min-w-10 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10";
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? "" : p));

  return (
    <div className={cn("rounded-xl border border-[var(--line)] bg-white dark:bg-white/5 overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-0.5 px-1 py-1 border-b border-[var(--line)] bg-gray-50/80 dark:bg-white/5" role="toolbar" aria-label="লেখার ফরম্যাট">
        <button type="button" className={btn} title="শিরোনাম" onClick={() => toggle("heading")}><Heading className="w-4 h-4" /></button>
        <button type="button" className={btn} title="বোল্ড" onClick={() => wrap("**", "**", "মোটা লেখা")}><Bold className="w-4 h-4" /></button>
        <button type="button" className={btn} title="ইটালিক" onClick={() => wrap("_", "_", "বাঁকা লেখা")}><Italic className="w-4 h-4" /></button>
        <button type="button" className={btn} title="হাইলাইট" onClick={() => wrap("==", "==", "গুরুত্বপূর্ণ")}><Highlighter className="w-4 h-4" /></button>
        <button type="button" className={btn} title="রঙ" onClick={() => toggle("color")}><Palette className="w-4 h-4" /></button>
        <button type="button" className={btn} title="লেখার সাইজ" onClick={() => toggle("size")}><Type className="w-4 h-4" /></button>
        <span className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-0.5" aria-hidden />
        <button type="button" className={btn} title="বুলেট তালিকা" onClick={() => prefixLines(() => "• ")}><List className="w-4 h-4" /></button>
        <button type="button" className={btn} title="নম্বর তালিকা" onClick={() => prefixLines((i) => `${bnNum(i)}. `)}><ListOrdered className="w-4 h-4" /></button>
        <button type="button" className={btn} title="নোট বক্স" onClick={() => prefixLines(() => "> ")}><Quote className="w-4 h-4" /></button>
        <button type="button" className={btn} title="মাঝখানে" onClick={() => prefixLines(() => "{center}")}><AlignCenter className="w-4 h-4" /></button>
        <button type="button" className={btn} title="ভাগ করার লাইন" onClick={() => insertBlock("---")}><Minus className="w-4 h-4" /></button>
        <span className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-0.5" aria-hidden />
        <button type="button" className={btn} title="লিংক" onClick={() => { setLink({ text: ref.current ? (value ?? "").slice(ref.current.selectionStart, ref.current.selectionEnd) : "", url: "" }); toggle("link"); }}><Link2 className="w-4 h-4" /></button>
        <button type="button" className={btn} title="ছবি" onClick={() => setMediaOpen(true)}><ImageIcon className="w-4 h-4" /></button>
        <button type="button" className={btn} title="ইমোজি" onClick={() => toggle("emoji")}><Smile className="w-4 h-4" /></button>
        <button type="button" className={btn} title="আইকন" onClick={() => toggle("icon")}><Sparkles className="w-4 h-4" /></button>
        <AiTextMenu text={value ?? ""} onApply={onChange} context={label} className="ml-auto" />
        <button type="button" className={cn(btn, "gap-1 px-2 text-xs font-medium", preview && "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200")}
          onClick={() => setPreview((p) => !p)}>
          {preview ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {preview ? "লিখুন" : "প্রিভিউ"}
        </button>
      </div>

      {panel === "heading" && (
        <div className="flex flex-wrap gap-1.5 p-2 border-b border-[var(--line)]">
          <button type="button" className="btn btn-outline btn-sm min-h-10 text-base font-bold" onClick={() => prefixLines(() => "# ")}>বড় শিরোনাম</button>
          <button type="button" className="btn btn-outline btn-sm min-h-10 font-bold" onClick={() => prefixLines(() => "## ")}>মাঝারি শিরোনাম</button>
          <button type="button" className="btn btn-outline btn-sm min-h-10 font-semibold" onClick={() => prefixLines(() => "### ")}>ছোট শিরোনাম</button>
        </div>
      )}
      {panel === "color" && (
        <div className="flex flex-wrap gap-1.5 p-2 border-b border-[var(--line)]">
          {COLORS.map((c) => (
            <button key={c.id} type="button" className="btn btn-outline btn-sm min-h-10 gap-1.5" onClick={() => wrap(`{${c.id}}`, `{/${c.id}}`, "রঙিন লেখা")}>
              <span className={cn("w-3.5 h-3.5 rounded-full", c.dot)} aria-hidden /> {c.bn}
            </button>
          ))}
        </div>
      )}
      {panel === "size" && (
        <div className="flex flex-wrap gap-1.5 p-2 border-b border-[var(--line)]">
          <button type="button" className="btn btn-outline btn-sm min-h-10 text-lg font-semibold" onClick={() => wrap("{big}", "{/big}", "বড় লেখা")}>বড় লেখা</button>
          <button type="button" className="btn btn-outline btn-sm min-h-10 text-xs" onClick={() => wrap("{small}", "{/small}", "ছোট লেখা")}>ছোট লেখা</button>
        </div>
      )}
      {panel === "emoji" && (
        <div className="grid grid-cols-8 sm:grid-cols-12 gap-0.5 p-2 border-b border-[var(--line)] max-h-40 overflow-y-auto">
          {EMOJI.map((e) => (
            <button key={e} type="button" className="min-h-10 rounded-lg text-xl hover:bg-gray-100 dark:hover:bg-white/10" onClick={() => edit((sel) => `${sel}${e} `)}>{e}</button>
          ))}
        </div>
      )}
      {panel === "icon" && (
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-0.5 p-2 border-b border-[var(--line)] max-h-40 overflow-y-auto">
          {Object.entries(ICONS).map(([name, Icon]) => (
            <button key={name} type="button" title={name} className="min-h-10 flex items-center justify-center rounded-lg text-brand-600 hover:bg-gray-100 dark:hover:bg-white/10"
              onClick={() => edit((sel) => `${sel}:${name}: `)}>
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      )}
      {panel === "link" && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2 p-2 border-b border-[var(--line)]">
          <input className="input text-sm" placeholder="যে লেখায় চাপ দেবে (যেমন: বিস্তারিত দেখুন)" value={link.text} onChange={(e) => setLink((l) => ({ ...l, text: e.target.value }))} />
          <input className="input text-sm" placeholder="https://… বা /products/…" value={link.url} onChange={(e) => setLink((l) => ({ ...l, url: e.target.value }))} inputMode="url" />
          <button type="button" className="btn btn-brand btn-sm min-h-10" disabled={!/^(https?:\/\/|\/|www\.)/i.test(link.url.trim())}
            onClick={() => {
              const url = link.url.trim().startsWith("www.") ? `https://${link.url.trim()}` : link.url.trim();
              edit(() => (link.text.trim() ? `[${link.text.trim()}](${url})` : url));
            }}>যোগ করুন</button>
        </div>
      )}

      {preview ? (
        <div className="p-3 min-h-[6rem]">
          {value?.trim() ? <RichText text={value} /> : <p className="text-sm text-muted">এখনো কিছু লেখা হয়নি।</p>}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          dir={dir}
          aria-label={label}
          className="block w-full resize-y border-0 bg-transparent px-3 py-2.5 text-sm leading-6 focus:outline-none focus:ring-0"
        />
      )}
      <MediaLibraryPicker open={mediaOpen} accept="image" onClose={() => setMediaOpen(false)}
        onSelect={(url) => { setMediaOpen(false); edit((sel) => `${sel ? `${sel}\n` : ""}\n![${sel ? "" : "ছবি"}](${url})\n`); }} />
    </div>
  );
}
