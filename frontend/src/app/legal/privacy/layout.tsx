import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Privacy Policy",
  "ABO Enterprise privacy policy — how we collect, use and protect your data.",
  "/legal/privacy"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
