import type { Metadata } from "next";
import TestimonialsClient from "./TestimonialsClient";

export const metadata: Metadata = {
  title: "Testimonials",
  description: "Customer reviews and testimonials for ABO Enterprise products and services.",
};

export default function TestimonialsPage() {
  return <TestimonialsClient />;
}
