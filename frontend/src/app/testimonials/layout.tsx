import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Testimonials",
  "Customer reviews and testimonials for ABO Enterprise.",
  "/testimonials"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
