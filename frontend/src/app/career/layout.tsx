import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join the ABO Enterprise team. Open positions, benefits and culture.",
};

export default function CareerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
