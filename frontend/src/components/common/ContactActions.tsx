"use client";

import { MessageCircle, Phone } from "lucide-react";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

interface ContactActionsProps {
  /** Prefilled WhatsApp message. */
  message?: string;
  className?: string;
  size?: "sm" | "md";
  /** Show the number text next to the label (e.g. on a contact card). */
  showNumbers?: boolean;
  /** `outline` reads well on light cards, `brand` on tinted bands. */
  variant?: "brand" | "outline";
}

/**
 * Call + WhatsApp buttons driven entirely by admin settings. A button whose
 * number is not configured is simply not rendered.
 */
export default function ContactActions({ message, className, size = "sm", showNumbers = false, variant = "brand" }: ContactActionsProps) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const c = useContactInfo();
  if (!c.hasPhone && !c.hasWhatsapp) return null;
  const btn = cn("btn justify-center gap-2", size === "sm" ? "btn-sm" : "btn-md", variant === "brand" ? "btn-brand" : "btn-outline");
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {c.hasWhatsapp && (
        <a href={c.whatsappHref(message)} target="_blank" rel="noopener noreferrer" className={btn}>
          <MessageCircle className="w-4 h-4" aria-hidden />
          <span>WhatsApp{showNumbers && c.whatsappDisplay ? ` · ${c.whatsappDisplay}` : ""}</span>
        </a>
      )}
      {c.hasPhone && (
        <a href={c.telHref} className={cn(btn, variant === "brand" && "btn-outline")}>
          <Phone className="w-4 h-4" aria-hidden />
          <span>{bn ? "কল করুন" : "Call"}{showNumbers && c.phoneDisplay ? ` · ${c.phoneDisplay}` : ""}</span>
        </a>
      )}
    </div>
  );
}
