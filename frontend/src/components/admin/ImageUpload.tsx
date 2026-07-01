"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, X, ImageIcon, Video } from "lucide-react";
import { adminApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";

type AcceptType = "image" | "video" | "both";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  accept?: AcceptType;
  className?: string;
  previewSize?: "sm" | "md" | "lg";
  showUrlInput?: boolean;
  hint?: string;
}

const ACCEPT_MAP: Record<AcceptType, string> = {
  image: "image/*",
  video: "video/*",
  both: "image/*,video/*",
};

const SIZE_MAP = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
};

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url) || url.includes("/video/upload/");
}

export default function ImageUpload({
  value,
  onChange,
  label,
  folder = "abo-enterprise/uploads",
  accept = "image",
  className,
  previewSize = "md",
  showUrlInput = true,
  hint,
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateImageDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve(true);
      }
      const img = new window.Image();
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        if (width < 100 || height < 100) {
          setError("Image must be at least 100×100 pixels");
          resolve(false);
        } else if (width > 5000 || height > 5000) {
          setError("Image must not exceed 5000×5000 pixels");
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => resolve(true);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const valid = await validateImageDimensions(file);
      if (!valid) {
        setUploading(false);
        return;
      }
      const r = await adminApi.uploadMedia(file, folder);
      const url = r.data.data?.url ?? "";
      if (url) onChange(url);
    } catch (e) {
      setError(apiErrorMessage(e, "Upload failed. Check file size and format, or paste a URL."));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const isVideo = value ? isVideoUrl(value) : false;
  const sizeClass = SIZE_MAP[previewSize];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      <div className="flex items-start gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Click to upload"
          className={cn(
            "relative rounded-xl border-2 border-dashed border-gray-200 overflow-hidden",
            "hover:border-brand-400 hover:bg-brand-50/30 transition-colors group flex-shrink-0",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            sizeClass
          )}
        >
          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-white/80">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            </span>
          ) : value ? (
            isVideo ? (
              <span className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
                <Video className="w-6 h-6 mb-0.5" />
                <span className="text-[9px] font-medium">Video</span>
              </span>
            ) : (
              <Image
                src={value}
                alt="Preview"
                fill
                className="object-cover"
                sizes="128px"
              />
            )
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-brand-500">
              <Upload className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Upload</span>
            </span>
          )}
          {value && !uploading && (
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </span>
          )}
        </button>

        <div className="flex-1 min-w-[180px] space-y-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn btn-outline btn-sm flex items-center gap-2"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            {uploading ? "Uploading…" : value ? "Change file" : "Choose file"}
          </button>

          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}

          {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
      </div>

      {showUrlInput && (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Or paste image/video URL…"
          className="input w-full text-sm"
        />
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">{error}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_MAP[accept]}
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
