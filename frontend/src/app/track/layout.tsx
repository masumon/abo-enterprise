import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Track Order",
  "Track your ABO Enterprise order status.",
  "/track"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
