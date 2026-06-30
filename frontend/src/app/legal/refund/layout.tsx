import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Refund Policy",
  "ABO Enterprise refund and return policy for products and services.",
  "/legal/refund"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
