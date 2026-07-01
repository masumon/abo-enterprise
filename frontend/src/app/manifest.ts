import type { MetadataRoute } from "next";
import { fetchPublicSettings, settingValue } from "@/lib/serverSettings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await fetchPublicSettings();
  const icon =
    settingValue(settings, "app_icon_url") ||
    settingValue(settings, "logo_url") ||
    "/icons/icon-192.png";

  const icons: MetadataRoute.Manifest["icons"] = [
    { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
  ];

  return {
    name: "ABO Enterprise",
    short_name: "ABO",
    description: "এবিও এন্টারপ্রাইজ : সহজ সমাধান — মোবাইল এক্সেসরিজ, প্রিন্টিং, আইনি সেবা, সফটওয়্যার",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#1e5ba8",
    background_color: "#1e5ba8",
    categories: ["business", "productivity", "shopping"],
    lang: "bn",
    dir: "ltr",
    icons,
    shortcuts: [
      { name: "পণ্য দেখুন", short_name: "Products", url: "/products", icons: [{ src: icon, sizes: "192x192" }] },
      { name: "সেবা বুক করুন", short_name: "Services", url: "/services", icons: [{ src: icon, sizes: "192x192" }] },
      { name: "অর্ডার ট্র্যাক করুন", short_name: "Track", url: "/track", icons: [{ src: icon, sizes: "192x192" }] },
    ],
  };
}
