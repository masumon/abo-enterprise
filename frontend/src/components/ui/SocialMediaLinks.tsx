import { Facebook, MessageCircle } from "lucide-react";

export const SOCIAL_PLATFORMS = [
  {
    code: "facebook",
    name: "Facebook",
    icon: Facebook,
    bgColor: "bg-blue-600 hover:bg-blue-700",
  },
  {
    code: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    bgColor: "bg-green-500 hover:bg-green-600",
  },
];

interface Props {
  facebookUrl?: string;
  whatsappNumber?: string;
  size?: "sm" | "md";
}

export function SocialMediaLinks({ facebookUrl, whatsappNumber, size = "sm" }: Props) {
  const sizeClass = size === "sm" ? "w-9 h-9" : "w-10 h-10";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex gap-2">
      {facebookUrl && (
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${sizeClass} ${SOCIAL_PLATFORMS[0].bgColor} rounded-lg flex items-center justify-center text-white transition-colors`}
          aria-label="Facebook"
        >
          <Facebook className={iconSize} />
        </a>
      )}
      {whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${sizeClass} ${SOCIAL_PLATFORMS[1].bgColor} rounded-lg flex items-center justify-center text-white transition-colors`}
          aria-label="WhatsApp"
        >
          <MessageCircle className={iconSize} />
        </a>
      )}
    </div>
  );
}
