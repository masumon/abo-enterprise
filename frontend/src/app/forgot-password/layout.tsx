import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Account Recovery",
  "Recover access to your ABO Enterprise customer account.",
  "/forgot-password",
  { noindex: true }
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
