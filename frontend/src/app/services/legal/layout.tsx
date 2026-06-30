import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Legal Assistance",
  "GD filing, FIR applications, legal documents and government assistance in Bangladesh.",
  "/services/legal"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
