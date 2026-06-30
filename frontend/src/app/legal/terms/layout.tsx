import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Terms of Service",
  "Terms and conditions for using ABO Enterprise products and services.",
  "/legal/terms"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
