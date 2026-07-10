"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, X, ImageIcon, Video, Check, Sparkles } from "lucide-react";
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
  /** Recommended size/format line, e.g. "512×512px · PNG (transparent)" */
  guide?: string;
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

interface PendingFile {
  file: File;
  previewUrl: string;
  width: number | null;
  height: number | null;
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url) || url.includes("/video/upload/");
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
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
  guide,
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingFile | null>(null);

  // Never leak object URLs when the pending file changes or unmounts.
  useEffect(() => {
    return () => {
      if (pending) URL.revokeObjectURL(pending.previewUrl);
    };
  }, [pending]);

  const readImageDimensions = (file: File, url: string): Promise<{ width: number | null; height: number | null }> =>
    new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve({ width: null, height: null });
        return;
      }
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: null, height: null });
      img.src = url;
    });

  /** Step 1 — the chosen file becomes a local preview, nothing uploads yet. */
  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const isVideoFile = file.type.startsWith("video/");
    const maxSize = isVideoFile ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(isVideoFile ? "Video must be under 50MB" : "Image must be under 5MB");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const { width, height } = await readImageDimensions(file, previewUrl);
    if (width !== null && height !== null) {
      if (width < 100 || height < 100) {
        setError("Image must be at least 100×100 pixels");
        URL.revokeObjectURL(previewUrl);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      if (width > 5000 || height > 5000) {
        setError("Image must not exceed 5000×5000 pixels");
        URL.revokeObjectURL(previewUrl);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    }
    setPending({ file, previewUrl, width, height });
  };

  /** Step 2 — explicit confirm; the server auto-optimizes (quality + format). */
  const confirmUpload = async () => {
    if (!pending) return;
    setUploading(true);
    setError(null);
    try {
      const r = await adminApi.uploadMedia(pending.file, folder);
      const url = r.data.data?.url ?? "";
      if (url) onChange(url);
      setPending(null);
    } catch (e) {
      setError(apiErrorMessage(e, "Upload failed. Check file size and format, or paste a URL."));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const cancelPending = () => {
    setPending(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isVideo = value ? isVideoUrl(value) : false;
  const sizeClass = SIZE_MAP[previewSize];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      {pending ? (
        /* ── Preview-before-upload confirmation ── */
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3">
          <div className="flex items-start gap-3 flex-wrap">
            <div className={cn("relative rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0", sizeClass)}>
              {pending.file.type.startsWith("video/") ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
                  <Video className="w-6 h-6 mb-0.5" />
                  <span className="text-[9px] font-medium">Video</span>
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={pending.previewUrl} alt="Upload preview" className="absolute inset-0 w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-[160px]">
              <p className="text-sm font-medium text-gray-800 truncate" title={pending.file.name}>{pending.file.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {pending.width && pending.height ? `${pending.width}×${pending.height}px · ` : ""}
                {fmtBytes(pending.file.size)}
              </p>
              <p className="text-[11px] text-brand-600 mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> আপলোডে অটো-অপ্টিমাইজ হবে (quality + format)
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={confirmUpload}
                  disabled={uploading}
                  className="btn btn-brand btn-sm flex items-center gap-1.5"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {uploading ? "Uploading…" : "Upload / আপলোড করুন"}
                </button>
                <button
                  type="button"
                  onClick={cancelPending}
                  disabled={uploading}
                  className="btn btn-outline btn-sm flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Click to choose a file"
            className={cn(
              "relative rounded-xl border-2 border-dashed border-gray-200 overflow-hidden",
              "hover:border-brand-400 hover:bg-brand-50/30 transition-colors group flex-shrink-0",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              sizeClass
            )}
          >
            {value ? (
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
            {value && (
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
              <ImageIcon className="w-4 h-4" />
              {value ? "Change file" : "Choose file"}
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

            {guide && (
              <p className="text-xs text-gray-500">
                📐 <span className="font-medium">Recommended:</span> {guide}
              </p>
            )}
            {hint && <p className="text-xs text-gray-400">{hint}</p>}
          </div>
        </div>
      )}

      {showUrlInput && !pending && (
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
        onChange={handleSelect}
      />
    </div>
  );
}
