import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";

export const metadata: Metadata = pageMeta(
  "Printing Services",
  "Professional printing — business cards, banners, brochures and more in Sylhet.",
  "/services/printing"
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
