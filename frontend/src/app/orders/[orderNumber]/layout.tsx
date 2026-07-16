import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Order Details",
  "View your ABO Enterprise order details and invoice.",
  "/orders",
  { noindex: true }
);

export default function OrderDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
