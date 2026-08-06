import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";
import CustomerGuard from "@/components/layout/CustomerGuard";

export const metadata: Metadata = pageMeta(
  "My Profile",
  "ABO Enterprise customer portal — orders, wishlist, invoices and account settings.",
  "/profile",
  { noindex: true }
);

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerGuard>
      {/* A faint brand tint marks the account area as its own place, distinct
          from the storefront pages either side of it. */}
      <div className="min-h-screen bg-gradient-to-b from-brand-50/60 via-transparent to-transparent dark:from-brand-500/[0.04]">
        {children}
      </div>
    </CustomerGuard>
  );
}
