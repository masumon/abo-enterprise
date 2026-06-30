import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Payment Callback",
  "Payment confirmation for your ABO Enterprise order.",
  "/payment/callback"
);

export default function PaymentCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
