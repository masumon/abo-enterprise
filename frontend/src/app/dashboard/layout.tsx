import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Customer Dashboard",
  "Manage your ABO Enterprise account, orders, wishlist and settings.",
  "/dashboard"
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
