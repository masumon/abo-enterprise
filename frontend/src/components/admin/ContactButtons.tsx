import { MessageCircle, Phone, Mail } from "lucide-react";

/** Bangladeshi number → international digits for wa.me (01XXXXXXXXX → 8801XXXXXXXXX). */
export function waNumber(phone?: string | null): string {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("880")) return d;
  if (d.startsWith("0")) return `88${d}`;
  if (d.startsWith("1") && d.length === 10) return `880${d}`;
  return d;
}

/** One-tap Call / WhatsApp / E-mail buttons (44px tap targets). */
export default function ContactButtons({ phone, email, className = "" }: { phone?: string | null; email?: string | null; className?: string }) {
  const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 min-h-11 text-xs font-semibold";
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {phone && (
        <>
          <a href={`tel:${phone}`} className={`${btn} border-brand-200 text-brand-700 bg-brand-50 dark:bg-brand-500/15 dark:text-brand-200`}><Phone className="w-4 h-4" /> কল</a>
          <a href={`https://wa.me/${waNumber(phone)}`} target="_blank" rel="noopener noreferrer" className={`${btn} border-green-200 text-green-700 bg-green-50 dark:bg-green-500/15 dark:text-green-200`}><MessageCircle className="w-4 h-4" /> WhatsApp</a>
        </>
      )}
      {email && <a href={`mailto:${email}`} className={`${btn} border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200`}><Mail className="w-4 h-4" /> ইমেইল</a>}
    </div>
  );
}
