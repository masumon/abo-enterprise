import { Facebook, Instagram, Twitter, Linkedin, Youtube, MessageCircle, type LucideIcon } from "lucide-react";
import TikTokIcon from "@/components/icons/TikTokIcon";

/** Platforms the admin can configure under Settings → Social Media Links
 * (plus WhatsApp). Rendered wherever a value is present — same source of
 * truth as the site footer, so adding a link in admin shows it everywhere. */
export const SOCIAL_PLATFORMS = [
  { code: "facebook", name: "Facebook", icon: Facebook, bgColor: "bg-blue-600 hover:bg-blue-700" },
  { code: "whatsapp", name: "WhatsApp", icon: MessageCircle, bgColor: "bg-green-500 hover:bg-green-600" },
  { code: "instagram", name: "Instagram", icon: Instagram, bgColor: "bg-pink-600 hover:bg-pink-700" },
  { code: "twitter", name: "Twitter", icon: Twitter, bgColor: "bg-sky-500 hover:bg-sky-600" },
  { code: "linkedin", name: "LinkedIn", icon: Linkedin, bgColor: "bg-blue-700 hover:bg-blue-800" },
  { code: "youtube", name: "YouTube", icon: Youtube, bgColor: "bg-red-600 hover:bg-red-700" },
  { code: "tiktok", name: "TikTok", icon: TikTokIcon, bgColor: "bg-neutral-900 hover:bg-black" },
];

interface Props {
  facebookUrl?: string;
  whatsappNumber?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  size?: "sm" | "md";
}

export function SocialMediaLinks({
  facebookUrl,
  whatsappNumber,
  instagramUrl,
  twitterUrl,
  linkedinUrl,
  youtubeUrl,
  tiktokUrl,
  size = "sm",
}: Props) {
  const sizeClass = size === "sm" ? "w-9 h-9" : "w-10 h-10";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const waDigits = (whatsappNumber || "").replace(/\D/g, "");

  const links: { href: string; icon: LucideIcon | typeof TikTokIcon; label: string; bg: string }[] = [
    { href: facebookUrl || "", icon: Facebook, label: "Facebook", bg: "bg-blue-600 hover:bg-blue-700" },
    { href: waDigits ? `https://wa.me/${waDigits}` : "", icon: MessageCircle, label: "WhatsApp", bg: "bg-green-500 hover:bg-green-600" },
    { href: instagramUrl || "", icon: Instagram, label: "Instagram", bg: "bg-pink-600 hover:bg-pink-700" },
    { href: twitterUrl || "", icon: Twitter, label: "Twitter", bg: "bg-sky-500 hover:bg-sky-600" },
    { href: linkedinUrl || "", icon: Linkedin, label: "LinkedIn", bg: "bg-blue-700 hover:bg-blue-800" },
    { href: youtubeUrl || "", icon: Youtube, label: "YouTube", bg: "bg-red-600 hover:bg-red-700" },
    { href: tiktokUrl || "", icon: TikTokIcon, label: "TikTok", bg: "bg-neutral-900 hover:bg-black" },
  ].filter((l) => l.href.trim());

  if (links.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {links.map(({ href, icon: Icon, label, bg }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${sizeClass} ${bg} rounded-lg flex items-center justify-center text-white transition-colors`}
          aria-label={label}
        >
          <Icon className={iconSize} />
        </a>
      ))}
    </div>
  );
}
