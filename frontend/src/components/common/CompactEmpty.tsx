"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import ContactActions from "@/components/common/ContactActions";
import { cn } from "@/lib/utils";

interface CompactEmptyProps {
  icon: LucideIcon;
  /** One friendly line. */
  text: string;
  /** Prefilled WhatsApp message; WhatsApp/Call buttons come from admin settings. */
  whatsappMessage?: string;
  /** Optional secondary link (e.g. contact page). */
  linkLabel?: string;
  linkHref?: string;
  className?: string;
  /** Show the admin-configured WhatsApp/Call buttons (default true). */
  showContact?: boolean;
}

/**
 * Small, friendly empty state — icon + one line + a useful next step — so an
 * empty list never leaves a large blank area on the page.
 */
export default function CompactEmpty({ icon: Icon, text, whatsappMessage, linkLabel, linkHref, className, showContact = true }: CompactEmptyProps) {
  return (
    <div className={cn("enterprise-card px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 max-w-2xl mx-auto", className)}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-none">
          <Icon className="w-5 h-5 text-brand-500" aria-hidden />
        </span>
        <p className="text-sm text-heading font-medium leading-snug">{text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {showContact && <ContactActions message={whatsappMessage} variant="brand" />}
        {linkLabel && linkHref && (
          <Link href={linkHref} className="btn btn-outline btn-sm">
            {linkLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
