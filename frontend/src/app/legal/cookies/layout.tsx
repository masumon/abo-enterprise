import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Cookies Policy",
  "ABO Enterprise cookies policy — what cookies we use and how to control them.",
  "/legal/cookies"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
