"use client";

import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  dark?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className, hover = false, dark = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl transition-all duration-300",
        dark ? "glass-dark text-white" : "glass bg-white/80",
        hover && "hover:-translate-y-1 hover:shadow-glass-strong cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
