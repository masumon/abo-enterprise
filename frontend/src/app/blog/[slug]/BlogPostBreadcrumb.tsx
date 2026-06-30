"use client";

import Link from "next/link";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useLanguageStore } from "@/store/language";

interface Props {
  category?: string | null;
  title: string;
}

export default function BlogPostBreadcrumb({ category, title }: Props) {
  const { lang } = useLanguageStore();

  return (
    <Breadcrumb
      items={[
        { label: lang === "bn" ? "হোম" : "Home", href: "/" },
        { label: "Blog", href: "/blog" },
        ...(category ? [{ label: category }] : []),
        { label: title },
      ]}
      className="mb-6"
    />
  );
}
