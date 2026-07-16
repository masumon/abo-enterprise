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
  return <CustomerGuard>{children}</CustomerGuard>;
}
