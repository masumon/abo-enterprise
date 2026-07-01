"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, X, CheckCircle, AlertCircle } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { cn } from "@/lib/utils";

interface BatchUploadProps {
  folder?: string;
  onComplete?: (urls: string[]) => void;
  maxFiles?: number;
  className?: string;
}

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  url?: string;
  error?: string;
}

export default function BatchImageUpload({
  folder = "abo-enterprise/uploads",
  onComplete,
  maxFiles = 50,
  className,
}: BatchUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToastStore((s) => s.push);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > maxFiles) {
      toast("error", `Max ${maxFiles} files allowed`);
      return;
    }
    setFiles((prev) => [...prev, ...selected.map((f) => ({ file: f, status: "pending" as const }))]);
  };

  const handleUpload = async () => {
    setUploading(true);
    const uploadPromises = files
      .filter((f) => f.status === "pending")
      .map(async (item, idx) => {
        const index = files.findIndex((x) => x.file === item.file);
        setFiles((prev) => {
          const next = [...prev];
          next[index].status = "uploading";
          return next;
        });

        try {
          const res = await adminApi.uploadImage(item.file, folder);
          setFiles((prev) => {
            const next = [...prev];
            next[index].status = "done";
            next[index].url = res.data.data.url;
            return next;
          });
        } catch (err) {
          setFiles((prev) => {
            const next = [...prev];
            next[index].status = "error";
            next[index].error = "Upload failed";
            return next;
          });
        }
      });

    await Promise.all(uploadPromises);
    setUploading(false);

    const urls = files.filter((f) => f.url).map((f) => f.url!);
    if (urls.length > 0) {
      toast("success", `${urls.length} files uploaded`);
      onComplete?.(urls);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-400 transition-colors">
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-900">Drag files here or click to select</p>
        <p className="text-xs text-gray-500 mt-1">Max {maxFiles} files, images only</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700"
        >
          Select Files
        </button>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-900">{files.length} files selected</p>
            <div className="space-x-2">
              <button
                onClick={() => setFiles([])}
                disabled={uploading}
                className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || files.every((f) => f.status !== "pending")}
                className="text-xs px-3 py-1 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1"
              >
                {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
                Upload All
              </button>
            </div>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {files.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <span className="truncate text-gray-700">{item.file.name}</span>
                <div className="flex items-center gap-2">
                  {item.status === "uploading" && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                  {item.status === "done" && <CheckCircle className="w-3 h-3 text-green-600" />}
                  {item.status === "error" && <AlertCircle className="w-3 h-3 text-red-600" />}
                  <button
                    onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                    disabled={item.status === "uploading"}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
