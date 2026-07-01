"use client";

import { useState } from "react";
import { Monitor, Smartphone, Share2 } from "lucide-react";
import Image from "next/image";
import { optimizeCloudinaryUrl, generateOGImage } from "@/lib/cloudinaryOptimization";
import { cn } from "@/lib/utils";

interface ImagePreviewPanelProps {
  imageUrl: string;
  title?: string;
  description?: string;
  className?: string;
}

type ViewType = "desktop" | "mobile" | "og-square" | "og-landscape";

const VIEWS: { type: ViewType; label: string; icon: React.ReactNode; width: number; height: number }[] = [
  { type: "desktop", label: "Desktop", icon: <Monitor className="w-4 h-4" />, width: 1200, height: 630 },
  { type: "mobile", label: "Mobile", icon: <Smartphone className="w-4 h-4" />, width: 390, height: 844 },
  { type: "og-square", label: "OG Square", icon: <Share2 className="w-4 h-4" />, width: 800, height: 800 },
  { type: "og-landscape", label: "OG Landscape", icon: <Share2 className="w-4 h-4" />, width: 1200, height: 630 },
];

export default function ImagePreviewPanel({
  imageUrl,
  title = "Preview",
  description,
  className,
}: ImagePreviewPanelProps) {
  const [activeView, setActiveView] = useState<ViewType>("desktop");

  if (!imageUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg",
          "text-gray-500 text-sm p-8",
          className
        )}
      >
        No image to preview
      </div>
    );
  }

  const view = VIEWS.find((v) => v.type === activeView)!;
  let previewUrl = imageUrl;

  if (activeView === "desktop") {
    previewUrl = optimizeCloudinaryUrl(imageUrl, {
      width: view.width,
      height: view.height,
      quality: "high",
    });
  } else if (activeView === "mobile") {
    previewUrl = optimizeCloudinaryUrl(imageUrl, {
      width: view.width,
      height: view.height,
      quality: "high",
    });
  } else if (activeView === "og-square") {
    previewUrl = generateOGImage(imageUrl, "square");
  } else if (activeView === "og-landscape") {
    previewUrl = generateOGImage(imageUrl, "landscape");
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-600">{description}</p>}
      </div>

      {/* View Selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {VIEWS.map((view) => (
          <button
            key={view.type}
            onClick={() => setActiveView(view.type)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-medium transition-all",
              activeView === view.type
                ? "bg-white text-brand-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {view.icon}
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        ))}
      </div>

      {/* Preview Container */}
      <div className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto">
        <div
          style={{
            width: activeView === "mobile" ? "auto" : "100%",
            maxWidth: activeView === "mobile" ? view.width : "100%",
          }}
          className="relative bg-white rounded-lg shadow-md overflow-hidden"
        >
          <div
            style={{
              aspectRatio: `${view.width} / ${view.height}`,
              position: "relative",
            }}
          >
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
              sizes={`${view.width}px`}
            />
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
        <p>
          <span className="font-medium text-gray-900">Dimensions:</span> {view.width}×
          {view.height}px
        </p>
        {activeView.startsWith("og") && (
          <p>
            <span className="font-medium text-gray-900">Use for:</span> Social media
            preview
          </p>
        )}
        {activeView === "mobile" && (
          <p>
            <span className="font-medium text-gray-900">Use for:</span> Mobile devices
            (iOS & Android)
          </p>
        )}
        {activeView === "desktop" && (
          <p>
            <span className="font-medium text-gray-900">Use for:</span> Web browsers
            (1200px+)
          </p>
        )}
      </div>
    </div>
  );
}
