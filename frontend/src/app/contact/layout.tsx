import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Contact Us",
  "Reach ABO Enterprise in Sylhet for products, services and support.",
  "/contact"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
