"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center flex-wrap gap-1 text-xs sm:text-sm mb-4", className)}>
      <Link href="/" className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-300 transition-colors text-muted">
        <Home className="w-3.5 h-3.5" aria-hidden />
        <span className="sr-only sm:not-sr-only">Home</span>
      </Link>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" aria-hidden />
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} className="text-muted hover:text-brand-600 dark:hover:text-brand-300 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-heading font-medium" aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
