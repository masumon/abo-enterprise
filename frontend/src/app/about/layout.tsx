import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "About Us",
  "Bangladesh technology company — products, printing, legal and software services.",
  "/about"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
