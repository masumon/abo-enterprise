import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Software Development",
  "Web, mobile, AI and enterprise software development by ABO Enterprise.",
  "/services/software"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
