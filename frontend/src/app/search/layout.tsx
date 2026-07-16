import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Search",
  "Search ABO Enterprise products, services and solutions.",
  "/search",
  { noindex: true }
);

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
