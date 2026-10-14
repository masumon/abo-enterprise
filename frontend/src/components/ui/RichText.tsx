import type { ReactNode } from "react";
import {
  AlertTriangle, Award, Banknote, Calendar, Camera, Check, CheckCircle, Clock, Download, FileText, Flame, Gift,
  Heart, Info, Mail, MapPin, MessageCircle, Phone, Printer, ShieldCheck, ShoppingCart, Sparkles, Star, Tag,
  ThumbsUp, Truck, User, Wifi, Wrench, Zap, type LucideIcon,
} from "lucide-react";
import { fixBoldMarks } from "@/lib/productText";

/*
 * Admin-typed text → readable, styled, clickable content. Plain text in,
 * React nodes out — never HTML, so nothing typed can inject a script.
 *
 * Blocks (one per line):            Inline:
 *   # Big heading / ## / ###          **bold**  _italic_  ==highlight==
 *   • - * ✓  item  → bullet list      {red}…{/red} green blue orange purple brand gray
 *   1. / ১.  item  → numbered list    {big}…{/big}  {small}…{/small}
 *   > text         → note box         :phone: :check: … (icons, see ICONS)
 *   ---            → divider          [label](https://…)  ![alt](https://…/x.jpg)
 *   {center}text   → centred line     https://… / www.… (image URLs show the image)
 * Emoji are plain text and just work. The admin toolbar (RichTextEditor)
 * inserts all of these, so nobody has to remember the marks.
 */

export const ICONS: Record<string, LucideIcon> = {
  check: Check, phone: Phone, mail: Mail, clock: Clock, location: MapPin, star: Star, truck: Truck,
  shield: ShieldCheck, tag: Tag, gift: Gift, zap: Zap, heart: Heart, info: Info, alert: AlertTriangle,
  whatsapp: MessageCircle, wrench: Wrench, printer: Printer, camera: Camera, wifi: Wifi, cart: ShoppingCart,
  money: Banknote, calendar: Calendar, user: User, file: FileText, download: Download, award: Award,
  like: ThumbsUp, fire: Flame, sparkles: Sparkles,
};

const COLORS: Record<string, string> = {
  red: "text-red-600 dark:text-red-400",
  green: "text-emerald-600 dark:text-emerald-400",
  blue: "text-blue-600 dark:text-blue-400",
  orange: "text-orange-600 dark:text-orange-400",
  purple: "text-purple-600 dark:text-purple-400",
  brand: "text-brand-600 dark:text-brand-400",
  gray: "text-gray-500 dark:text-gray-400",
  big: "text-lg sm:text-xl font-semibold",
  small: "text-sm",
};

const INLINE = new RegExp(
  [
    String.raw`!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)`, // 1,2 image
    String.raw`\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/(?!\/)[^\s)]*)\)`, // 3,4 link
    String.raw`((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]'"।])`, // 5 bare url
    String.raw`\*\*(.+?)\*\*`, // 6 bold
    String.raw`==(.+?)==`, // 7 highlight
    String.raw`\{(red|green|blue|orange|purple|brand|gray|big|small)\}(.+?)\{\/\8\}`, // 8,9 colour/size
    String.raw`(?<![\p{L}\p{N}_])_(?!\s)(.+?)(?<!\s)_(?![\p{L}\p{N}_])`, // 10 italic
    String.raw`:([a-z]+):`, // 11 icon
  ].join("|"),
  "gu",
);

