import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description: "ABO Enterprise shipping coverage, delivery charges and timeline across Bangladesh.",
};

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
