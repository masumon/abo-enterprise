import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photo gallery of ABO Enterprise projects, office and work showcase.",
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