const IMAGE_URL = /\.(?:jpe?g|png|webp|gif|avif)(?:[?#].*)?$|\/image\/upload\//i;

function isInternal(href: string) {
  return href.startsWith("/") || /^https?:\/\/(www\.)?aboenterprise\.com(\/|$)/i.test(href);
}

function Anchor({ href, children }: { href: string; children: ReactNode }) {
  const internal = isInternal(href);
  return (
    <a
      href={href}
      {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer nofollow ugc" })}
      className="font-medium text-brand-600 dark:text-brand-400 underline underline-offset-2 decoration-brand-300 hover:text-brand-700 break-words"
    >
      {children}
    </a>
  );
}

function Img({ src, alt }: { src: string; alt: string }) {
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block my-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL of any host */}
      <img src={src} alt={alt} loading="lazy" decoding="async" className="max-w-full max-h-96 rounded-xl border border-gray-200 dark:border-white/10 object-contain bg-white" />
    </a>
  );
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(INLINE.source, INLINE.flags);
  let last = 0;
  let n = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const k = `${key}.${n++}`;
    let node: ReactNode = null;
    if (m[2]) node = <Img key={k} src={m[2]} alt={m[1]} />;
    else if (m[4]) node = <Anchor key={k} href={m[4]}>{inline(m[3], k)}</Anchor>;
    else if (m[5]) {
      const href = m[5].startsWith("www.") ? `https://${m[5]}` : m[5];
      node = IMAGE_URL.test(href) ? <Img key={k} src={href} alt="" /> : <Anchor key={k} href={href}>{m[5].replace(/^https?:\/\//, "")}</Anchor>;
    } else if (m[6]) node = <strong key={k} className="font-semibold text-gray-900 dark:text-white">{inline(m[6], k)}</strong>;
    else if (m[7]) node = <mark key={k} className="rounded px-1 bg-yellow-100 text-gray-900 dark:bg-yellow-500/25 dark:text-yellow-100">{inline(m[7], k)}</mark>;
    else if (m[8]) node = <span key={k} className={COLORS[m[8]]}>{inline(m[9], k)}</span>;
    else if (m[10]) node = <em key={k}>{inline(m[10], k)}</em>;
    else if (m[11]) {
      const Icon = ICONS[m[11]];
      if (!Icon) continue; // unknown :word: stays as typed
      node = <Icon key={k} className="inline-block w-[1.1em] h-[1.1em] -mt-0.5 mx-0.5 text-brand-600 dark:text-brand-400 align-middle" aria-hidden />;
    }
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(node);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** One line with formatting, links, images and icons. */
export function InlineText({ text }: { text?: string | null }) {
  if (!text) return null;
  return <>{inline(fixBoldMarks(text), "i")}</>;
}

type Block =
  | { t: "p"; text: string; center?: boolean }
  | { t: "h"; level: 1 | 2 | 3; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: { mark: string; text: string }[] }
  | { t: "note"; text: string }
  | { t: "hr" };

const BULLET = /^\s*[•\-*✓✔▪●◦]\s+/;
const NUMBER = /^\s*([0-9০-৯]+[.)])\s+/;

export function parseRich(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let center = false;
  const flush = () => {
    if (para.length) blocks.push({ t: "p", text: para.join("\n"), center });
    para = [];
    center = false;
  };
  const lastBlock = () => blocks[blocks.length - 1];
  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) { flush(); continue; }
    if (/^(-{3,}|_{3,}|—{2,})$/.test(line)) { flush(); blocks.push({ t: "hr" }); continue; }
    if ((m = line.match(/^(#{1,3})\s+(.+)$/))) { flush(); blocks.push({ t: "h", level: m[1].length as 1 | 2 | 3, text: m[2] }); continue; }
    if ((m = line.match(/^>\s?(.*)$/))) {
      flush();
      const prev = lastBlock();
      if (prev?.t === "note") prev.text += `\n${m[1]}`;
      else blocks.push({ t: "note", text: m[1] });
      continue;
    }
    if (BULLET.test(line)) {
      flush();
      const prev = lastBlock();
      const item = line.replace(BULLET, "");
      if (prev?.t === "ul") prev.items.push(item);
      else blocks.push({ t: "ul", items: [item] });
      continue;
    }
    if ((m = line.match(NUMBER))) {
      flush();
      const prev = lastBlock();
      const item = { mark: m[1], text: line.replace(NUMBER, "") };
      if (prev?.t === "ol") prev.items.push(item);
      else blocks.push({ t: "ol", items: [item] });
      continue;
    }
    if (line.startsWith("{center}")) { flush(); center = true; para.push(line.slice(8).trim()); continue; }
    para.push(line);
  }
  flush();
  return blocks;
}

const H_CLASS = {
  1: "text-xl sm:text-2xl font-bold text-heading pt-2",
  2: "text-lg sm:text-xl font-bold text-heading pt-1",
  3: "text-base sm:text-lg font-semibold text-heading",
};

/**
 * Admin-typed description → headings, paragraphs, lists, notes, bold,
 * colours, links, images and icons (see the table at the top of this file).
 */
export default function RichText({ text, className }: { text?: string | null; className?: string }) {
  const blocks = parseRich(fixBoldMarks(text ?? ""));
  if (!blocks.length) return null;
  return (
    <div className={className ?? "space-y-3 text-[15px] sm:text-base leading-7 text-gray-700 dark:text-gray-200"}>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.t) {
          case "h": {
            const Tag = (`h${b.level + 1}`) as "h2" | "h3" | "h4";
            return <Tag key={k} className={H_CLASS[b.level]}>{inline(b.text, k)}</Tag>;
          }
          case "hr":
            return <hr key={k} className="border-gray-200 dark:border-white/10" />;
          case "note":
            return (
              <div key={k} className="flex gap-2 rounded-xl border-l-4 border-brand-500 bg-brand-50 dark:bg-brand-500/10 px-3 py-2.5 whitespace-pre-line">
                <Info className="w-4 h-4 mt-1.5 flex-shrink-0 text-brand-600" aria-hidden />
                <div className="min-w-0">{inline(b.text, k)}</div>
              </div>
            );
          case "ul":
            return (
              <ul key={k} className="space-y-1.5 list-none pl-0">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2">
                    <CheckCircle className="w-4 h-4 mt-1.5 flex-shrink-0 text-brand-500" aria-hidden />
                    <span className="min-w-0">{inline(it, `${k}.${j}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={k} className="space-y-1.5 list-none pl-0">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="flex-shrink-0 min-w-[1.75rem] h-7 px-1 rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-sm font-bold flex items-center justify-center">
                      {it.mark.replace(/[.)]$/, "")}
                    </span>
                    <span className="min-w-0 pt-0.5">{inline(it.text, `${k}.${j}`)}</span>
                  </li>
                ))}
              </ol>
            );
          default:
            return <p key={k} className={b.center ? "whitespace-pre-line text-center" : "whitespace-pre-line"}>{inline(b.text, k)}</p>;
        }
      })}
    </div>
  );
}
