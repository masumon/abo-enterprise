import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Enterprise Solutions",
  "Custom ERP, POS, CRM and software projects by ABO Enterprise.",
  "/projects"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
