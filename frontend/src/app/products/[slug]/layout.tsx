import type { Metadata } from "next";
import type { ReactNode } from "react";

interface Props {
  params: { slug: string };
  children: ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://abo-enterprise-api.onrender.com";
    const res = await fetch(`${apiUrl}/api/v1/products/${params.slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const { data } = await res.json();
    if (!data) return {};

    const name = data.name_en ?? data.name_bn ?? "Product";
    const description = data.description_en ?? data.description_bn ?? "";
    const image = data.image_url;

    return {
      title: name,
      description: description.slice(0, 160) || `Buy ${name} at ABO Enterprise`,
      openGraph: {
        title: name,
        description: description.slice(0, 160),
        images: image ? [{ url: image, alt: name }] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: name,
        description: description.slice(0, 160),
        images: image ? [image] : [],
      },
    };
  } catch {
    return {};
  }
}

export default function ProductDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
