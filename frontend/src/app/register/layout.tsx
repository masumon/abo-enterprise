import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Register",
  "Create your ABO Enterprise customer account.",
  "/register"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
