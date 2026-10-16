"use client";

import { useProfileStore } from "@/store/adminProfile";
import { cn } from "@/lib/utils";

/** The signed-in admin's photo, or the first letter of the name on a brand gradient. */
export default function AdminAvatar({ name, className }: { name: string; className?: string }) {
  const avatar = useProfileStore((s) => s.avatar);
  return avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatar} alt="" className={cn("rounded-full object-cover bg-brand-100", className)} />
  ) : (
    <span aria-hidden className={cn("rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold flex items-center justify-center", className)}>
      {name?.[0]?.toUpperCase() ?? "A"}
    </span>
  );
}
