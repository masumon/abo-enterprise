import type { Metadata } from "next";
import FaqClient from "./FaqClient";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about ABO Enterprise products, services, software, payments and delivery.",
};

export default function FaqPage() {
  return <FaqClient />;
}
